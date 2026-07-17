import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { productAPI, cartAPI, BASE_URL } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';

// Import komponen & styles dari folder home yang baru lu bikin
import HomeHeader from '@/components/home/HomeHeader';
import { styles } from '@/components/home/home.styles';

type Category = { ID: number; name: string };
type Product = { ID: number; name: string; price: number; image_url: string; stock: number; category?: { name: string } };

export default function HomeScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();

  const [products, setProducts]         = useState<Product[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [search, setSearch]             = useState('');
  const [selectedCat, setSelectedCat]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [cartCount, setCartCount]       = useState(0);
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [wishlist, setWishlist]         = useState<Set<number>>(new Set());
  const [activeBanner, setActiveBanner] = useState(0);

  const bannerRef = useRef<FlatList<any>>(null) as React.RefObject<FlatList<any>>;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner(prev => {
        const next = (prev + 1) % 3; // 3 is length of banners
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = useCallback(async (q = search, cat = selectedCat) => {
    try {
      const res = await productAPI.getAll(q || undefined, cat || undefined);
      setProducts(res.data);
    } catch (err) { console.log('Error fetch products', err); }
  }, []);

  const fetchCartCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await cartAPI.getMyCart();
      setCartCount(res.data?.data?.length ?? 0);
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
      const res = await productAPI.getCategories().catch(() => ({ data: [] }));
      setCategories(res.data);
      await Promise.all([fetchProducts(), fetchCartCount()]);
      setLoading(false);
    };
    init();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchCartCount()]);
    setRefreshing(false);
  };

  const handleSearch = (text: string) => { setSearch(text); fetchProducts(text, selectedCat); };
  const handleCategory = (id: string) => { const next = selectedCat === id ? '' : id; setSelectedCat(next); fetchProducts(search, next); };
  
  const toggleWishlist = (id: number) => {
    setWishlist(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleAddToCart = async (product: Product) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.push('/profile'); return; }
    if (product.stock === 0) return;
    try { await cartAPI.addToCart(product.ID, 1); setCartCount((c) => c + 1); } 
    catch (e: any) { console.log("Gagal tambah:", e); }
  };

  const handleBuyNow = async (product: Product) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) { router.push('/profile'); return; }
  router.push({ 
    pathname: '/checkout', 
    params: { 
      product_id: product.ID, 
      qty: 1,
      quantity: 1,          // tambahkan ini
      total: String(product.price), // tambahkan ini
    } 
  } as any);
};

  const formatRupiah = (num: number) => 'Rp ' + num.toLocaleString('id-ID');
  const getImageUrl = (url: string) => {
    if (!url) return 'https://via.placeholder.com/150?text=No+Image';
    let finalUrl = url.replace('http://localhost:3000', BASE_URL).replace('https://localhost:3000', BASE_URL);
    return finalUrl.startsWith('http') ? finalUrl : `${BASE_URL}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
  };

  const renderProductItem = ({ item, index }: { item: Product; index: number }) => {
    const isNew = index < 2; const isLiked = wishlist.has(item.ID); const outOfStock = item.stock === 0;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.surface }]} activeOpacity={0.92}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.ID } } as any)}
      >
        <View style={styles.cardTopRow}>
          {isNew ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View> : <View />}
          <TouchableOpacity style={styles.heartBtn} onPress={() => toggleWishlist(item.ID)}>
            <MaterialIcons name={isLiked ? 'favorite' : 'favorite-border'} size={18} color={isLiked ? '#E91E63' : '#ccc'} />
          </TouchableOpacity>
        </View>

        <View style={[styles.imageContainer, { backgroundColor: C.surfaceAlt }]}>
          <Image source={{ uri: getImageUrl(item.image_url) }} style={styles.productImage} contentFit="cover" transition={500} />
          {outOfStock && <View style={styles.soldOutOverlay}><Text style={styles.soldOutText}>Habis</Text></View>}
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardPrice, { color: brand.primary }]}>{formatRupiah(item.price)}</Text>
          <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardUnit, { color: C.textMuted }]}>{item.category?.name || 'Sayuran'}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.buyBtn, { backgroundColor: outOfStock ? '#e0e0e0' : brand.primary }]}
              onPress={() => handleBuyNow(item)} disabled={outOfStock} activeOpacity={0.85}
            >
              <Text style={[styles.buyBtnText, { color: outOfStock ? '#aaa' : '#fff' }]}>{outOfStock ? 'Habis' : 'Beli'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cartIconBtn, { backgroundColor: outOfStock ? '#f5f5f5' : brand.primary + '15', borderColor: outOfStock ? '#e0e0e0' : brand.primary + '50' }]}
              onPress={() => handleAddToCart(item)} disabled={outOfStock} activeOpacity={0.8}
            >
              <MaterialIcons name="shopping-cart" size={16} color={outOfStock ? '#bbb' : brand.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={brand.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Menyiapkan kebun...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />
      <FlatList
        data={products} keyExtractor={item => `product-${item.ID}`} numColumns={2}
        columnWrapperStyle={styles.row} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[brand.primary]} />}
        ListHeaderComponent={
          <HomeHeader
            C={C} brand={brand} search={search} selectedCat={selectedCat} cartCount={cartCount} categories={categories}
            activeBanner={activeBanner} bannerRef={bannerRef}
            onCartPress={async () => {
              const token = await AsyncStorage.getItem('token');
              router.push(token ? '/cart' : '/profile');
            }}
            onSearch={handleSearch} onCategoryPress={handleCategory} onBannerChange={setActiveBanner}
          />
        }
        renderItem={renderProductItem}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MaterialIcons name="eco" size={64} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Produk Kosong</Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>Coba cari sayuran yang lain</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}