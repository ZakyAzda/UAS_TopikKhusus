import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { orderAPI } from '@/services/api';
import api from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/components/ProductCard';
import MidtransWebView from '@/components/payment/MidtransWebView';
import PendingPaymentModal from '@/components/payment/PendingPaymentModal';
import { PendingModalType } from '@/components/payment/PendingPaymentModal';

type OrderItem = { ID: number; product: { name: string }; quantity: number; price: number };
type Order = {
  ID: number; CreatedAt: string; status: string;
  total_amount: number; payment_method: string; order_items: OrderItem[];
  snap_token?: string;
};

type PaymentResult = {
  status: 'success' | 'pending' | 'error' | 'close';
  result?: any;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  BELUM_BAYAR: { label: 'Belum Bayar', color: '#D97706', bg: '#FEF3C7', icon: 'schedule' },
  PENGIRIMAN:  { label: 'Dikirim',     color: '#2563EB', bg: '#DBEAFE', icon: 'local-shipping' },
  SELESAI:     { label: 'Selesai',     color: '#059669', bg: '#D1FAE5', icon: 'check-circle' },
  DIBATALKAN:  { label: 'Dibatalkan',  color: '#DC2626', bg: '#FEE2E2', icon: 'cancel' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Midtrans state
  const [showMidtrans, setShowMidtrans] = useState(false);
  const [snapToken, setSnapToken] = useState('');
  const [loadingPayment, setLoadingPayment] = useState<number | null>(null);
  const [currentPayingOrderId, setCurrentPayingOrderId] = useState<number | null>(null);

  // ✅ FIX: Gunakan ref untuk track status pembayaran
  // Midtrans Snap SELALU fire onClose setelah onSuccess/onPending/onError
  const paymentStatusRef = useRef<'idle' | 'success' | 'pending' | 'error'>('idle');

  // Pending/Error/Close modal state
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalType, setPendingModalType] = useState<PendingModalType>('close');
  const [pendingErrorMessage, setPendingErrorMessage] = useState('');

  const fetchOrders = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    try {
      const res = await orderAPI.getMyOrders();
      const sorted = (res.data?.data ?? []).sort((a: Order, b: Order) =>
        new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()
      );
      setOrders(sorted);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  // ── Tombol "Bayar Sekarang" ────────────────────────────────────────────────
  const handlePay = async (order: Order) => {
    setCurrentPayingOrderId(order.ID);
    // ✅ Reset ref setiap kali mulai sesi pembayaran baru
    paymentStatusRef.current = 'idle';
    setLoadingPayment(order.ID);
    try {
      const res = await api.post('/api/payment/snap-token', { order_id: order.ID });
      const token: string = res.data.snap_token;
      if (!token) throw new Error('Snap token kosong');

      setSnapToken(token);
      setShowMidtrans(true);
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error ?? 'Gagal memuat halaman pembayaran. Coba lagi.');
      setCurrentPayingOrderId(null);
    } finally {
      setLoadingPayment(null);
    }
  };

  // ── Handle hasil Midtrans WebView ─────────────────────────────────────────
  // ✅ FIX UTAMA: Midtrans Snap SELALU trigger onClose setelah onSuccess/onPending/onError
  const handleMidtransResult = (result: PaymentResult) => {
    // ✅ Selalu tutup WebView dulu
    setShowMidtrans(false);

    switch (result.status) {
      case 'success':
        // ✅ Set ref ke 'success' SEBELUM state update
        paymentStatusRef.current = 'success';

        if (currentPayingOrderId) {
          api.post('/api/payment/update-status', {
            order_id: currentPayingOrderId,
            status: 'PENGIRIMAN',
          })
            .then(() => fetchOrders())
            .catch(e => {
              console.warn('Gagal update status:', e);
              fetchOrders();
            });
        }
        Alert.alert(
          '✅ Pembayaran Berhasil!',
          'Pesananmu sedang diproses dan akan segera dikirim.',
        );
        setCurrentPayingOrderId(null);
        break;

      case 'pending':
        // ✅ Set ref ke 'pending' SEBELUM state update
        paymentStatusRef.current = 'pending';

        setPendingModalType('pending');
        setPendingErrorMessage('');
        setShowPendingModal(true);
        break;

      case 'error':
        // ✅ Set ref ke 'error' SEBELUM state update
        paymentStatusRef.current = 'error';

        setPendingModalType('error');
        setPendingErrorMessage(result.result?.status_message ?? '');
        setShowPendingModal(true);
        break;

      case 'close':
        // ✅ FIX: Jika sudah ada status final, abaikan event close
        // Karena Midtrans selalu fire onClose setelah event lain
        if (paymentStatusRef.current !== 'idle') {
          console.log('[Orders] Ignoring close event, payment already processed:', paymentStatusRef.current);
          return;
        }

        // Hanya tampilkan modal jika user BENAR-BENAR menutup popup tanpa bayar
        setPendingModalType('close');
        setPendingErrorMessage('');
        setShowPendingModal(true);
        break;
    }
  };

  // ── Handler dari PendingPaymentModal ──────────────────────────────────────
  const handlePayAgain = () => {
    setShowPendingModal(false);
    // ✅ Reset ref agar bisa bayar ulang
    paymentStatusRef.current = 'idle';
    if (snapToken) {
      setShowMidtrans(true);
    }
  };

  const handleViewOrder = () => {
    setShowPendingModal(false);
    setCurrentPayingOrderId(null);
    fetchOrders();
  };

  const handleContinueShopping = () => {
    setShowPendingModal(false);
    setCurrentPayingOrderId(null);
    router.push('/(tabs)' as any);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <ActivityIndicator color={brand.primary} size="large" />
    </SafeAreaView>
  );

  if (!isLoggedIn) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <MaterialIcons name="lock" size={52} color={C.textMuted} />
      <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Login</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Login dulu untuk melihat pesananmu</Text>
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
        onPress={() => router.push('/(tabs)/login' as any)}
      >
        <Text style={styles.ctaBtnText}>Login Sekarang</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Pesanan Saya</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>{orders.length} pesanan</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.ID)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
        renderItem={({ item: order }) => {
          const st = STATUS_MAP[order.status] ?? {
            label: order.status, color: C.textSecondary,
            bg: C.surfaceAlt, icon: 'info',
          };
          const date = new Date(order.CreatedAt).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric',
          });
          const time = new Date(order.CreatedAt).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit',
          });

          const isPendingPayment = order.status === 'BELUM_BAYAR'
            && order.payment_method === 'TRANSFER';
          const isLoadingThis = loadingPayment === order.ID;

          return (
            <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.orderId, { color: C.text }]}>
                    #{order.ID.toString().padStart(4, '0')}
                  </Text>
                  <Text style={[styles.orderDate, { color: C.textMuted }]}>
                    {date} · {time}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <MaterialIcons name={st.icon as any} size={12} color={st.color} />
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              {/* Item list */}
              {order.order_items?.slice(0, 3).map((item) => (
                <View key={item.ID} style={styles.itemRow}>
                  <View style={[styles.itemDot, { backgroundColor: brand.primary + '40' }]} />
                  <Text style={[styles.itemName, { color: C.text }]} numberOfLines={1}>
                    {item.product?.name ?? 'Produk'}
                  </Text>
                  <Text style={[styles.itemQty, { color: C.textMuted }]}>x{item.quantity}</Text>
                  <Text style={[styles.itemPrice, { color: C.textSecondary }]}>
                    {formatRupiah(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
              {(order.order_items?.length ?? 0) > 3 && (
                <Text style={[styles.moreItems, { color: C.textMuted }]}>
                  +{order.order_items.length - 3} item lainnya
                </Text>
              )}

              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={[styles.payMethod, { color: C.textSecondary }]}>
                  💳 {order.payment_method}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.totalLabel, { color: C.textMuted }]}>Total</Text>
                  <Text style={[styles.totalAmount, { color: brand.primary }]}>
                    {formatRupiah(order.total_amount)}
                  </Text>
                </View>
              </View>

              {/* Tombol Bayar */}
              {isPendingPayment && (
                <TouchableOpacity
                  style={[
                    styles.payBtn,
                    { backgroundColor: brand.primary, shadowColor: brand.primary },
                    isLoadingThis && { opacity: 0.7 },
                  ]}
                  onPress={() => handlePay(order)}
                  disabled={isLoadingThis}
                  activeOpacity={0.85}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="payment" size={18} color="#fff" />
                      <Text style={styles.payBtnText}>Bayar Sekarang</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MaterialIcons name="inbox" size={52} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Ada Pesanan</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Yuk mulai belanja!</Text>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.ctaBtnText}>Belanja Sekarang</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Midtrans WebView Popup */}
      {snapToken !== '' && (
        <MidtransWebView
          visible={showMidtrans}
          snapToken={snapToken}
          onResult={handleMidtransResult}
          brand={brand}
          C={C}
        />
      )}

      {/* Pending / Close / Error Modal */}
      <PendingPaymentModal
        visible={showPendingModal}
        type={pendingModalType}
        errorMessage={pendingErrorMessage}
        onPayAgain={handlePayAgain}
        onViewOrder={handleViewOrder}
        onContinueShopping={handleContinueShopping}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  listContent: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    borderRadius: 18, padding: 16,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '800' },
  orderDate: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, marginVertical: 12 },

  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '500' },
  itemQty: { fontSize: 12 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  moreItems: { fontSize: 12, fontStyle: 'italic', marginBottom: 4, marginLeft: 14 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  payMethod: { fontSize: 12, fontWeight: '600' },
  totalLabel: { fontSize: 11 },
  totalAmount: { fontSize: 16, fontWeight: '900' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 13, marginTop: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
  ctaBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});