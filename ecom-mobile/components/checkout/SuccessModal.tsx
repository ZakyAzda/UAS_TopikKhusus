import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

const { width } = Dimensions.get('window');

type Props = {
  visible: boolean;
  payMethod: 'COD' | 'TRANSFER';
  onViewOrder: () => void;
  onContinueShopping: () => void;
};

export default function SuccessModal({ visible, payMethod, onViewOrder, onContinueShopping }: Props) {
  const { C, brand } = useTheme();

  const scaleAnim  = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
      slideAnim.setValue(40);

      Animated.sequence([
        // Backdrop + card muncul
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]),
        // Check icon muncul
        Animated.spring(checkAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        // Teks slide up
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: C.surface, transform: [{ scale: scaleAnim }] }
        ]}>

          {/* Icon lingkaran centang */}
          <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
            <View style={[styles.iconOuter, { backgroundColor: brand.primaryMuted }]}>
              <View style={[styles.iconInner, { backgroundColor: brand.primary }]}>
                <MaterialIcons name="check" size={36} color="#fff" />
              </View>
            </View>
          </Animated.View>

          {/* Teks */}
          <Animated.View style={[
            styles.textBlock,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <Text style={[styles.title, { color: C.text }]}>Pesanan Berhasil! 🎉</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>
              {payMethod === 'COD'
                ? 'Pesananmu sedang diproses.\nSiapkan uang pas saat kurir tiba ya!'
                : 'Segera lakukan transfer untuk\nkonfirmasi pesananmu.'}
            </Text>

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: brand.primaryMuted }]}>
              <MaterialIcons
                name={payMethod === 'COD' ? 'local-shipping' : 'account-balance'}
                size={18}
                color={brand.primary}
              />
              <Text style={[styles.infoText, { color: brand.primary }]}>
                {payMethod === 'COD'
                  ? 'Estimasi tiba 1-3 hari kerja'
                  : 'Transfer dalam 24 jam agar pesanan diproses'}
              </Text>
            </View>
          </Animated.View>

          {/* Tombol */}
          <Animated.View style={[
            styles.btnBlock,
            { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: brand.primary }]}
              onPress={onViewOrder}
              activeOpacity={0.85}
            >
              <MaterialIcons name="receipt-long" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Lihat Pesanan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: C.border }]}
              onPress={onContinueShopping}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnSecondaryText, { color: C.textSecondary }]}>
                Lanjut Belanja
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  btnBlock: {
    width: '100%',
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  btnSecondary: {
    borderRadius: 16,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});