import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import SplashScreen from '@/components/SplashScreen';
import OnboardingScreen from '@/components/OnboardingScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

type AppState = 'splash' | 'onboarding' | 'app';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appState, setAppState] = useState<AppState>('splash');

  // Cek apakah onboarding sudah pernah dilihat
  const checkOnboarding = async () => {
    const done = await AsyncStorage.getItem('onboarding_done');
    if (done === 'true') {
      setAppState('app');   // Langsung ke app
    } else {
      setAppState('onboarding'); // Tampilkan onboarding dulu
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        {/* ── Layer 1: App utama (selalu di-render di bawah) ── */}
        {appState === 'app' && (
          <Stack screenOptions={{ animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
            <Stack.Screen name="cart"          options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]"  options={{ headerShown: false }} />
            <Stack.Screen name="checkout"      options={{ headerShown: false }} />
            <Stack.Screen name="modal"         options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        )}

        {/* ── Layer 2: Onboarding (di atas app) ── */}
        {appState === 'onboarding' && (
          <OnboardingScreen onFinish={() => setAppState('app')} />
        )}

        {/* ── Layer 3: Splash screen (paling atas) ── */}
        {appState === 'splash' && (
          <SplashScreen onFinish={checkOnboarding} />
        )}
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}