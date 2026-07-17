import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { BASE_URL } from '@/services/api';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ✅ Tipe data disesuaikan dengan kolom di database PostgreSQL kamu (image_url)
export type Product = {
  ID: number;
  name: string;
  price: number;
  image_url: string; // <-- Menggunakan snake_case sesuai kolom di database
  stock: number;
  category?: { name: string };
  description?: string;
};

type Props = {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart: (product: Product) => void;
};

export function formatRupiah(num: number) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * ✅ Fungsi untuk menyambungkan BASE_URL dengan path gambar dari backend.
 * Backend Go menggunakan app.Static("/uploads", "./uploads")
 */
function getImageUrl(url: string | undefined) {
  if (!url) return null;
  
  url = url.replace('http://localhost:3000', BASE_URL).replace('https://localhost:3000', BASE_URL);
  // Jika URL sudah berupa link lengkap (http...), langsung kembalikan
  if (url.startsWith('http')) return url;
  
  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  
  // Karena di DB kamu isinya sudah "uploads/nama_file.jpg", 
  // kita cukup memastikan ada tanda "/" di depannya.
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBaseUrl}${cleanPath}`;
}

export default function ProductCard({ product, onPress, onAddToCart }: Props) {
  const { C, brand } = useTheme();
  
  // ✅ Mengambil URL gambar berdasarkan field image_url
  const imageUri = getImageUrl(product.image_url);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow }]}
      activeOpacity={0.92}
      onPress={() => onPress(product)}
    >
      {/* Container Gambar */}
      <View style={[styles.imageWrapper, { backgroundColor: C.surfaceAlt }]}>
        {imageUri ? (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.image} 
            contentFit="cover"
            transition={500}
            key={imageUri} // Memaksa re-render jika URI berubah
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}

        {/* Badge Stok Habis */}
        {product.stock === 0 && (
          <View style={[styles.soldOutBadge, { backgroundColor: C.error }]}>
            <Text style={styles.badgeText}>Habis</Text>
          </View>
        )}

        {/* Badge Kategori */}
        {product.category?.name && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {product.category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Info Produk */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.price, { color: brand.primary }]}>
          {formatRupiah(product.price)}
        </Text>

        {/* Tombol Keranjang */}
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: product.stock === 0 ? C.textMuted : brand.primary },
          ]}
          onPress={() => onAddToCart(product)}
          disabled={product.stock === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>
            {product.stock === 0 ? 'Stok Habis' : '+ Keranjang'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: CARD_WIDTH,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 36 },
  soldOutBadge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  categoryBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: '80%',
  },
  categoryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  info: { padding: 12, gap: 4 },
  name: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 2 },
  price: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  addBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});