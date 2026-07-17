import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');

export type PendingModalType = 'pending' | 'close' | 'error';

type Props = {
  visible: boolean;
  type: PendingModalType;
  errorMessage?: string;
  onPayAgain: () => void;
  onViewOrder: () => void;
  onContinueShopping: () => void;
};

const MODAL_CONFIG: Record<PendingModalType, {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
}> = {
  pending: {
    icon: 'schedule',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    title: 'Menunggu Pembayaran ⏳',
    subtitle: 'Pesananmu sudah dibuat. Selesaikan pembayaran sebelum batas waktu habis ya!',
    primaryLabel: 'Lihat Pesanan',
    secondaryLabel: 'Lanjut Belanja',
  },
  close: {
    icon: 'payment',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    title: 'Pembayaran Belum Selesai',
    subtitle: 'Pesananmu sudah dibuat tapi belum dibayar. Selesaikan pembayaran agar pesanan diproses.',
    primaryLabel: 'Bayar Sekarang',
    secondaryLabel: 'Lihat Pesanan',
  },
  error: {
    icon: 'error-outline',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    title: 'Pembayaran Gagal ❌',
    subtitle: 'Transaksi tidak berhasil diproses. Silakan coba lagi atau pilih metode pembayaran lain.',
    primaryLabel: 'Coba Lagi',
    secondaryLabel: 'Lihat Pesanan',
  },
};

export default function PendingPaymentModal({
  visible, type, errorMessage,
  onPayAgain, onViewOrder, onContinueShopping,
}: Props) {
  const { C, brand } = useTheme();
  const config = MODAL_CONFIG[type];

  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      iconAnim.setValue(0);
      slideAnim.setValue(40);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        Animated.spring(iconAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handlePrimary = () => {
    if (type === 'close' || type === 'error') {
      onPayAgain();
    } else {
      onViewOrder();
    }
  };

  const handleSecondary = () => {
    if (type === 'close') {
      onViewOrder();
    } else {
      onContinueShopping();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: C.surface, transform: [{ scale: scaleAnim }] },
        ]}>

          {/* Icon */}
          <Animated.View style={{ transform: [{ scale: iconAnim }] }}>
            <View style={[styles.iconOuter, { backgroundColor: config.iconBg }]}>
              <View style={[styles.iconInner, { backgroundColor: config.iconBg, borderWidth: 3, borderColor: config.iconColor + '30' }]}>
                <MaterialIcons name={config.icon as any} size={40} color={config.iconColor} />
              </View>
            </View>
          </Animated.View>

          {/* Teks */}
          <Animated.View style={[
            styles.textBlock,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
          ]}>
            <Text style={[styles.title, { color: C.text }]}>{config.title}</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>
              {errorMessage && type === 'error' ? errorMessage : config.subtitle}
            </Text>

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: config.iconBg }]}>
              <MaterialIcons
                name={type === 'pending' ? 'info' : type === 'close' ? 'lock-clock' : 'refresh'}
                size={16}
                color={config.iconColor}
              />
              <Text style={[styles.infoText, { color: config.iconColor }]}>
                {type === 'pending' && 'Pesanan akan dibatalkan otomatis jika tidak dibayar dalam 24 jam'}
                {type === 'close' && 'Pesananmu tersimpan, kamu bisa bayar kapan saja di halaman Pesanan'}
                {type === 'error' && 'Stok produk tetap terjaga. Silakan coba lagi dengan metode lain'}
              </Text>
            </View>
          </Animated.View>

          {/* Tombol */}
          <Animated.View style={[
            styles.btnBlock,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
          ]}>
            {/* Primary */}
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { backgroundColor: type === 'error' ? '#DC2626' : type === 'close' ? brand.primary : '#D97706' },
              ]}
              onPress={handlePrimary}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={type === 'close' || type === 'error' ? 'payment' : 'receipt-long'}
                size={18}
                color="#fff"
              />
              <Text style={styles.btnPrimaryText}>{config.primaryLabel}</Text>
            </TouchableOpacity>

            {/* Secondary */}
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleSecondary}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnSecondaryText, { color: C.textSecondary }]}>
                {config.secondaryLabel}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: width - 48,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  iconOuter: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
  },
  iconInner: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center', gap: 10, width: '100%',
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 14, padding: 12, width: '100%', marginTop: 4,
  },
  infoText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },
  btnBlock: { width: '100%', gap: 10 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 15, width: '100%',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  btnSecondary: {
    borderRadius: 16, paddingVertical: 13, width: '100%',
    alignItems: 'center', borderWidth: 1.5,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '700' },
});