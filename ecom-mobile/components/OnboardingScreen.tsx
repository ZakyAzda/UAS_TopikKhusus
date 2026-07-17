import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🛍️',
    title: 'Ribuan Produk\nSegar Untukmu',
    subtitle:
      'Temukan produk pilihan dari berbagai kategori. Kualitas terjamin, harga bersaing.',
    bg: Brand.primary,
    accent: Brand.primaryLight,
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'Belanja Cepat\n& Mudah',
    subtitle:
      'Tambah ke keranjang, checkout dalam hitungan detik. Pengalaman belanja yang menyenangkan.',
    bg: Brand.primaryDark,
    accent: Brand.primary,
  },
  {
    id: '3',
    emoji: '🚀',
    title: 'Pengiriman\nTepat Waktu',
    subtitle:
      'Lacak pesananmu secara real-time. Kami pastikan barang tiba dengan selamat di tanganmu.',
    bg: '#0F4526',
    accent: Brand.primaryLight,
  },
];

type Props = {
  onFinish: () => void;
};

export default function OnboardingScreen({ onFinish }: Props) {
  const { C } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Animasi untuk setiap slide
  const slideAnims = SLIDES.map(() => ({
    emoji: useRef(new Animated.Value(0)).current,
    title: useRef(new Animated.Value(30)).current,
    titleOpacity: useRef(new Animated.Value(0)).current,
    sub: useRef(new Animated.Value(20)).current,
    subOpacity: useRef(new Animated.Value(0)).current,
  }));

  const animateSlide = (index: number) => {
    const a = slideAnims[index];
    a.emoji.setValue(0);
    a.title.setValue(30);
    a.titleOpacity.setValue(0);
    a.sub.setValue(20);
    a.subOpacity.setValue(0);

    Animated.stagger(100, [
      Animated.spring(a.emoji, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(a.title, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(a.titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(a.sub, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(a.subOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  };

  // Animate slide pertama saat mount
  React.useEffect(() => { animateSlide(0); }, []);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next });
      setCurrentIndex(next);
      animateSlide(next);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onFinish();
  };

  const currentSlide = SLIDES[currentIndex];
  const anim = slideAnims[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: currentSlide.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item, index }) => {
          const a = slideAnims[index];
          return (
            <View style={styles.slide}>
              {/* Dekorasi lingkaran */}
              <View style={[styles.decoCircle1, { backgroundColor: item.accent, opacity: 0.25 }]} />
              <View style={[styles.decoCircle2, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

              {/* Emoji besar dengan animasi */}
              <Animated.View
                style={[
                  styles.emojiWrapper,
                  { transform: [{ scale: a.emoji }] },
                ]}
              >
                <View style={styles.emojiInner}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
                {/* Ring dekorasi */}
                <View style={[styles.emojiRing, { borderColor: 'rgba(255,255,255,0.2)' }]} />
              </Animated.View>

              {/* Teks */}
              <View style={styles.textBlock}>
                <Animated.Text
                  style={[
                    styles.title,
                    {
                      opacity: a.titleOpacity,
                      transform: [{ translateY: a.title }],
                    },
                  ]}
                >
                  {item.title}
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.subtitle,
                    {
                      opacity: a.subOpacity,
                      transform: [{ translateY: a.sub }],
                    },
                  ]}
                >
                  {item.subtitle}
                </Animated.Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom: dots + tombol */}
      <View style={styles.bottomBar}>
        {/* Dots indicator */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const isActive = i === currentIndex;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Tombol next / mulai */}
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Mulai Belanja 🛒' : 'Lanjut →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  skipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },

  // Slide
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 160,
  },
  decoCircle1: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    top: -width * 0.2,
    right: -width * 0.25,
  },
  decoCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 100,
    left: -40,
  },

  // Emoji
  emojiWrapper: {
    position: 'relative',
    marginBottom: 48,
  },
  emojiInner: {
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  emoji: {
    fontSize: 68,
  },
  emojiRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 46,
    borderWidth: 2,
    top: -10,
    left: -10,
  },

  // Teks
  textBlock: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    maxWidth: 300,
  },

  // Bottom
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 24,
    gap: 28,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  nextBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  nextBtnText: {
    color: Brand.primary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});