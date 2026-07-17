import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { checkoutStyles as S } from './checkout.styles';
import { formatRupiah } from '@/components/ProductCard';

type Props = {
  C: any;
  brand: any;
  subtotal: number;
  // Bisa diperluas: ongkir, diskon, dll.
  shippingCost?: number;
  discount?: number;
};

export default function OrderSummary({ C, brand, subtotal, shippingCost = 0, discount = 0 }: Props) {
  const total = subtotal + shippingCost - discount;

  return (
    <View style={[S.sectionCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
      {/* Header */}
      <View style={S.sectionHeaderLeft}>
        <MaterialIcons name="receipt-long" size={20} color={brand.primary} />
        <Text style={[S.sectionTitle, { color: C.text }]}>Ringkasan Pesanan</Text>
      </View>

      {/* Baris subtotal */}
      <View style={S.summaryRow}>
        <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Subtotal</Text>
        <Text style={[S.summaryValue, { color: C.text }]}>{formatRupiah(subtotal)}</Text>
      </View>

      {/* Baris ongkir */}
      <View style={S.summaryRow}>
        <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Ongkos Kirim</Text>
        <Text style={[S.summaryValue, { color: shippingCost === 0 ? '#10B981' : C.text }]}>
          {shippingCost === 0 ? 'GRATIS' : formatRupiah(shippingCost)}
        </Text>
      </View>

      {/* Baris diskon (jika ada) */}
      {discount > 0 && (
        <View style={S.summaryRow}>
          <Text style={[S.summaryLabel, { color: C.textSecondary }]}>Diskon</Text>
          <Text style={[S.summaryValue, { color: '#EF4444' }]}>- {formatRupiah(discount)}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={[S.summaryDivider, { backgroundColor: C.border }]} />

      {/* Total */}
      <View style={S.summaryRow}>
        <Text style={[S.summaryTotalLabel, { color: C.text }]}>Total Pembayaran</Text>
        <Text style={[S.summaryTotalValue, { color: brand.primary }]}>{formatRupiah(total)}</Text>
      </View>
    </View>
  );
}