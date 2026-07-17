import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '@/services/api';

export type PaymentStatus = 'idle' | 'loading' | 'open' | 'success' | 'pending' | 'error';

type PaymentResult = {
  status: 'success' | 'pending' | 'error' | 'close';
  result?: any;
};

// TAMBAHAN: Kita tambahkan parameter onSuccessCallback di sini
export function usePayment(onSuccessCallback?: () => void) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [snapToken, setSnapToken] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);

  // Minta snap_token dari backend, lalu tampilkan WebView
  const initiatePayment = useCallback(async (orderId: number) => {
    setPaymentStatus('loading');
    setLastOrderId(orderId);

    try {
      const res = await api.post('/api/payment/snap-token', { order_id: orderId });
      const token: string = res.data.snap_token;

      if (!token) {
        throw new Error('Token kosong dari server');
      }

      setSnapToken(token);
      setShowPayment(true);
      setPaymentStatus('open');
    } catch (e: any) {
      setPaymentStatus('error');
      Alert.alert(
        'Gagal Memulai Pembayaran',
        e.response?.data?.error ?? e.message ?? 'Terjadi kesalahan, coba lagi.'
      );
    }
  }, []);

  // Dipanggil oleh MidtransWebView saat ada hasil pembayaran
  const handlePaymentResult = useCallback(async (result: PaymentResult) => {
    setShowPayment(false);

    switch (result.status) {
      case 'success':
        setPaymentStatus('success');
        
        if (lastOrderId) {
          try {
            await api.post('/api/payment/update-status', {
              order_id: lastOrderId,
              status: 'PENGIRIMAN'
            });
          } catch (error) {
            console.error("Gagal update status di backend:", error);
          }
        }

        Alert.alert(
          '✅ Pembayaran Berhasil!',
          'Pesananmu sudah dikonfirmasi dan akan segera diproses.',
          [
            { 
              text: 'Lihat Pesanan', 
              style: 'default',
              // TAMBAHAN: Panggil callback di sini agar UI me-refresh daftar pesanan
              onPress: () => {
                if (onSuccessCallback) onSuccessCallback();
              }
            }
          ]
        );
        break;

      case 'pending':
        setPaymentStatus('pending');
        
        if (lastOrderId) {
          try {
             await api.post('/api/payment/update-status', {
              order_id: lastOrderId,
              status: 'BELUM_BAYAR'
            });
          } catch (error) {
             console.error("Gagal update status di backend:", error);
          }
        }

        Alert.alert(
          '⏳ Menunggu Pembayaran',
          'Selesaikan pembayaranmu sebelum batas waktu. Status pesanan akan diperbarui otomatis.',
          [
            { 
              text: 'OK',
              // TAMBAHAN: Refresh UI juga saat pending jika dibutuhkan
              onPress: () => {
                if (onSuccessCallback) onSuccessCallback();
              }
            }
          ]
        );
        break;

      // Hapus case 'error' yang double, sisakan satu saja
      case 'error':
        setPaymentStatus('error');
        Alert.alert(
          '❌ Pembayaran Gagal',
          result.result?.status_message ?? 'Pembayaran tidak berhasil. Silakan coba lagi.',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Coba Lagi', onPress: () => lastOrderId && initiatePayment(lastOrderId) },
          ]
        );
        break;

      case 'close':
        // User tutup popup — tidak ada aksi, biarkan mereka lanjut
        setPaymentStatus('idle');
        break;
    }
  }, [lastOrderId, initiatePayment, onSuccessCallback]); // Tambahkan onSuccessCallback ke dependency array

  const closePayment = useCallback(() => {
    setShowPayment(false);
    setPaymentStatus('idle');
  }, []);

  const resetPayment = useCallback(() => {
    setPaymentStatus('idle');
    setSnapToken('');
    setShowPayment(false);
    setLastOrderId(null);
  }, []);

  return {
    paymentStatus,
    snapToken,
    showPayment,
    lastOrderId,
    initiatePayment,
    handlePaymentResult,
    closePayment,
    resetPayment,
  };
}