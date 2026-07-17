import React from 'react';
import { View, Text, Image, FlatList } from 'react-native';
import { styles, BANNER_WIDTH } from './home.styles';

const BANNERS = [
  { id: 'banner-1', image: require('@/assets/uploads/about5.jpg'), tag: 'PROMO', tagColor: '#FF7043', title: 'PEMBELIAN PERTAMA \n DISKON 10%', sub: 'Sayuran hidroponik segar dari kebun' },
  { id: 'banner-2', image: require('@/assets/uploads/about2.jpg'), tag: 'NEW ARRIVAL', tagColor: '#1565C0', title: 'Produk segar\ntiba setiap hari', sub: 'ayo ke kebun hydroponik kami' },
  { id: 'banner-3', image: require('@/assets/uploads/hero1.jpg'), tag: 'GRATIS ONGKIR', tagColor: '#6A1B9A', title: 'Belanja di atas\nRp 10.000', sub: 'Gratis ongkos kirim di dalam kota' },
];

type BannerSliderProps = Readonly<{
  activeBanner: number;
  primaryColor: string;
  bannerRef: React.RefObject<FlatList<any>>;
  onSlideChange: (idx: number) => void;
}>;

export default function BannerSlider({ activeBanner, primaryColor, bannerRef, onSlideChange }: BannerSliderProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <FlatList
        ref={bannerRef}
        data={BANNERS}
        keyExtractor={b => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
          onSlideChange(Math.min(idx, BANNERS.length - 1));
        }}
        renderItem={({ item: b }) => (
          <View style={[styles.bannerCard, { width: BANNER_WIDTH }]}>
            <Image source={b.image} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <View style={[styles.promoTag, { backgroundColor: b.tagColor }]}><Text style={styles.promoTagText}>{b.tag}</Text></View>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSub}>{b.sub}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.dotRow}>
        {BANNERS.map((b, i) => (
          <View key={b.id} style={[styles.dot, { width: i === activeBanner ? 20 : 6, backgroundColor: i === activeBanner ? primaryColor : '#ccc' }]} />
        ))}
      </View>
    </View>
  );
}