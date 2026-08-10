import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/src/theme';
import { PrimaryButton } from '@/src/ui';
import { api, setToken } from '@/src/api';

export default function OTP() {
  const router = useRouter();
  const { phone, devOtp } = useLocalSearchParams<{ phone: string; devOtp?: string }>();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds === 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const set = (i: number, v: string) => {
    if (v && !/^\d+$/.test(v)) return;
    const next = [...digits];
    // handle paste of full code
    if (v.length > 1) {
      const arr = v.replace(/\D/g, '').slice(0, 6).split('');
      for (let k = 0; k < 6; k++) next[k] = arr[k] || '';
      setDigits(next);
      inputs.current[Math.min(arr.length, 5)]?.focus();
      return;
    }
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (!v && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async () => {
    const code = digits.join('');
    if (code.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(String(phone), code);
      await setToken(res.token);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setSeconds(30);
    try { await api.sendOtp(String(phone)); } catch {}
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.top}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>
          <Pressable testID="otp-back" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={r => { inputs.current[i] = r; }}
                testID={`otp-input-${i}`}
                value={d}
                onChangeText={(v) => set(i, v)}
                keyboardType="number-pad"
                maxLength={i === 0 ? 6 : 1}
                style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
              />
            ))}
          </View>
          {devOtp ? <Text style={styles.devHint}>Dev OTP: <Text style={{ fontWeight: '800' }}>{devOtp}</Text></Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={{ height: spacing.lg }} />
          <PrimaryButton testID="otp-verify-button" label="Verify & Continue" onPress={verify} loading={loading} />
          <Pressable testID="otp-resend" disabled={seconds > 0} onPress={resend} style={{ alignSelf: 'center', marginTop: spacing.lg }}>
            <Text style={[styles.resend, seconds > 0 && { color: colors.onSurfaceMuted }]}>
              {seconds > 0 ? `Resend in ${seconds}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { paddingBottom: 80, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 24, color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontSize: 14 },
  sheet: { padding: spacing.lg, marginTop: -60 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: { width: 44, height: 56, borderRadius: 12, backgroundColor: colors.surfaceSecondary, textAlign: 'center', fontSize: 22, fontWeight: '800', color: colors.onSurface, borderWidth: 1.5, borderColor: colors.border },
  otpBoxFilled: { borderColor: colors.brandPrimary, backgroundColor: '#FFF5F4' },
  devHint: { marginTop: 12, textAlign: 'center', color: colors.onSurfaceMuted, fontSize: 12 },
  error: { color: colors.error, marginTop: 8, textAlign: 'center', fontSize: 13 },
  resend: { color: colors.brandPrimary, fontWeight: '700' },
});
