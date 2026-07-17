import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { checkoutStyles as S } from './checkout.styles';
import { PAY_METHODS, PayMethod } from './checkout.types';

type Props = {
  C: any;
  brand: any;
  selected: PayMethod;
  onSelect: (method: PayMethod) => void;
};

export default function PaymentSection({ C, brand, selected, onSelect }: Props) {
  return (
    <View style={[S.sectionCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
      {/* Header */}
      <View style={S.sectionHeaderLeft}>
        <MaterialIcons name="payment" size={20} color={brand.primary} />
        <Text style={[S.sectionTitle, { color: C.text }]}>Metode Pembayaran</Text>
      </View>

      {/* Pilihan metode */}
      <View style={{ gap: 10 }}>
        {PAY_METHODS.map(method => {
          const isSelected = selected === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                S.payCard,
                {
                  backgroundColor: isSelected ? brand.primaryMuted : C.surfaceAlt,
                  borderColor: isSelected ? brand.primary : C.border,
                },
              ]}
              onPress={() => onSelect(method.id)}
              activeOpacity={0.8}
            >
              <Text style={S.payIcon}>{method.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.payLabel, { color: C.text }]}>{method.label}</Text>
                <Text style={[S.payDesc, { color: C.textMuted }]}>{method.desc}</Text>
              </View>
              <View style={[
                S.payRadio,
                {
                  borderColor: isSelected ? brand.primary : C.border,
                  backgroundColor: isSelected ? brand.primary : 'transparent',
                },
              ]}>
                {isSelected && <MaterialIcons name="check" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Info box sesuai metode */}
      {selected === 'COD' && (
        <View style={[S.infoBox, { backgroundColor: brand.primaryMuted, borderColor: brand.primary + '40' }]}>
          <MaterialIcons name="info" size={18} color={brand.primary} />
          <Text style={[S.infoText, { color: brand.primaryDark ?? brand.primary }]}>
            Siapkan uang pas saat kurir tiba. Status pesanan langsung jadi "Pengiriman".
          </Text>
        </View>
      )}

      {selected === 'TRANSFER' && (
        <View style={[S.infoBox, { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }]}>
          <MaterialIcons name="info" size={18} color="#2563EB" />
          <Text style={[S.infoText, { color: '#1D4ED8' }]}>
            Setelah checkout, kamu akan mendapat nomor rekening untuk transfer. Pesanan dikonfirmasi setelah pembayaran diterima.
          </Text>
        </View>
      )}
    </View>
  );
}