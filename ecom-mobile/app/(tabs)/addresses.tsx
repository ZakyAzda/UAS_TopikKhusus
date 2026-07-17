import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/use-theme';
import MapPickerModal from '@/components/checkout/MapPickerModal';

const STORAGE_KEY_ADDRESSES = 'saved_addresses';

type SavedAddress = {
  id: string;
  label: string;
  detail: string;
  lat?: number;
  lng?: number;
};

const LABEL_SUGGESTIONS = ['Rumah', 'Kantor', 'Kos', 'Lainnya'];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function AddressesScreen() {
  const { C, brand, scheme } = useTheme();
  const router = useRouter();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();
  const [detailFocused, setDetailFocused] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const loadAddresses = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (raw) setAddresses(JSON.parse(raw));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  const persist = async (list: SavedAddress[]) => {
    await AsyncStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(list));
  };

  const openAdd = () => {
    setEditingAddress(null);
    setFormLabel('');
    setFormDetail('');
    setFormLat(undefined);
    setFormLng(undefined);
    setShowForm(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setFormLabel(addr.label);
    setFormDetail(addr.detail);
    setFormLat(addr.lat);
    setFormLng(addr.lng);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  const saveAddress = async () => {
    if (!formLabel.trim()) {
      Alert.alert('Label Kosong', 'Isi label alamat dulu, contoh: Rumah, Kantor');
      return;
    }
    if (!formDetail.trim() || formDetail.trim().length < 10) {
      Alert.alert('Alamat Kurang Detail', 'Isi alamat lengkap minimal 10 karakter');
      return;
    }

    let updated: SavedAddress[];
    if (editingAddress) {
      updated = addresses.map(a =>
        a.id === editingAddress.id
          ? { ...a, label: formLabel.trim(), detail: formDetail.trim(), lat: formLat, lng: formLng }
          : a
      );
    } else {
      const newAddr: SavedAddress = {
        id: generateId(),
        label: formLabel.trim(),
        detail: formDetail.trim(),
        lat: formLat,
        lng: formLng,
      };
      updated = [...addresses, newAddr];
    }

    setAddresses(updated);
    await persist(updated);
    closeForm();
  };

  const deleteAddress = (id: string) => {
    Alert.alert('Hapus Alamat', 'Yakin mau hapus alamat ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          const updated = addresses.filter(a => a.id !== id);
          setAddresses(updated);
          await persist(updated);
        },
      },
    ]);
  };

  const handleMapConfirm = (lat: number, lng: number, address: string) => {
    setFormLat(lat);
    setFormLng(lng);
    if (!formDetail.trim() && address) setFormDetail(address);
    setShowMap(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.surfaceAlt }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Alamat Pengiriman</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: brand.primaryMuted }]}
          onPress={openAdd}
        >
          <MaterialIcons name="add" size={20} color={brand.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Form tambah / edit */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            <View style={styles.formHeader}>
              <MaterialIcons name={editingAddress ? 'edit-location' : 'add-location-alt'} size={20} color={brand.primary} />
              <Text style={[styles.formTitle, { color: C.text }]}>
                {editingAddress ? 'Edit Alamat' : 'Tambah Alamat Baru'}
              </Text>
              <TouchableOpacity onPress={closeForm}>
                <MaterialIcons name="close" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick label chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {LABEL_SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: formLabel === s ? brand.primary : 'transparent',
                        borderColor: formLabel === s ? brand.primary : C.border,
                      },
                    ]}
                    onPress={() => setFormLabel(s)}
                  >
                    <Text style={[styles.chipText, { color: formLabel === s ? '#fff' : C.textSecondary }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Label input */}
            <TextInput
              style={[styles.labelInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
              placeholder="Label (cth: Rumah, Kantor)"
              placeholderTextColor={C.textMuted}
              value={formLabel}
              onChangeText={setFormLabel}
            />

            {/* Detail alamat */}
            <TextInput
              style={[
                styles.detailInput,
                {
                  backgroundColor: C.surfaceAlt,
                  borderColor: detailFocused ? brand.primary : C.border,
                  color: C.text,
                },
              ]}
              placeholder="Jl. Mawar No. 5, Kel. Sukamaju, Kec. Coblong, Kota Bandung 40132"
              placeholderTextColor={C.textMuted}
              value={formDetail}
              onChangeText={setFormDetail}
              multiline
              textAlignVertical="top"
              onFocus={() => setDetailFocused(true)}
              onBlur={() => setDetailFocused(false)}
            />

            <Text style={[styles.hint, { color: C.textMuted }]}>
              💡 Isi lengkap: nama jalan, nomor, kelurahan, kecamatan, kota & kode pos
            </Text>

            {/* Tombol peta */}
            <TouchableOpacity
              style={[styles.mapBtn, { borderColor: brand.primary + '60', backgroundColor: brand.primaryMuted }]}
              onPress={() => setShowMap(true)}
            >
              <MaterialIcons name="map" size={18} color={brand.primary} />
              <Text style={[styles.mapBtnText, { color: brand.primary }]}>
                {formLat && formLng ? '📍 Ubah Titik di Peta' : '📍 Pilih Titik dari Peta'}
              </Text>
            </TouchableOpacity>

            {/* Koordinat terpilih */}
            {formLat && formLng && (
              <View style={[styles.coordRow, { backgroundColor: brand.primaryMuted, borderColor: brand.primary + '40' }]}>
                <MaterialIcons name="location-on" size={16} color={brand.primary} />
                <Text style={[styles.coordText, { color: brand.primary }]}>
                  {formLat.toFixed(6)}, {formLng.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Tombol aksi */}
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: C.border }]}
                onPress={closeForm}
              >
                <Text style={[styles.cancelText, { color: C.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: brand.primary }]}
                onPress={saveAddress}
              >
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.saveText}>
                  {editingAddress ? 'Simpan Perubahan' : 'Simpan Alamat'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Daftar alamat */}
        {addresses.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={[styles.sectionLabel, { color: C.textMuted }]}>
              {addresses.length} Alamat Tersimpan
            </Text>
            {addresses.map((addr, index) => (
              <View
                key={addr.id}
                style={[styles.addrCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}
              >
                <View style={[styles.addrIconBg, { backgroundColor: brand.primaryMuted }]}>
                  <MaterialIcons
                    name={
                      addr.label.toLowerCase().includes('rumah') ? 'home' :
                      addr.label.toLowerCase().includes('kantor') ? 'business' :
                      addr.label.toLowerCase().includes('kos') ? 'hotel' : 'location-on'
                    }
                    size={20}
                    color={brand.primary}
                  />
                </View>

                <View style={styles.addrInfo}>
                  <View style={styles.addrLabelRow}>
                    <Text style={[styles.addrLabel, { color: C.text }]}>{addr.label}</Text>
                    {addr.lat && addr.lng && (
                      <View style={[styles.mapBadge, { backgroundColor: brand.primaryMuted }]}>
                        <MaterialIcons name="place" size={10} color={brand.primary} />
                        <Text style={[styles.mapBadgeText, { color: brand.primary }]}>GPS</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.addrDetail, { color: C.textSecondary }]} numberOfLines={2}>
                    {addr.detail}
                  </Text>
                </View>

                <View style={styles.addrActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: C.surfaceAlt }]}
                    onPress={() => openEdit(addr)}
                  >
                    <MaterialIcons name="edit" size={16} color={C.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => deleteAddress(addr.id)}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          !showForm && (
            <View style={styles.emptyWrapper}>
              <View style={[styles.emptyIconBg, { backgroundColor: brand.primaryMuted }]}>
                <MaterialIcons name="location-off" size={40} color={brand.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>Belum Ada Alamat</Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                Tambahkan alamat pengirimanmu agar proses belanja lebih mudah.
              </Text>
              <TouchableOpacity
                style={[styles.addFirstBtn, { backgroundColor: brand.primary }]}
                onPress={openAdd}
              >
                <MaterialIcons name="add-location-alt" size={18} color="#fff" />
                <Text style={styles.addFirstBtnText}>Tambah Alamat Pertama</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* FAB-like tombol tambah (jika sudah ada alamat & form tidak terbuka) */}
        {addresses.length > 0 && !showForm && (
          <TouchableOpacity
            style={[styles.addMoreBtn, { borderColor: brand.primary + '50', backgroundColor: brand.primaryMuted }]}
            onPress={openAdd}
          >
            <MaterialIcons name="add-location-alt" size={18} color={brand.primary} />
            <Text style={[styles.addMoreText, { color: brand.primary }]}>Tambah Alamat Baru</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={showMap}
        initialLat={formLat}
        initialLng={formLng}
        onConfirm={handleMapConfirm}
        onClose={() => setShowMap(false)}
        brand={brand}
        C={C}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Form
  formCard: {
    borderRadius: 20, padding: 18, gap: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  labelInput: {
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  detailInput: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, fontSize: 14, lineHeight: 22, minHeight: 90,
  },
  hint: { fontSize: 11, lineHeight: 16 },
  mapBtn: {
    borderRadius: 12, padding: 12, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mapBtnText: { fontSize: 13, fontWeight: '700' },
  coordRow: {
    borderRadius: 10, padding: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  coordText: { fontSize: 12, fontWeight: '600', flex: 1 },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderRadius: 12, padding: 13,
    alignItems: 'center', borderWidth: 1.5,
  },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flex: 2, borderRadius: 12, padding: 13,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // List
  sectionLabel: {
    fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  listSection: { gap: 12 },
  addrCard: {
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  addrIconBg: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  addrInfo: { flex: 1, gap: 4 },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrLabel: { fontSize: 14, fontWeight: '800' },
  mapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  mapBadgeText: { fontSize: 9, fontWeight: '800' },
  addrDetail: { fontSize: 12, lineHeight: 18 },
  addrActions: { gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty
  emptyWrapper: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyIconBg: {
    width: 88, height: 88, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  addFirstBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8,
  },
  addFirstBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Add more
  addMoreBtn: {
    borderRadius: 14, padding: 14, borderWidth: 1.5,
    borderStyle: 'dashed', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addMoreText: { fontSize: 14, fontWeight: '700' },
});