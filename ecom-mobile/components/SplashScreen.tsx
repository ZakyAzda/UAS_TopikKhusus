import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Brand } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  // Animated values (semua tetap sama seperti sebelumnya)
  const logoScale     = useRef(new Animated.Value(0.3)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const textY         = useRef(new Animated.Value(20)).current;
  const tagOpacity    = useRef(new Animated.Value(0)).current;
  const circle1Scale  = useRef(new Animated.Value(0)).current;
  const circle2Scale  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // ✨ Tambahan: animasi khusus untuk foto logo
  const logoRotate    = useRef(new Animated.Value(0)).current;
  const logoPulse     = useRef(new Animated.Value(1)).current;
  const ringScale     = useRef(new Animated.Value(0.8)).current;
  const ringOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Lingkaran dekorasi muncul
      Animated.parallel([
        Animated.spring(circle1Scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(circle2Scale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true, delay: 150 } as any),
      ]),

      // 2. Logo muncul dengan spring + rotate masuk dari -15deg ke 0
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(logoRotate, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }), // ← rotate masuk
      ]),

      // 3. Ring pulse muncul setelah logo tampil
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.4, tension: 40, friction: 6, useNativeDriver: true }),
      ]),

      // 4. Teks nama app muncul slide up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
        // Ring fade out bersamaan
        Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),

      // 5. Tagline muncul
      Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),

      // 6. Tahan sebentar
      Animated.delay(800),

      // 7. Fade out seluruh screen
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());

    // ✨ Pulse logo berjalan terus (loop) selama splash tampil
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Rotate interpolation: dari -15deg masuk ke 0deg
  const rotateDeg = logoRotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={Brand.primary} />

      {/* Dekorasi lingkaran background — tidak berubah */}
      <Animated.View style={[styles.circle1, { transform: [{ scale: circle1Scale }] }]} />
      <Animated.View style={[styles.circle2, { transform: [{ scale: circle2Scale }] }]} />
      <View style={styles.circle3} />

      <View style={styles.content}>

        {/* Wrapper logo dengan ring pulse di belakang */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity:   logoOpacity,
              transform: [
                { scale:   logoScale },
                { rotate:  rotateDeg },  // ← rotate masuk
              ],
            },
          ]}
        >
          {/* ✨ Ring pulse — lingkaran yang memancar di belakang logo */}
          <Animated.View
            style={[
              styles.logoRing,
              {
                opacity:   ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />

          {/* ✨ Foto logo dengan pulse scale */}
          <Animated.Image
            source={require('@/assets/uploads/logo.png')} // ← sesuaikan path logo kamu
            style={[
              styles.logoImage,
              { transform: [{ scale: logoPulse }] }, // ← pulse
            ]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Nama app — tidak berubah */}
        <Animated.Text
          style={[
            styles.appName,
            {
              opacity:   textOpacity,
              transform: [{ translateY: textY }],
            },
          ]}
        >
          Sayur On Delivery
        </Animated.Text>

        {/* Tagline — tidak berubah */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Beli sayur tidak harus dari pasar
        </Animated.Text>
      </View>

      {/* Loading dots — tidak berubah */}
      <Animated.View style={[styles.dotsWrapper, { opacity: tagOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}

// LoadingDots — tidak berubah sama sekali
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, []);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // Dekorasi — tidak berubah
  circle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: Brand.primaryLight,
    opacity: 0.3,
    top: -width * 0.25,
    right: -width * 0.2,
  },
  circle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: Brand.primaryDark,
    opacity: 0.4,
    bottom: -width * 0.1,
    left: -width * 0.15,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: height * 0.2,
    right: 40,
  },

  // Konten
  content: {
    alignItems: 'center',
    gap: 12,
  },

  // ✨ Wrapper logo — ukuran disesuaikan untuk foto
  logoWrapper: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  // ✨ Ring pulse di belakang logo
  logoRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  // ✨ Foto logo
  logoImage: {
    width: 240,
    height: 240,
    borderRadius: 24,   // ← hapus kalau logo sudah punya shape sendiri
  },

  // Teks — tidak berubah
  appName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Loading dots — tidak berubah
  dotsWrapper: {
    position: 'absolute',
    bottom: 60,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});