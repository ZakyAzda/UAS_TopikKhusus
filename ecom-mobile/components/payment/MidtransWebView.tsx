import React, { useRef, useState } from 'react';
import {
  Modal, View, TouchableOpacity, Text, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';

// Dibaca dari .env — prefix EXPO_PUBLIC_ agar bisa diakses di client side
const MIDTRANS_CLIENT_KEY = process.env.EXPO_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
const IS_PRODUCTION = process.env.EXPO_PUBLIC_MIDTRANS_ENV === 'production';

const MIDTRANS_SNAP_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

type PaymentResult =
  | { status: 'success'; result: any }
  | { status: 'pending'; result: any }
  | { status: 'error';   result: any }
  | { status: 'close' };

type Props = {
  visible: boolean;
  snapToken: string;
  onResult: (result: PaymentResult) => void;
  brand: any;
  C: any;
};

const buildSnapHTML = (snapToken: string, clientKey: string, snapUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <title>Midtrans Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #e0e0e0;
      border-top-color: #1ABC9C;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div></div>

  <script src="${snapUrl}" data-client-key="${clientKey}"></script>
  <script>
    window.addEventListener('load', function () {
      snap.pay('${snapToken}', {
        onSuccess: function (result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_SUCCESS', result }));
        },
        onPending: function (result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_PENDING', result }));
        },
        onError: function (result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_ERROR', result }));
        },
        onClose: function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYMENT_CLOSE' }));
        },
      });
    });
  </script>
</body>
</html>
`;

export default function MidtransWebView({ visible, snapToken, onResult, brand, C }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'PAYMENT_SUCCESS': onResult({ status: 'success', result: data.result }); break;
        case 'PAYMENT_PENDING': onResult({ status: 'pending', result: data.result }); break;
        case 'PAYMENT_ERROR':   onResult({ status: 'error',   result: data.result }); break;
        case 'PAYMENT_CLOSE':   onResult({ status: 'close' }); break;
      }
    } catch (e) {
      console.warn('WebView message parse error:', e);
    }
  };

  const handleClose = () => onResult({ status: 'close' });

  const htmlContent = buildSnapHTML(snapToken, MIDTRANS_CLIENT_KEY, MIDTRANS_SNAP_URL);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: brand.primaryMuted }]}>
              <MaterialIcons name="payment" size={18} color={brand.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: C.text }]}>Pembayaran</Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: C.surfaceAlt }]}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* WebView / Error */}
        <View style={styles.webViewContainer}>
          {error ? (
            <View style={styles.errorState}>
              <MaterialIcons name="wifi-off" size={48} color={C.textMuted} />
              <Text style={[styles.errorTitle, { color: C.text }]}>Gagal memuat halaman</Text>
              <Text style={[styles.errorSub, { color: C.textSecondary }]}>
                Periksa koneksi internet kamu
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: brand.primary }]}
                onPress={() => { setError(false); setLoading(true); webViewRef.current?.reload(); }}
              >
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: htmlContent }}
              style={styles.webView}
              onMessage={handleMessage}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setError(true); setLoading(false); }}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              applicationNameForUserAgent="GreenMart/1.0"
            />
          )}

          {/* Loading overlay */}
          {loading && !error && (
            <View style={[styles.loadingOverlay, { backgroundColor: C.background }]}>
              <View style={[styles.loadingCard, { backgroundColor: C.surface }]}>
                <ActivityIndicator size="large" color={brand.primary} />
                <Text style={[styles.loadingText, { color: C.text }]}>
                  Memuat halaman pembayaran...
                </Text>
                <Text style={[styles.loadingSub, { color: C.textSecondary }]}>
                  Mohon tunggu sebentar
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <MaterialIcons name="lock" size={14} color={C.textMuted} />
          <Text style={[styles.footerText, { color: C.textMuted }]}>
            Transaksi aman dan terenkripsi oleh Midtrans
          </Text>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  webViewContainer: { flex: 1, position: 'relative' },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  loadingCard: {
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 14, width: 240,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
  },
  loadingText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  loadingSub: { fontSize: 12, textAlign: 'center' },
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorSub: { fontSize: 14, textAlign: 'center' },
  retryBtn: { borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1,
  },
  footerText: { fontSize: 12 },
});