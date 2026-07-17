import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
  brand: any;
  C: any;
};

const DEFAULT_REGION: Region = {
  latitude: -0.9471,      // Indonesia tengah
  longitude: 119.4221,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

export default function MapPickerModal({
  visible, initialLat, initialLng,
  onConfirm, onClose, brand, C,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [markerCoord, setMarkerCoord] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [reverseAddress, setReverseAddress] = useState('');

  // Reset marker saat modal dibuka ulang
  useEffect(() => {
    if (visible) {
      if (initialLat && initialLng) {
        setMarkerCoord({ lat: initialLat, lng: initialLng });
        doReverseGeocode(initialLat, initialLng);
      } else {
        setMarkerCoord(null);
        setReverseAddress('');
      }
    }
  }, [visible]);

  // Tap di peta → set marker
  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoord({ lat: latitude, lng: longitude });
    doReverseGeocode(latitude, longitude);
  };

  // Reverse geocode pakai expo-location (gratis, tanpa API key)
  const doReverseGeocode = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const parts = [r.street, r.district, r.subregion, r.city, r.region, r.postalCode]
          .filter(Boolean);
        setReverseAddress(parts.join(', '));
      }
    } catch {
      setReverseAddress('');
    }
  };

  // Deteksi lokasi saat ini
  const goToCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Izinkan akses lokasi untuk fitur ini.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;

      setMarkerCoord({ lat: latitude, lng: longitude });
      doReverseGeocode(latitude, longitude);

      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } catch {
      Alert.alert('Error', 'Gagal mendapatkan lokasi');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleConfirm = () => {
    if (!markerCoord) {
      Alert.alert('Pilih Lokasi', 'Tap di peta untuk menandai lokasi kamu');
      return;
    }
    onConfirm(markerCoord.lat, markerCoord.lng, reverseAddress);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialIcons name="close" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Pilih Lokasi</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hint */}
        <View style={[styles.hint, { backgroundColor: brand.primaryMuted }]}>
          <MaterialIcons name="touch-app" size={16} color={brand.primary} />
          <Text style={[styles.hintText, { color: brand.primary }]}>
            Tap di peta untuk menandai lokasi pengiriman
          </Text>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={
            initialLat && initialLng
              ? { latitude: initialLat, longitude: initialLng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
              : DEFAULT_REGION
          }
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {markerCoord && (
            <Marker
              coordinate={{ latitude: markerCoord.lat, longitude: markerCoord.lng }}
              title="Lokasi Pengiriman"
              description={reverseAddress || undefined}
              pinColor={brand.primary}
            />
          )}
        </MapView>

        {/* Tombol lokasi saat ini */}
        <TouchableOpacity
          style={[styles.myLocationBtn, { backgroundColor: C.surface, shadowColor: C.shadow }]}
          onPress={goToCurrentLocation}
          disabled={loadingLocation}
        >
          {loadingLocation
            ? <ActivityIndicator size="small" color={brand.primary} />
            : <MaterialIcons name="my-location" size={22} color={brand.primary} />
          }
        </TouchableOpacity>

        {/* Bottom panel */}
        <View style={[styles.bottomPanel, { backgroundColor: C.surface }]}>
          {markerCoord ? (
            <>
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={18} color={brand.primary} />
                <Text style={[styles.addressText, { color: C.text }]} numberOfLines={2}>
                  {reverseAddress || `${markerCoord.lat.toFixed(6)}, ${markerCoord.lng.toFixed(6)}`}
                </Text>
              </View>
              <Text style={[styles.coordText, { color: C.textMuted }]}>
                {markerCoord.lat.toFixed(6)}, {markerCoord.lng.toFixed(6)}
              </Text>
            </>
          ) : (
            <Text style={[styles.noLocationText, { color: C.textMuted }]}>
              Belum ada lokasi dipilih
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: markerCoord ? brand.primary : C.border },
            ]}
            onPress={handleConfirm}
            disabled={!markerCoord}
          >
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>Konfirmasi Lokasi</Text>
          </TouchableOpacity>
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
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  closeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },

  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  hintText: { fontSize: 13, fontWeight: '600' },

  map: { flex: 1 },

  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8,
  },

  bottomPanel: {
    padding: 20, paddingBottom: 36, gap: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12,
  },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  coordText: { fontSize: 11, marginLeft: 26 },
  noLocationText: { fontSize: 14, textAlign: 'center', marginVertical: 4 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 15, marginTop: 4,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});