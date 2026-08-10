import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function AdminPayments() {
  const router = useRouter();
  const [cfg, setCfg] = useState<any>({ upi_ids: [], qr_data: '', min_deposit: 100, min_withdraw: 200, max_withdraw: 100000 });
  const [saved, setSaved] = useState(false);
  const [newUpi, setNewUpi] = useState('');

  useEffect(() => { api.adminGetPayment().then(setCfg).catch(() => {}); }, []);

  const save = async () => { try { const r = await api.adminUpdatePayment(cfg); setCfg(r); setSaved(true); setTimeout(() => setSaved(false), 1500); } catch (e: any) { alert(e.message); } };
  const addUpi = () => { if (newUpi.trim()) { setCfg({ ...cfg, upi_ids: [...(cfg.upi_ids || []), newUpi.trim()] }); setNewUpi(''); } };
  const removeUpi = (id: string) => setCfg({ ...cfg, upi_ids: (cfg.upi_ids || []).filter((x: string) => x !== id) });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>QR / UPI / Payments</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.section}>UPI IDs</Text>
          {(cfg.upi_ids || []).map((id: string) => (
            <View key={id} style={s.upiRow} testID={`upi-row-${id}`}>
              <Text style={{ flex: 1, fontWeight: '700' }}>{id}</Text>
              <Pressable testID={`del-${id}`} onPress={() => removeUpi(id)}><Ionicons name="trash-outline" size={20} color="#FF4D4F" /></Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TextInput testID="new-upi" style={[inputStyle.base, { flex: 1 }]} value={newUpi} onChangeText={setNewUpi} placeholder="new@upi" autoCapitalize="none" placeholderTextColor={colors.onSurfaceMuted} />
            <Pressable testID="add-upi" onPress={addUpi} style={s.add}><Ionicons name="add" size={22} color="#fff" /></Pressable>
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.section}>QR Code (UPI URI)</Text>
          <TextInput testID="qr-data" style={[inputStyle.base, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} value={cfg.qr_data || ''} onChangeText={(v) => setCfg({ ...cfg, qr_data: v })} placeholder="upi://pay?pa=merchant@upi&pn=..." multiline placeholderTextColor={colors.onSurfaceMuted} />
        </View>
        <View style={s.card}>
          <Text style={s.section}>Limits</Text>
          <Text style={s.lbl}>Min Deposit</Text>
          <TextInput testID="min-dep" style={inputStyle.base} value={String(cfg.min_deposit)} onChangeText={(v) => setCfg({ ...cfg, min_deposit: parseFloat(v) || 0 })} keyboardType="number-pad" />
          <View style={{ height: 8 }} />
          <Text style={s.lbl}>Min Withdraw</Text>
          <TextInput testID="min-wd" style={inputStyle.base} value={String(cfg.min_withdraw)} onChangeText={(v) => setCfg({ ...cfg, min_withdraw: parseFloat(v) || 0 })} keyboardType="number-pad" />
          <View style={{ height: 8 }} />
          <Text style={s.lbl}>Max Withdraw</Text>
          <TextInput testID="max-wd" style={inputStyle.base} value={String(cfg.max_withdraw)} onChangeText={(v) => setCfg({ ...cfg, max_withdraw: parseFloat(v) || 0 })} keyboardType="number-pad" />
        </View>
        <PrimaryButton testID="save-payments" label={saved ? 'Saved ✓' : 'Save Payment Settings'} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  section: { fontSize: 14, fontWeight: '800', color: colors.onSurface, marginBottom: 10 },
  upiRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 12, marginBottom: 6 },
  add: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  lbl: { fontSize: 12, fontWeight: '700', color: colors.onSurfaceMuted, marginBottom: 6 },
});
