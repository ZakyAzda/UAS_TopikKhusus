import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Animated,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { productAPI, cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah, Product } from '@/components/ProductCard';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Animasi
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;
  const scaleAnim  = useRef(new Animated.Value(0.95)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);

      try {
        const res = await productAPI.getOne(Number(id));
        setProduct(res.data?.data ?? res.data);
      } catch {
        Alert.alert('Error', 'Produk tidak ditemukan');
        router.back();
      } finally {
        setLoading(false);
        // Animasi masuk
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
      }
    };
    init();
  }, [id]);

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      Alert.alert('Belum Login', 'Login dulu untuk menambahkan ke keranjang 🛒', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(tabs)/login' as any) },
      ]);
      return;
    }
    if (!product) return;

    // Animasi tombol getar
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();

    setAddingToCart(true);
    try {
      await cartAPI.addToCart(product.ID, quantity);
      Alert.alert('✅ Berhasil!', `${product.name} (x${quantity}) masuk keranjang!`, [
        { text: 'Lanjut Belanja', style: 'cancel' },
        { text: 'Lihat Keranjang', onPress: () => router.push('/cart') },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error ?? 'Gagal tambah ke keranjang');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
  if (!isLoggedIn) {
    Alert.alert('Belum Login', 'Login dulu untuk membeli 🛒', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Login', onPress: () => router.push('/(tabs)/login' as any) },
    ]);
    return;
  }
  if (!product) return;
  router.push({
    pathname: '/checkout',
    params: { 
      product_id: product.ID, 
      quantity,
      total: String(product.price * quantity), // tambahkan ini
    },
  } as any);
};

  if (loading) return (
    <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
      <ActivityIndicator size="large" color={brand.primary} />
    </SafeAreaView>
  );

  if (!product) return null;

  let imageUri = product.image_url || '';
  imageUri = imageUri.replace('http://localhost:3000', BASE_URL).replace('https://localhost:3000', BASE_URL);
  if (!imageUri.startsWith('http') && imageUri !== '') {
    imageUri = `${BASE_URL}${imageUri.startsWith('/') ? '' : '/'}${imageUri}`;
  }

  const isOutOfStock = product.stock === 0;
  const maxQty = Math.min(product.stock, 99);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header transparan di atas gambar */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.surface }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.surface }]}
          onPress={() => router.push('/cart')}
        >
          <MaterialIcons name="shopping-cart" size={20} color={brand.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gambar produk */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={[styles.imageWrapper, { backgroundColor: C.surfaceAlt }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={500} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={{ fontSize: 64 }}>📦</Text>
              </View>
            )}

            {/* Badge stok habis */}
            {isOutOfStock && (
              <View style={[styles.outOfStockOverlay]}>
                <Text style={styles.outOfStockText}>Stok Habis</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Info produk */}
        <Animated.View
          style={[
            styles.infoCard,
            { backgroundColor: C.surface },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Kategori + nama */}
          {product.category?.name && (
            <View style={[styles.categoryChip, { backgroundColor: brand.primaryMuted }]}>
              <Text style={[styles.categoryText, { color: brand.primary }]}>
                {product.category.name}
              </Text>
            </View>
          )}

          <Text style={[styles.productName, { color: C.text }]}>{product.name}</Text>

          {/* Harga & stok */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: brand.primary }]}>
              {formatRupiah(product.price)}
            </Text>
            <View style={[
              styles.stockBadge,
              { backgroundColor: isOutOfStock ? '#FEE2E2' : '#D1FAE5' },
            ]}>
              <View style={[
                styles.stockDot,
                { backgroundColor: isOutOfStock ? '#EF4444' : '#10B981' },
              ]} />
              <Text style={[
                styles.stockText,
                { color: isOutOfStock ? '#DC2626' : '#059669' },
              ]}>
                {isOutOfStock ? 'Habis' : `${product.stock} tersisa`}
              </Text>
            </View>
          </View>

          {/* Quantity selector */}
          {!isOutOfStock && (
            <View style={styles.qtySection}>
              <Text style={[styles.qtyLabel, { color: C.textSecondary }]}>Jumlah</Text>
              <View style={[styles.qtySelector, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.35 }]}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <MaterialIcons name="remove" size={18} color={C.text} />
                </TouchableOpacity>

                <Text style={[styles.qtyValue, { color: C.text }]}>{quantity}</Text>

                <TouchableOpacity
                  style={[styles.qtyBtn, quantity >= maxQty && { opacity: 0.35 }]}
                  onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                >
                  <MaterialIcons name="add" size={18} color={C.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Subtotal */}
          {!isOutOfStock && (
            <View style={[styles.subtotalRow, { borderColor: C.borderLight }]}>
              <Text style={[styles.subtotalLabel, { color: C.textMuted }]}>Subtotal</Text>
              <Text style={[styles.subtotalAmount, { color: C.text }]}>
                {formatRupiah(product.price * quantity)}
              </Text>
            </View>
          )}

          {/* Deskripsi */}
          {product.description && (
            <View style={styles.descSection}>
              <Text style={[styles.descTitle, { color: C.text }]}>Deskripsi Produk</Text>
              <Text style={[styles.descText, { color: C.textSecondary }]}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Info tambahan */}
          <View style={[styles.infoGrid, { borderColor: C.borderLight }]}>
            {[
              { icon: 'local-shipping', label: 'Pengiriman', value: 'Gratis ongkir' },
              { icon: 'verified-user', label: 'Garansi', value: 'Produk asli' },
              { icon: 'replay', label: 'Pengembalian', value: '7 hari' },
            ].map((info, i) => (
              <View key={i} style={styles.infoItem}>
                <MaterialIcons name={info.icon as any} size={22} color={brand.primary} />
                <Text style={[styles.infoLabel, { color: C.textMuted }]}>{info.label}</Text>
                <Text style={[styles.infoValue, { color: C.text }]}>{info.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom action bar */}
      <Animated.View
        style={[
          styles.actionBar,
          { backgroundColor: C.surface, borderTopColor: C.border },
          { opacity: fadeAnim },
        ]}
      >
        {/* Tombol keranjang */}
        <Animated.View style={{ transform: [{ scale: btnScale }], flex: 1 }}>
          <TouchableOpacity
            style={[
              styles.cartBtn,
              { borderColor: brand.primary },
              isOutOfStock && { borderColor: C.border, opacity: 0.5 },
            ]}
            onPress={handleAddToCart}
            disabled={isOutOfStock || addingToCart}
            activeOpacity={0.85}
          >
            {addingToCart
              ? <ActivityIndicator color={brand.primary} size="small" />
              : <>
                  <MaterialIcons name="add-shopping-cart" size={20} color={brand.primary} />
                  <Text style={[styles.cartBtnText, { color: brand.primary }]}>Keranjang</Text>
                </>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* Tombol beli langsung */}
        <TouchableOpacity
          style={[
            styles.buyBtn,
            { backgroundColor: brand.primary, shadowColor: brand.primary },
            isOutOfStock && { backgroundColor: C.textMuted, shadowColor: 'transparent' },
          ]}
          onPress={handleBuyNow}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Text style={styles.buyBtnText}>
            {isOutOfStock ? 'Stok Habis' : 'Beli Sekarang'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  floatingHeader: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  // Gambar
  imageWrapper: {
    width,
    height: width * 0.9,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Info card
  infoCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: { fontSize: 12, fontWeight: '700' },
  productName: { fontSize: 22, fontWeight: '800', lineHeight: 30 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 26, fontWeight: '900' },
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  stockDot: { width: 7, height: 7, borderRadius: 3.5 },
  stockText: { fontSize: 12, fontWeight: '700' },

  // Qty
  qtySection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  qtyLabel: { fontSize: 15, fontWeight: '600' },
  qtySelector: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1.5, overflow: 'hidden',
  },
  qtyBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  qtyValue: {
    width: 40, textAlign: 'center', fontSize: 16, fontWeight: '800',
  },

  // Subtotal
  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, paddingTop: 14,
  },
  subtotalLabel: { fontSize: 14, fontWeight: '500' },
  subtotalAmount: { fontSize: 20, fontWeight: '900' },

  // Deskripsi
  descSection: { gap: 8 },
  descTitle: { fontSize: 16, fontWeight: '700' },
  descText: { fontSize: 14, lineHeight: 22 },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    justifyContent: 'space-around',
  },
  infoItem: { alignItems: 'center', gap: 4, flex: 1 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Action bar
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    padding: 16, paddingBottom: 32,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  cartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 14,
    borderWidth: 2,
  },
  cartBtnText: { fontSize: 14, fontWeight: '800' },
  buyBtn: {
    flex: 1.6, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});