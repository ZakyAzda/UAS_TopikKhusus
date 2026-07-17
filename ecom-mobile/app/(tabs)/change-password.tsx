import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';

export default function ChangePasswordScreen() {
  const { C, brand, scheme } = useTheme();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lengkapi Data', 'Semua kolom wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Password Terlalu Pendek', 'Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Tidak Cocok', 'Konfirmasi password tidak sesuai.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Password Sama', 'Password baru tidak boleh sama dengan password lama.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('✅ Berhasil!', 'Password kamu berhasil diubah. Silakan login ulang.', [
        {
          text: 'OK',
          onPress: async () => {
            await AsyncStorage.multiRemove(['token', 'user']);
            router.replace('/(tabs)/profile');
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal', e.response?.data?.error ?? 'Gagal mengubah password. Pastikan password lama benar.');
    } finally {
      setLoading(false);
    }
  };

  const strengthScore = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  };

  const score = strengthScore();
  const strengthLabel = ['', 'Lemah', 'Cukup', 'Sedang', 'Kuat', 'Sangat Kuat'][score];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#059669'][score];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.surfaceAlt }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Ubah Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Ilustrasi / Info */}
          <View style={[styles.infoCard, { backgroundColor: brand.primaryMuted }]}>
            <View style={[styles.lockIcon, { backgroundColor: brand.primary }]}>
              <MaterialIcons name="lock" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: brand.primary }]}>Keamanan Akun</Text>
              <Text style={[styles.infoSubtitle, { color: brand.primary + 'AA' }]}>
                Gunakan password yang kuat dan unik untuk melindungi akunmu.
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.shadow }]}>
            {/* Password Lama */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Password Saat Ini</Text>
              <View style={[styles.inputRow, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <MaterialIcons name="lock-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Masukkan password lama"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  <MaterialIcons name={showCurrent ? 'visibility-off' : 'visibility'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

            {/* Password Baru */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Password Baru</Text>
              <View style={[styles.inputRow, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
                <MaterialIcons name="lock" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min. 6 karakter"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <MaterialIcons name={showNew ? 'visibility-off' : 'visibility'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: i <= score ? strengthColor : C.borderLight },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
                </View>
              )}
            </View>

            {/* Konfirmasi Password */}
            <View style={styles.fieldWrapper}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Konfirmasi Password Baru</Text>
              <View style={[
                styles.inputRow,
                {
                  backgroundColor: C.surfaceAlt,
                  borderColor: confirmPassword && confirmPassword !== newPassword ? '#EF4444' : C.border,
                },
              ]}>
                <MaterialIcons name="verified-user" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Ulangi password baru"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <Text style={styles.errorText}>Password tidak cocok</Text>
              )}
              {confirmPassword.length > 0 && confirmPassword === newPassword && (
                <Text style={styles.successText}>✓ Password cocok</Text>
              )}
            </View>
          </View>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Text style={[styles.tipsTitle, { color: C.text }]}>💡 Tips Password Kuat</Text>
            {[
              'Minimal 10 karakter',
              'Kombinasi huruf besar dan kecil',
              'Tambahkan angka dan simbol',
              'Jangan pakai info pribadi',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: brand.primary }]} />
                <Text style={[styles.tipText, { color: C.textSecondary }]}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: brand.primary, shadowColor: brand.primary },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.submitText}>Simpan Password Baru</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  infoCard: {
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  lockIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  infoSubtitle: { fontSize: 12, lineHeight: 18 },

  card: {
    borderRadius: 20, padding: 20, gap: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
  },
  divider: { height: 1 },
  fieldWrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },

  strengthWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', minWidth: 70, textAlign: 'right' },

  errorText: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  successText: { fontSize: 12, color: '#10B981', marginTop: 2 },

  tipsCard: {
    borderRadius: 16, padding: 16, gap: 10, borderWidth: 1,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipText: { fontSize: 12, lineHeight: 18 },

  submitBtn: {
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});