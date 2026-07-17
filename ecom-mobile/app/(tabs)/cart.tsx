import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/components/ProductCard';
import { Image } from 'expo-image';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

type CartItem = {
  ID: number;
  quantity: number;
  product: { ID: number; name: string; price: number; image_url: string; stock: number };
};

export default function CartScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [localQty, setLocalQty] = useState<Record<number, number>>({});
  const [updatingQty, setUpdatingQty] = useState<Set<number>>(new Set());

  const fetchCart = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    try {
      const res = await cartAPI.getMyCart();
      const cartItems: CartItem[] = res.data?.data ?? [];
      setItems(cartItems);
      const initQty: Record<number, number> = {};
      cartItems.forEach(i => { initQty[i.ID] = i.quantity; });
      setLocalQty(initQty);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart])
  );

  // Gunakan product ID bukan cart ID untuk tracking selection
  const toggleSelect = (productId: number) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === items.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(items.map(i => i.product.ID)));
    }
  };

  const handleChangeQty = async (item: CartItem, delta: number) => {
    const currentQty = localQty[item.ID] ?? item.quantity;
    const newQty = currentQty + delta;

    if (newQty < 1) return;
    if (newQty > item.product.stock) {
      Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${item.product.stock}`);
      return;
    }

    setLocalQty(prev => ({ ...prev, [item.ID]: newQty }));
    setUpdatingQty(prev => new Set(prev).add(item.ID));

    try {
      await cartAPI.removeFromCart(item.ID);
      await cartAPI.addToCart(item.product.ID, newQty);

      // Fetch ulang cart untuk dapat ID terbaru
      const res = await cartAPI.getMyCart();
      const newItems: CartItem[] = res.data?.data ?? [];
      setItems(newItems);

      const updatedQty: Record<number, number> = {};
      newItems.forEach(i => { updatedQty[i.ID] = i.quantity; });
      setLocalQty(updatedQty);

      // selectedProductIds tidak perlu diubah karena pakai product ID
    } catch (e: any) {
      setLocalQty(prev => ({ ...prev, [item.ID]: currentQty }));
      Alert.alert('Gagal', 'Gagal mengubah jumlah item');
    } finally {
      setUpdatingQty(prev => {
        const next = new Set(prev);
        next.delete(item.ID);
        return next;
      });
    }
  };

  const handleDelete = async (productId: number, cartId: number) => {
    try {
      await cartAPI.removeFromCart(cartId);
      setItems(prev => prev.filter(item => item.ID !== cartId));
      setLocalQty(prev => { const next = { ...prev }; delete next[cartId]; return next; });
      // Hapus dari selection pakai product ID
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } catch (err) {
      Alert.alert('Error', 'Gagal menghapus item dari keranjang');
    }
  };

  const totalPrice = items
    .filter(i => selectedProductIds.has(i.product.ID))
    .reduce((sum, i) => sum + i.product.price * (localQty[i.ID] ?? i.quantity), 0);

  const handleCheckout = () => {
    if (selectedProductIds.size === 0) {
      Alert.alert('Pilih Produk', 'Pilih minimal satu produk untuk di-checkout!');
      return;
    }

    // Ambil cart ID terbaru berdasarkan product ID yang dipilih
    const selectedCartIds = items
      .filter(i => selectedProductIds.has(i.product.ID))
      .map(i => i.ID);

    if (selectedCartIds.length === 0) {
      Alert.alert('Error', 'Gagal mendapatkan item cart, coba refresh halaman');
      return;
    }

    const cartIds = selectedCartIds.join(',');
    router.push({ 
      pathname: '/checkout', 
      params: { from: 'cart', cart_ids: cartIds, total: String(totalPrice) } 
    } as any);
  };

  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <ActivityIndicator color={brand.primary} size="large" />
    </SafeAreaView>
  );

  if (!isLoggedIn) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <MaterialIcons name="lock" size={52} color={C.textMuted} />
      <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Login</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        Login dulu untuk melihat keranjangmu
      </Text>
      <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
        onPress={() => router.push('/(tabs)/login' as any)}>
        <Text style={styles.ctaBtnText}>Login Sekarang</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const isAllSelected = items.length > 0 && selectedProductIds.size === items.length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />

        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.surfaceAlt }]}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Keranjang</Text>
          <Text style={[styles.headerCount, { color: C.textSecondary }]}>{items.length} item</Text>
        </View>

        {items.length > 0 && (
          <View style={[styles.selectAllRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={toggleSelectAll}>
              <View style={[styles.checkbox, isAllSelected && { backgroundColor: brand.primary, borderColor: brand.primary }]}>
                {isAllSelected && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={[styles.selectAllText, { color: C.text }]}>Pilih Semua</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.ID)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            let uri = item.product.image_url || '';
            uri = uri.replace('http://localhost:3000', BASE_URL).replace('https://localhost:3000', BASE_URL);
            if (!uri.startsWith('http') && uri !== '') {
              uri = `${BASE_URL}${uri.startsWith('/') ? '' : '/'}${uri}`;
            }
            const isSelected = selectedProductIds.has(item.product.ID);
            const qty = localQty[item.ID] ?? item.quantity;
            const isUpdating = updatingQty.has(item.ID);

            return (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDelete(item.product.ID, item.ID)}
                  >
                    <MaterialIcons name="delete" size={28} color="#fff" />
                    <Text style={styles.deleteText}>Hapus</Text>
                  </TouchableOpacity>
                )}
              >
                <View style={[styles.itemCardWrapper, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
                  <TouchableOpacity style={styles.checkboxContainer} onPress={() => toggleSelect(item.product.ID)}>
                    <View style={[styles.checkbox, isSelected && { backgroundColor: brand.primary, borderColor: brand.primary }]}>
                      {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  <Image
                    source={{ uri }}
                    style={[styles.itemImage, { backgroundColor: C.surfaceAlt }]}
                    contentFit="cover"
                    transition={400}
                  />

                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: C.text }]} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.itemPrice, { color: brand.primary }]}>
                      {formatRupiah(item.product.price)}
                    </Text>

                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { borderColor: C.border, backgroundColor: C.surfaceAlt },
                          (qty <= 1 || isUpdating) && styles.qtyBtnDisabled,
                        ]}
                        onPress={() => handleChangeQty(item, -1)}
                        disabled={qty <= 1 || isUpdating}
                      >
                        <MaterialIcons name="remove" size={14} color={qty <= 1 ? C.textMuted : C.text} />
                      </TouchableOpacity>

                      <View style={[styles.qtyValueBox, { backgroundColor: C.surfaceAlt }]}>
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={brand.primary} />
                        ) : (
                          <Text style={[styles.qtyValue, { color: C.text }]}>{qty}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.qtyBtn,
                          { borderColor: C.border, backgroundColor: C.surfaceAlt },
                          (qty >= item.product.stock || isUpdating) && styles.qtyBtnDisabled,
                        ]}
                        onPress={() => handleChangeQty(item, +1)}
                        disabled={qty >= item.product.stock || isUpdating}
                      >
                        <MaterialIcons name="add" size={14} color={qty >= item.product.stock ? C.textMuted : brand.primary} />
                      </TouchableOpacity>

                      <Text style={[styles.stockHint, { color: C.textMuted }]}>
                        Stok: {item.product.stock}
                      </Text>
                    </View>

                    <Text style={[styles.subtotal, { color: C.textSecondary }]}>
                      Subtotal: {formatRupiah(item.product.price * qty)}
                    </Text>
                  </View>
                </View>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <MaterialIcons name="shopping-cart" size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>Keranjang Kosong</Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Yuk mulai belanja!</Text>
              <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: brand.primary }]}
                onPress={() => router.push('/(tabs)')}>
                <Text style={styles.ctaBtnText}>Lihat Produk</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {items.length > 0 && (
          <View style={[styles.checkoutBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: C.textMuted }]}>Total Harga</Text>
              <Text style={[styles.totalAmount, { color: brand.primary }]}>{formatRupiah(totalPrice)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                { backgroundColor: selectedProductIds.size > 0 ? brand.primary : C.surfaceAlt, shadowColor: brand.primary },
              ]}
              onPress={handleCheckout}
              disabled={selectedProductIds.size === 0}
            >
              <Text style={[styles.checkoutBtnText, { color: selectedProductIds.size > 0 ? '#fff' : C.textMuted }]}>
                Checkout ({selectedProductIds.size})
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color={selectedProductIds.size > 0 ? '#fff' : C.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  headerCount: { fontSize: 13 },
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  selectAllText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, gap: 12, paddingBottom: 120 },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  itemCardWrapper: {
    flexDirection: 'row', borderRadius: 16, padding: 12, alignItems: 'flex-start', gap: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  checkboxContainer: { padding: 4, marginRight: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc',
    justifyContent: 'center', alignItems: 'center',
  },
  itemImage: { width: 72, height: 72, borderRadius: 12 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyValueBox: {
    width: 32, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyValue: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  stockHint: { fontSize: 10, marginLeft: 2 },
  subtotal: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  emptyWrapper: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { fontSize: 14 },
  ctaBtn: { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08,
    shadowRadius: 12, elevation: 12,
  },
  totalContainer: { flex: 1 },
  totalLabel: { fontSize: 12, fontWeight: '500' },
  totalAmount: { fontSize: 18, fontWeight: '900' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  checkoutBtnText: { fontWeight: '800', fontSize: 15 },
});