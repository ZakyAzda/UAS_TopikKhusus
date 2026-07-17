import { Tabs, usePathname } from 'expo-router';
import { Platform, View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import React, { useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab yang tampil di navbar bawah
const VISIBLE_TABS = ['index', 'detect', 'order', 'profile'];

function TabBarItem({ state, descriptors, route, index, navigation, C }: any) {
  const isFocused = state.index === index;
  const activeAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeAnim, {
      toValue: isFocused ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true });
    }
  };

  let iconName = 'help-outline';
  if (route.name === 'index')   iconName = 'home';
  if (route.name === 'order')   iconName = 'shopping-bag';
  if (route.name === 'profile') iconName = 'person-outline';
  if (route.name === 'detect')  iconName = 'camera';

  const translateY = activeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const bgColor    = activeAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', Brand.primary] });
  const bColor     = activeAnim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', C.surface] });
  const shadowOpacityAnim = activeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.tabItem}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={StyleSheet.absoluteFillObject}>
        <View style={styles.tabItemContent}>
          <Animated.View style={[
            styles.iconWrapper,
            {
              transform: [{ translateY }],
              backgroundColor: bgColor,
              borderColor: bColor,
              shadowOpacity: shadowOpacityAnim,
              elevation: isFocused ? 8 : 0,
            }
          ]}>
            <MaterialIcons
              name={iconName as any}
              size={isFocused ? 28 : 26}
              color={isFocused ? '#FFF' : C.textMuted}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation, C }: any) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Sembunyikan navbar saat di halaman detect
  const hideOnRoutes = ['detect'];
  const currentRoute = state.routes[state.index];
  const shouldHide = hideOnRoutes.includes(currentRoute.name);

  // Juga sembunyikan kalau bukan salah satu dari VISIBLE_TABS
  const showTabBar = VISIBLE_TABS.includes(currentRoute.name);

  if (!showTabBar || shouldHide) return null;

  const visibleRoutes = state.routes
    .filter((route: any) => VISIBLE_TABS.includes(route.name))
    .sort((a: any, b: any) => VISIBLE_TABS.indexOf(a.name) - VISIBLE_TABS.indexOf(b.name));

  const bottomPosition = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 20;

  return (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: C.surface,
        bottom: bottomPosition,
        height: 70,
      }
    ]}>
      {visibleRoutes.map((route: any) => {
        const originalIndex = state.routes.findIndex((r: any) => r.key === route.key);
        return (
          <TabBarItem
            key={route.key}
            state={state}
            descriptors={descriptors}
            route={route}
            index={originalIndex}
            navigation={navigation}
            C={C}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { C } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} C={C} />}
      screenOptions={{ headerShown: false }}
    >
      {/* ── Tab utama (tampil di navbar) ── */}
      <Tabs.Screen name="index"   options={{ title: 'Beranda' }} />
      <Tabs.Screen name="order"   options={{ title: 'Pesanan' }} />
      <Tabs.Screen name="profile" options={{ title: 'Akun' }} />
      <Tabs.Screen name="detect"  options={{ title: 'Deteksi' }} />
      {/* ── Screen tanpa navbar ── */}
      <Tabs.Screen name="cart"         options={{ href: null }} />
      <Tabs.Screen name="checkout"     options={{ href: null }} />
      <Tabs.Screen name="explore"      options={{ href: null }} />
      <Tabs.Screen name="login"        options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders"       options={{ href: null }} />
      <Tabs.Screen name="addresses"    options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 35,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tabItem: {
    flex: 1,
    height: '100%',
  },
  tabItemContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
});