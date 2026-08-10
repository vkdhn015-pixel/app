import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

const QUICK = [500, 1000, 2000, 5000, 10000];

export default function Deposit() {
  const router = useRouter();
  const [cfg, setCfg] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [tab, setTab] = useState<'upi' | 'qr'>('upi');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { api.paymentConfig().then(setCfg).catch(() => {}); }, []);

  const copy = async (_t: string) => {};

  const submit = async () => {
    setMsg(null);
    const amt = parseFloat(amount);
    if (!amt || amt < (cfg?.min_deposit || 100)) { setMsg({ ok: false, text: `Min deposit ₹${cfg?.min_deposit || 100}` }); return; }
    if (!utr || utr.length < 4) { setMsg({ ok: false, text: 'Enter valid UTR / reference number' }); return; }
    setLoading(true);
    try {
      await api.createDeposit({ amount: amt, utr, method: tab });
      setMsg({ ok: true, text: 'Deposit request submitted. Awaiting approval.' });
      setAmount(''); setUtr('');
    } catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <Pressable onPress={() => router.back()} testID="back-btn"><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.title}>Deposit</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput testID="amount-input" style={inputStyle.base} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="Enter amount" placeholderTextColor={colors.onSurfaceMuted} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {QUICK.map(v => (
              <Pressable key={v} testID={`quick-${v}`} onPress={() => setAmount(String(v))} style={styles.quickChip}>
                <Text style={styles.quickText}>₹{v}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.segment}>
          {(['upi', 'qr'] as const).map(k => (
            <Pressable key={k} testID={`method-${k}`} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segActive]}>
              <Text style={[styles.segLabel, tab === k && styles.segLabelActive]}>{k === 'upi' ? 'UPI Transfer' : 'Scan QR'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          {tab === 'upi' ? (
            <View>
              <Text style={styles.hint}>Send money to any UPI ID below, then paste the UTR / reference number.</Text>
              {(cfg?.upi_ids || []).map((id: string) => (
                <Pressable key={id} testID={`upi-${id}`} onPress={() => copy(id)} style={styles.upiRow}>
                  <View style={styles.upiIcon}><Ionicons name="at" size={18} color="#FF6B6B" /></View>
                  <Text style={styles.upiText}>{id}</Text>
                  <Ionicons name="copy-outline" size={18} color={colors.onSurfaceMuted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.hint}>Scan this QR from any UPI app.</Text>
              {cfg?.qr_png_base64 ? (
                <Image source={{ uri: `data:image/png;base64,${cfg.qr_png_base64}` }} style={{ width: 220, height: 220, marginTop: 12, borderRadius: 12 }} testID="qr-image" />
              ) : <Text style={{ color: colors.onSurfaceMuted, marginTop: 12 }}>QR unavailable</Text>}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>UTR / Reference Number</Text>
          <TextInput testID="utr-input" style={inputStyle.base} value={utr} onChangeText={setUtr} placeholder="12-digit reference" placeholderTextColor={colors.onSurfaceMuted} />
        </View>

        {msg && <View style={[styles.msg, { backgroundColor: msg.ok ? '#E7F8EE' : '#FDECEC' }]}>
          <Text style={{ color: msg.ok ? '#2ECA7F' : '#FF4D4F', fontWeight: '700' }}>{msg.text}</Text>
        </View>}

        <PrimaryButton testID="submit-deposit" label="Confirm Deposit" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  hint: { fontSize: 12, color: colors.onSurfaceMuted, marginBottom: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.brandTertiary, borderWidth: 1, borderColor: colors.brandPrimary },
  quickText: { color: colors.brandPrimary, fontWeight: '800', fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 999, padding: 4, marginBottom: spacing.md, ...shadows.soft },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segActive: { backgroundColor: '#FF6B6B' },
  segLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary },
  segLabelActive: { color: '#fff' },
  upiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  upiIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  upiText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.onSurface },
  msg: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
});
