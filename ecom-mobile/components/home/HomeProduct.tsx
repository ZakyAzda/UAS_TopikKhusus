import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './home.styles';
import BannerSlider from './BannerSlider';

type Category = { ID: number; name: string };

const CATEGORY_ICONS: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; bg: string; color: string; }> = {
  default:  { icon: 'category',        bg: '#E8F5E9', color: '#4CAF50' },
  sayuran:  { icon: 'eco',             bg: '#E8F5E9', color: '#4CAF50' },
  buah:     { icon: 'local-florist',   bg: '#FCE4EC', color: '#E91E63' },
  minuman:  { icon: 'local-drink',     bg: '#FFF8E1', color: '#FFC107' },
  grocery:  { icon: 'shopping-basket', bg: '#E8EAF6', color: '#5C6BC0' },
  minyak:   { icon: 'opacity',         bg: '#FFF3E0', color: '#FF9800' },
  rempah:   { icon: 'spa',             bg: '#F3E5F5', color: '#9C27B0' },
};

function getCatStyle(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (key.includes(k)) return CATEGORY_ICONS[k];
  }
  return CATEGORY_ICONS.default;
}

type HomeHeaderProps = Readonly<{
  C: any; brand: any; search: string; selectedCat: string; cartCount: number; categories: Category[];
  activeBanner: number; bannerRef: React.RefObject<FlatList<any>>;
  onCartPress: () => void; onSearch: (text: string) => void;
  onCategoryPress: (id: string) => void; onBannerChange: (idx: number) => void;
}>;

export default function HomeHeader({
  C, brand, search, selectedCat, cartCount, categories,
  activeBanner, bannerRef, onCartPress, onSearch, onCategoryPress, onBannerChange,
}: HomeHeaderProps) {
  return (
    <View style={{ paddingBottom: 8 }}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.greetSmall, { color: C.textSecondary }]}>Good Morning 👋</Text>
          <Text style={[styles.greeting, { color: C.text }]}>Halo, Belanja apa hari ini?</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Sayuran hidroponik segar dari kebun</Text>
        </View>
        <TouchableOpacity style={[styles.cartBtn, { backgroundColor: C.surface }]} onPress={onCartPress}>
          <MaterialIcons name="shopping-bag" size={22} color={brand.primary} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: '#FF4444' }]}><Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchWrapper, { backgroundColor: C.surface }]}>
          <MaterialIcons name="search" size={20} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search keywords..." placeholderTextColor={C.textMuted}
            value={search} onChangeText={onSearch} returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')} style={{ padding: 4 }}><MaterialIcons name="close" size={16} color={C.textMuted} /></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, { backgroundColor: brand.primary }]}><MaterialIcons name="tune" size={20} color="#FFF" /></TouchableOpacity>
      </View>

      <BannerSlider activeBanner={activeBanner} primaryColor={brand.primary} bannerRef={bannerRef} onSlideChange={onBannerChange} />

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Categories</Text>
        <TouchableOpacity><Text style={[styles.seeAll, { color: brand.primary }]}>See all ›</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
        {[{ ID: 0, name: 'Semua' }, ...categories].map(cat => {
          const id = cat.ID === 0 ? '' : String(cat.ID);
          const active = selectedCat === id;
          const cs = getCatStyle(cat.name);
          return (
            <TouchableOpacity key={`cat-${cat.ID}`} style={styles.catItem} onPress={() => onCategoryPress(id)}>
              <View style={[styles.catCircle, { backgroundColor: active ? brand.primary : cs.bg, borderWidth: active ? 0 : 1.5, borderColor: active ? 'transparent' : cs.color + '33' }]}>
                <MaterialIcons name={cs.icon} size={24} color={active ? '#fff' : cs.color} />
              </View>
              <Text style={[styles.catText, { color: active ? brand.primary : C.textSecondary }]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.sectionRow, { marginTop: 10 }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Featured products</Text>
        <TouchableOpacity><Text style={[styles.seeAll, { color: brand.primary }]}>See all ›</Text></TouchableOpacity>
      </View>
    </View>
  );
}