import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function Withdraw() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.me().then(m => { setMe(m); setName(m?.name || ''); });
    api.paymentConfig().then(setCfg).catch(() => {});
  }, []);

  const submit = async () => {
    setMsg(null);
    const amt = parseFloat(amount);
    if (!amt || amt < (cfg?.min_withdraw || 200)) { setMsg({ ok: false, text: `Min withdrawal ₹${cfg?.min_withdraw || 200}` }); return; }
    if (!upi || !upi.includes('@')) { setMsg({ ok: false, text: 'Enter valid UPI ID' }); return; }
    if (!name.trim()) { setMsg({ ok: false, text: 'Enter account name' }); return; }
    setLoading(true);
    try {
      await api.createWithdraw({ amount: amt, upi_id: upi.trim(), account_name: name.trim() });
      setMsg({ ok: true, text: 'Withdrawal request submitted. Awaiting approval.' });
      setAmount('');
      setMe(await api.me());
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={() => router.back()} testID="back-btn"><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Withdraw</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Available Balance</Text>
          <Text style={styles.balance}>₹{(me?.balance ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput testID="withdraw-amount" style={inputStyle.base} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Enter amount" placeholderTextColor={colors.onSurfaceMuted} />
          <Text style={styles.hint}>Min ₹{cfg?.min_withdraw ?? 200} · Max ₹{cfg?.max_withdraw ?? 100000}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>UPI ID</Text>
          <TextInput testID="withdraw-upi" style={inputStyle.base} value={upi} onChangeText={setUpi} placeholder="username@upi" placeholderTextColor={colors.onSurfaceMuted} autoCapitalize="none" />
          <View style={{ height: 12 }} />
          <Text style={styles.label}>Account Name</Text>
          <TextInput testID="withdraw-name" style={inputStyle.base} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.onSurfaceMuted} />
        </View>
        {msg && <View style={[styles.msg, { backgroundColor: msg.ok ? '#E7F8EE' : '#FDECEC' }]}>
          <Text style={{ color: msg.ok ? '#2ECA7F' : '#FF4D4F', fontWeight: '700' }}>{msg.text}</Text>
        </View>}
        <PrimaryButton testID="submit-withdraw" label="Request Withdrawal" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  balance: { fontSize: 28, fontWeight: '800', color: colors.onSurface, marginTop: 4 },
  hint: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 6 },
  msg: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
});
