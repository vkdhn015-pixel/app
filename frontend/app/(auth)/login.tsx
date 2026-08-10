import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) { setError('Enter a valid mobile number'); return; }
    setLoading(true);
    try {
      const full = `+91${digits.slice(-10)}`;
      const res = await api.sendOtp(full);
      router.push({ pathname: '/(auth)/otp', params: { phone: full, devOtp: res?.otp || '' } });
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.top}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/brand/logo.png')} style={styles.logoImg} resizeMode="contain" />
            <View>
              <Text style={styles.brand}>VILLAN 11</Text>
              <Text style={styles.brandTag}>PREMIUM GAMING</Text>
            </View>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your mobile number to continue</Text>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
            <TextInput
              testID="login-phone-input"
              placeholder="98765 43210"
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              style={[inputStyle.base, { flex: 1 }]}
              placeholderTextColor={colors.onSurfaceMuted}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: spacing.lg }} />
          <PrimaryButton testID="login-send-otp-button" label="Send OTP" onPress={submit} loading={loading} />
          <Text style={styles.terms}>By continuing you agree to our Terms of Use and Privacy Policy.</Text>
        </View>
        <Pressable testID="admin-link" onPress={() => router.push('/admin/login')} style={{ alignSelf: 'center', marginTop: spacing.xl }}>
          <Text style={styles.adminLink}>Admin Login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { paddingBottom: 80, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImg: { width: 68, height: 68 },
  brand: { color: '#FFD700', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  brandTag: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  title: { marginTop: 32, color: '#fff', fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontSize: 14 },
  sheet: { padding: spacing.lg, marginTop: -60 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { height: 52, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  prefixText: { fontWeight: '700', color: colors.onSurface, fontSize: 16 },
  error: { color: colors.error, marginTop: 8, fontSize: 12 },
  terms: { marginTop: spacing.lg, fontSize: 11, color: colors.onSurfaceMuted, textAlign: 'center' },
  adminLink: { color: colors.brandPrimary, fontWeight: '700', fontSize: 14 },
});
