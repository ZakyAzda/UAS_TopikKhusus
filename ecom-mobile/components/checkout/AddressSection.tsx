import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { checkoutStyles as S } from './checkout.styles';
import { SavedAddress } from './checkout.types';
import MapPickerModal from './MapPickerModal';

type Props = {
  C: any;
  brand: any;
  savedAddresses: SavedAddress[];
  selectedAddressId: string | null;
  showAddressForm: boolean;
  editingAddress: SavedAddress | null;
  formLabel: string;
  formDetail: string;
  formLat?: number;
  formLng?: number;
  onSelectAddress: (id: string) => void;
  onOpenAddForm: () => void;
  onOpenEditForm: (address: SavedAddress) => void;
  onDeleteAddress: (id: string) => void;
  onSaveAddress: () => void;
  onCloseForm: () => void;
  onChangeLabel: (text: string) => void;
  onChangeDetail: (text: string) => void;
  onSetMapCoords: (lat: number, lng: number, address: string) => void;
};

const LABEL_SUGGESTIONS = ['Rumah', 'Kantor', 'Kos', 'Lainnya'];

export default function AddressSection({
  C, brand,
  savedAddresses, selectedAddressId, showAddressForm, editingAddress,
  formLabel, formDetail, formLat, formLng,
  onSelectAddress, onOpenAddForm, onOpenEditForm, onDeleteAddress,
  onSaveAddress, onCloseForm,
  onChangeLabel, onChangeDetail, onSetMapCoords,
}: Props) {
  const [detailFocused, setDetailFocused] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleMapConfirm = (lat: number, lng: number, address: string) => {
    onSetMapCoords(lat, lng, address);
    if (!formDetail.trim() && address) {
      onChangeDetail(address);
    }
    setShowMap(false);
  };

  return (
    <>
      <View style={[S.sectionCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
        {/* Header */}
        <View style={S.sectionHeader}>
          <View style={S.sectionHeaderLeft}>
            <MaterialIcons name="location-on" size={20} color={brand.primary} />
            <Text style={[S.sectionTitle, { color: C.text }]}>Alamat Pengiriman</Text>
          </View>
          {!showAddressForm && (
            <TouchableOpacity onPress={onOpenAddForm}>
              <Text style={[S.sectionActionText, { color: brand.primary }]}>+ Tambah</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Daftar alamat tersimpan */}
        {savedAddresses.length > 0 && !showAddressForm && (
          <View style={{ gap: 10 }}>
            {savedAddresses.map(address => {
              const isSelected = selectedAddressId === address.id;
              return (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    S.addressCard,
                    {
                      backgroundColor: isSelected ? brand.primaryMuted : C.surfaceAlt,
                      borderColor: isSelected ? brand.primary : C.border,
                    },
                  ]}
                  onPress={() => onSelectAddress(address.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    S.selectedIndicator,
                    {
                      borderColor: isSelected ? brand.primary : C.border,
                      backgroundColor: isSelected ? brand.primary : 'transparent',
                    },
                  ]}>
                    {isSelected && <MaterialIcons name="check" size={12} color="#fff" />}
                  </View>

                  <View style={S.addressCardContent}>
                    <Text style={[S.addressCardLabel, { color: C.text }]}>
                      {address.label}{address.lat && address.lng ? '  📍' : ''}
                    </Text>
                    <Text style={[S.addressCardDetail, { color: C.textSecondary }]} numberOfLines={2}>
                      {address.detail}
                    </Text>
                  </View>

                  <View style={S.addressCardActions}>
                    <TouchableOpacity
                      onPress={() => onOpenEditForm(address)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="edit" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDeleteAddress(address.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {savedAddresses.length === 0 && !showAddressForm && (
          <TouchableOpacity
            style={[S.addAddressBtn, { borderColor: brand.primary + '60' }]}
            onPress={onOpenAddForm}
          >
            <MaterialIcons name="add-location-alt" size={20} color={brand.primary} />
            <Text style={[S.addAddressBtnText, { color: brand.primary }]}>
              Tambah Alamat Pengiriman
            </Text>
          </TouchableOpacity>
        )}

        {/* Form tambah / edit */}
        {showAddressForm && (
          <View style={S.formContainer}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
              {editingAddress ? 'Edit Alamat' : 'Alamat Baru'}
            </Text>

            {/* Quick label */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {LABEL_SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={{
                      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
                      borderWidth: 1.5,
                      backgroundColor: formLabel === s ? brand.primary : 'transparent',
                      borderColor: formLabel === s ? brand.primary : C.border,
                    }}
                    onPress={() => onChangeLabel(s)}
                  >
                    <Text style={{
                      fontSize: 12, fontWeight: '700',
                      color: formLabel === s ? '#fff' : C.textSecondary,
                    }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Label input */}
            <TextInput
              style={[S.labelInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
              placeholder="Label alamat (cth: Rumah, Kantor)"
              placeholderTextColor={C.textMuted}
              value={formLabel}
              onChangeText={onChangeLabel}
            />

            {/* Detail alamat */}
            <TextInput
              style={[
                S.detailInput,
                {
                  backgroundColor: C.surfaceAlt,
                  borderColor: detailFocused ? brand.primary : C.border,
                  color: C.text,
                },
              ]}
              placeholder="Jl. Mawar No. 5, Kel. Sukamaju, Kec. Coblong, Kota Bandung 40132"
              placeholderTextColor={C.textMuted}
              value={formDetail}
              onChangeText={onChangeDetail}
              multiline
              textAlignVertical="top"
              onFocus={() => setDetailFocused(true)}
              onBlur={() => setDetailFocused(false)}
            />

            <Text style={[S.formHint, { color: C.textMuted }]}>
              💡 Isi lengkap: nama jalan, nomor, kelurahan, kecamatan, kota & kode pos
            </Text>

            {/* Tombol buka peta in-app */}
            <TouchableOpacity
              style={[S.mapBtn, { borderColor: brand.primary + '60', backgroundColor: brand.primaryMuted }]}
              onPress={() => setShowMap(true)}
            >
              <MaterialIcons name="map" size={18} color={brand.primary} />
              <Text style={[S.mapBtnText, { color: brand.primary }]}>
                {formLat && formLng ? '📍 Ubah Titik di Peta' : '📍 Pilih Titik dari Peta'}
              </Text>
            </TouchableOpacity>

            {/* Koordinat terpilih */}
            {formLat && formLng && (
              <View style={[S.mapPickedRow, { backgroundColor: brand.primaryMuted, borderColor: brand.primary + '40' }]}>
                <MaterialIcons name="location-on" size={16} color={brand.primary} />
                <Text style={[S.mapPickedText, { color: brand.primary }]}>
                  {formLat.toFixed(6)}, {formLng.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Tombol simpan / batal */}
            <View style={S.formBtnRow}>
              <TouchableOpacity
                style={[S.formCancelBtn, { borderColor: C.border }]}
                onPress={onCloseForm}
              >
                <Text style={[S.formCancelText, { color: C.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.formSaveBtn, { backgroundColor: brand.primary }]}
                onPress={onSaveAddress}
              >
                <Text style={S.formSaveText}>
                  {editingAddress ? 'Simpan Perubahan' : 'Simpan Alamat'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Map Picker Modal - in-app */}
      <MapPickerModal
        visible={showMap}
        initialLat={formLat}
        initialLng={formLng}
        onConfirm={handleMapConfirm}
        onClose={() => setShowMap(false)}
        brand={brand}
        C={C}
      />
    </>
  );
}