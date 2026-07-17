import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, StatusBar, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { authAPI, saveToken, saveUser, clearSession, getUser } from '@/services/api';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';

type Mode = 'login' | 'register';
type UserInfo = { name: string; role: string; email?: string };

// Nomor WhatsApp yang akan dihubungi (ganti dengan nomor aktif)
const WA_NUMBER = '6281234567890'; // Format: 62XXXXXXXXXX (tanpa tanda +)
const WA_MESSAGE = 'Halo, saya butuh bantuan dengan aplikasi GreenMart.';

export default function LoginScreen() {
  const { C, brand, scheme } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showPass, setShowPass] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    getUser().then((u) => { setUserInfo(u); setCheckingAuth(false); });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Oops!', 'Email dan password wajib diisi.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const { token } = res.data;
      await saveToken(token);
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user = { name: payload.name, role: payload.role, email };
      await saveUser(user);
      setUserInfo(user);
      setEmail(''); setPassword('');
    } catch (e: any) {
      Alert.alert('Login Gagal', e.response?.data?.error ?? 'Periksa email & password kamu.');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !whatsapp) { Alert.alert('Lengkapi Data', 'Semua kolom wajib diisi.'); return; }
    if (password.length < 6) { Alert.alert('Password Lemah', 'Password minimal 6 karakter.'); return; }
    setLoading(true);
    try {
      await authAPI.register(name, email, password, whatsapp);
      Alert.alert('🎉 Daftar Berhasil', 'Akun berhasil dibuat. Silakan login!', [
        { text: 'Login Sekarang', onPress: () => switchMode('login') },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal Daftar', e.response?.data?.error ?? 'Terjadi kesalahan.');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Yakin mau logout?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await clearSession(); setUserInfo(null); } },
    ]);
  };

  const handleContactWA = () => {
    const url = `whatsapp://send?phone=${WA_NUMBER}&text=${encodeURIComponent(WA_MESSAGE)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback ke web WhatsApp
        Linking.openURL(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`);
      }
    });
  };

  const switchMode = (m: Mode) => {
    setMode(m); setName(''); setEmail(''); setPassword(''); setWhatsapp('');
  };

  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator color={brand.primary} size="large" />
      </SafeAreaView>
    );
  }

  // ─── Sudah login: tampilan profil ─────────────────────────────────────────
  if (userInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={styles.profileContent}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: brand.primary, shadowColor: brand.primary }]}>
              <Text style={styles.avatarText}>
                {userInfo.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: C.text }]}>{userInfo.name}</Text>
            <Text style={[styles.profileEmail, { color: C.textSecondary }]}>{userInfo.email ?? ''}</Text>
            <View style={[styles.roleBadge, { backgroundColor: brand.primaryMuted }]}>
              <Text style={[styles.roleText, { color: brand.primary }]}>{userInfo.role}</Text>
            </View>
          </View>

          {/* Menu */}
          <View style={[styles.menuCard, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            <Text style={[styles.menuTitle, { color: C.textMuted }]}>AKUN SAYA</Text>

            {/* Ubah Password */}
            <MenuRow
              icon="lock-outline"
              label="Ubah Password"
              C={C}
              onPress={() => router.push('/(tabs)/change-password' as any)}
            />

            {/* Keranjang Belanja */}
            <MenuRow
              icon="shopping-cart"
              label="Keranjang Belanja"
              C={C}
              onPress={() => router.push('/cart')}
            />

            {/* Alamat Pengiriman */}
            <MenuRow
              icon="location-on"
              label="Alamat Pengiriman"
              C={C}
              onPress={() => router.push('/(tabs)/addresses' as any)}
            />

            {/* Hubungi Kami via WhatsApp */}
            <MenuRow
              icon="support-agent"
              label="Hubungi Kami"
              subtitle="Chat via WhatsApp"
              C={C}
              onPress={handleContactWA}
              last
              accentColor="#25D366"
            />
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: C.error + '50' }]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={18} color={C.error} />
            <Text style={[styles.logoutText, { color: C.error }]}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Belum login: form login/register ─────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={styles.logoMark}>🌿</Text>
            <Text style={[styles.formTitle, { color: C.text }]}>
              {mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Baru'}
            </Text>
            <Text style={[styles.formSubtitle, { color: C.textSecondary }]}>
              {mode === 'login' ? 'Selamat datang kembali!' : 'Daftar dan mulai belanja'}
            </Text>
          </View>

          {/* Toggle tab */}
          <View style={[styles.modeToggle, { backgroundColor: C.surfaceAlt }]}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, mode === m && [styles.modeTabActive, { backgroundColor: C.surface }]]}
                onPress={() => switchMode(m)}
              >
                <Text style={[styles.modeTabText, { color: mode === m ? C.text : C.textMuted },
                  mode === m && { fontWeight: '800' }]}>
                  {m === 'login' ? 'Masuk' : 'Daftar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card form */}
          <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            {mode === 'register' && (
              <Field label="Nama Lengkap" icon="person" value={name}
                onChangeText={setName} placeholder="Nama kamu" C={C} />
            )}
            <Field label="Email" icon="email" value={email}
              onChangeText={setEmail} placeholder="contoh@email.com"
              keyboardType="email-address" autoCapitalize="none" C={C} />
            {mode === 'register' && (
              <Field label="No. WhatsApp" icon="phone" value={whatsapp}
                onChangeText={setWhatsapp} placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad" C={C} />
            )}

            {/* Password field */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Password</Text>
              <View style={[styles.passwordRow, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <MaterialIcons name="lock" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.passInput, { color: C.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 karakter"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: brand.primary, shadowColor: brand.primary },
                loading && styles.submitBtnDisabled]}
              onPress={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitText}>
                    {mode === 'login' ? 'Masuk Sekarang' : 'Buat Akun'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-komponen ──────────────────────────────────────────────────────────────
function Field({ label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize, C }: any) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
        <MaterialIcons name={icon} size={18} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.inputInner, { color: C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'words'}
        />
      </View>
    </View>
  );
}

function MenuRow({ icon, label, subtitle, onPress, C, last, accentColor }: any) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && { borderBottomWidth: 1, borderBottomColor: C.borderLight }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={22} color={accentColor ?? C.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuRowLabel, { color: C.text }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.menuRowSub, { color: accentColor ?? C.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={C.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileContent: { padding: 24, gap: 20 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  profileEmail: { fontSize: 14 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4, marginTop: 4 },
  roleText: { fontWeight: '700', fontSize: 12 },
  menuCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  menuTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
    padding: 16, paddingBottom: 8,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuRowLabel: { fontSize: 15, fontWeight: '600' },
  menuRowSub: { fontSize: 11, marginTop: 1, fontWeight: '500' },
  logoutBtn: {
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  logoutText: { fontWeight: '700', fontSize: 15 },
  formContent: { padding: 24, gap: 20, paddingBottom: 60 },
  formHeader: { alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 4 },
  logoMark: { fontSize: 48 },
  formTitle: { fontSize: 24, fontWeight: '800' },
  formSubtitle: { fontSize: 14 },
  modeToggle: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  modeTabActive: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  modeTabText: { fontSize: 14, fontWeight: '600' },
  card: {
    borderRadius: 20, padding: 20, gap: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  fieldWrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5,
  },
  inputInner: { flex: 1, fontSize: 14, padding: 0 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5,
  },
  passInput: { flex: 1, fontSize: 14, padding: 0 },
  submitBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});