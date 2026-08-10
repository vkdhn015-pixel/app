import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api, setAdminToken } from '@/src/api';

export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState('+919999999999');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setLoading(true);
    try { const r = await api.adminLogin(phone.trim(), pw); await setAdminToken(r.token); router.replace('/admin'); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient colors={['#212121', '#4A4A4A']} style={styles.top}>
        <SafeAreaView edges={['top']} style={{ padding: spacing.xl }}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <View style={styles.badge}><Ionicons name="shield-checkmark" size={30} color="#fff" /></View>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.sub}>Restricted access · authorized personnel only</Text>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.sheet}>
        <View style={styles.card}>
          <Text style={styles.label}>Phone</Text>
          <TextInput testID="admin-phone" style={inputStyle.base} value={phone} onChangeText={setPhone} autoCapitalize="none" />
          <View style={{ height: 12 }} />
          <Text style={styles.label}>Password</Text>
          <TextInput testID="admin-password" style={inputStyle.base} value={pw} onChangeText={setPw} secureTextEntry />
          {err && <Text style={styles.err}>{err}</Text>}
          <View style={{ height: 16 }} />
          <PrimaryButton testID="admin-login-btn" label="Sign in as Admin" onPress={submit} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { paddingBottom: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 16 },
  sub: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 },
  sheet: { padding: spacing.lg, marginTop: -40 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  err: { color: colors.error, marginTop: 8, fontSize: 12 },
});
