import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { orderAPI } from '@/services/api';
import { useFocusEffect } from '@react-navigation/native';
import {
  PayMethod, SavedAddress, CheckoutParams, STORAGE_KEY_ADDRESSES,
} from './checkout.types';
import { PendingModalType } from '../payment/PendingPaymentModal';

function parseCartIds(raw: string | string[]): number[] {
  const str = Array.isArray(raw) ? raw.join(',') : raw;
  return str
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useCheckout(params: CheckoutParams) {
  const router = useRouter();

  // ✅ FIX: Gunakan ref untuk track status pembayaran agar tidak ter-reset oleh re-render
  // Midtrans Snap SELALU fire onClose setelah onSuccess/onPending/onError
  // Ref ini mencegah "close" modal muncul setelah status sudah ditentukan
  const paymentStatusRef = useRef<'idle' | 'success' | 'pending' | 'error'>('idle');

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const [formLabel, setFormLabel] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();

  const [payMethod, setPayMethod] = useState<PayMethod>('TRANSFER');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  // Midtrans WebView
  const [showMidtrans, setShowMidtrans] = useState(false);
  const [snapToken, setSnapToken] = useState('');

  // Pending/Close/Error modal
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalType, setPendingModalType] = useState<PendingModalType>('close');
  const [pendingErrorMessage, setPendingErrorMessage] = useState('');

  const loadAddresses = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (raw) {
        const list: SavedAddress[] = JSON.parse(raw);
        setSavedAddresses(list);
        if (list.length > 0) {
          setSelectedAddressId(prev => prev ?? list[0].id);
        }
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const persistAddresses = async (list: SavedAddress[]) => {
    await AsyncStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(list));
  };

  const openAddForm = () => {
    setEditingAddress(null);
    setFormLabel(''); setFormDetail('');
    setFormLat(undefined); setFormLng(undefined);
    setShowAddressForm(true);
  };

  const openEditForm = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormLabel(address.label); setFormDetail(address.detail);
    setFormLat(address.lat); setFormLng(address.lng);
    setShowAddressForm(true);
  };

  const closeForm = () => { setShowAddressForm(false); setEditingAddress(null); };

  const saveAddress = async () => {
    if (!formLabel.trim()) { Alert.alert('Label Kosong', 'Isi label alamat dulu'); return; }
    if (!formDetail.trim() || formDetail.trim().length < 10) {
      Alert.alert('Alamat Kurang Detail', 'Minimal 10 karakter'); return;
    }

    let updatedList: SavedAddress[];
    if (editingAddress) {
      updatedList = savedAddresses.map(a =>
        a.id === editingAddress.id
          ? { ...a, label: formLabel.trim(), detail: formDetail.trim(), lat: formLat, lng: formLng }
          : a
      );
    } else {
      const newAddress: SavedAddress = {
        id: generateId(), label: formLabel.trim(), detail: formDetail.trim(),
        lat: formLat, lng: formLng,
      };
      updatedList = [...savedAddresses, newAddress];
      setSelectedAddressId(newAddress.id);
    }

    setSavedAddresses(updatedList);
    await persistAddresses(updatedList);
    closeForm();
  };

  const deleteAddress = (addressId: string) => {
    Alert.alert('Hapus Alamat', 'Yakin mau hapus alamat ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          const updatedList = savedAddresses.filter(a => a.id !== addressId);
          setSavedAddresses(updatedList);
          await persistAddresses(updatedList);
          if (selectedAddressId === addressId) {
            setSelectedAddressId(updatedList[0]?.id ?? null);
          }
        },
      },
    ]);
  };

  const setMapCoords = (lat: number, lng: number, _address: string) => {
    setFormLat(lat); setFormLng(lng);
  };

  const submitCheckout = async () => {
    const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      Alert.alert('Pilih Alamat', 'Tambahkan dan pilih alamat pengiriman dulu ya!');
      return;
    }

    const payload: any = {
      address: selectedAddress.detail,
      payment_method: payMethod === 'COD' ? 'COD' : 'TRANSFER',
    };

    const rawCartIds = params.cart_ids;
    const rawProductId = params.product_id;

    if (params.from === 'cart' && rawCartIds) {
      const parsedIds = parseCartIds(rawCartIds as string | string[]);
      if (parsedIds.length === 0) { Alert.alert('Error', 'Tidak ada item cart yang valid'); return; }
      payload.cart_ids = parsedIds;
    } else if (rawProductId) {
      const productId = Array.isArray(rawProductId) ? Number(rawProductId[0]) : Number(rawProductId);
      const qty = params.quantity
        ? (Array.isArray(params.quantity) ? Number(params.quantity[0]) : Number(params.quantity))
        : 1;
      payload.product_id = productId;
      payload.quantity = qty;
    } else {
      Alert.alert('Error', 'Tidak ada produk yang dipilih');
      return;
    }

    // ✅ Reset status ref setiap kali mulai checkout baru
    paymentStatusRef.current = 'idle';

    setLoading(true);
    try {
      const res = await orderAPI.checkout(payload);
      const order = res.data?.order;
      const orderId: number = order?.ID ?? order?.id;

      setCreatedOrderId(orderId);

      if (payMethod === 'COD') {
        setShowSuccess(true);
      } else {
        if (!orderId) throw new Error('Order ID tidak ditemukan');

        const snapRes = await import('@/services/api').then(m => m.default.post('/api/payment/snap-token', {
          order_id: orderId,
        }));
        const token: string = snapRes.data.snap_token;
        if (!token) throw new Error('Snap token kosong');

        setSnapToken(token);
        setShowMidtrans(true);
      }
    } catch (e: any) {
      Alert.alert('Checkout Gagal', e.response?.data?.error ?? e.message ?? 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX UTAMA: Handle hasil Midtrans
  // Midtrans Snap SELALU trigger onClose setelah onSuccess/onPending/onError
  // Solusi: gunakan ref untuk track apakah sudah ada final status
  const handleMidtransResult = (result: {
    status: 'success' | 'pending' | 'error' | 'close';
    result?: any;
  }) => {
    // ✅ Selalu tutup WebView dulu
    setShowMidtrans(false);

    switch (result.status) {
      case 'success':
        // ✅ Set ref ke 'success' SEBELUM state update
        paymentStatusRef.current = 'success';

        if (createdOrderId) {
          import('@/services/api').then(m => {
            m.default.post('/api/payment/update-status', {
              order_id: createdOrderId,
              status: 'PENGIRIMAN',
            }).catch(e => console.warn('Gagal update status:', e));
          });
        }
        setShowSuccess(true);
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
        // ✅ FIX: Cek ref BUKAN isPaymentProcessed.current (yang dulu selalu false)
        // Jika sudah ada status final (success/pending/error), abaikan event close
        if (paymentStatusRef.current !== 'idle') {
          console.log('[Checkout] Ignoring close event, payment already processed:', paymentStatusRef.current);
          return;
        }

        // Hanya tampilkan modal "belum selesai" jika user BENAR-BENAR menutup popup
        // tanpa menyelesaikan pembayaran
        setPendingModalType('close');
        setPendingErrorMessage('');
        setShowPendingModal(true);
        break;
    }
  };

  // Handler dari PendingPaymentModal
  const handlePayAgain = () => {
    setShowPendingModal(false);
    // Reset ref agar bisa bayar ulang
    paymentStatusRef.current = 'idle';
    if (snapToken) {
      setShowMidtrans(true);
    }
  };

  const handleViewOrder = () => {
    setShowSuccess(false);
    setShowPendingModal(false);
    setShowMidtrans(false);
    router.push('/(tabs)/order' as any);
  };

  const handleContinueShopping = () => {
    setShowSuccess(false);
    setShowPendingModal(false);
    router.push('/(tabs)' as any);
  };

  return {
    savedAddresses,
    selectedAddressId,
    selectedAddress: savedAddresses.find(a => a.id === selectedAddressId) ?? null,
    showAddressForm,
    editingAddress,
    setSelectedAddressId,
    openAddForm, openEditForm, closeForm,
    deleteAddress, saveAddress,
    setMapCoords,
    formLabel, setFormLabel,
    formDetail, setFormDetail,
    formLat, formLng,
    payMethod, setPayMethod,
    loading, submitCheckout,
    // COD success modal
    showSuccess,
    // Midtrans
    showMidtrans,
    snapToken,
    handleMidtransResult,
    // Pending/Error/Close modal
    showPendingModal,
    pendingModalType,
    pendingErrorMessage,
    handlePayAgain,
    // Navigasi
    handleViewOrder,
    handleContinueShopping,
  };
}