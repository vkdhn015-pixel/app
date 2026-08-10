import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function AdminAppSettings() {
  const router = useRouter();
  const [rate, setRate] = useState('0.38');
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.adminGetPayment().then(c => setRate(String(c?.player_win_rate ?? 0.38))); }, []);

  const save = async () => { try { const r = await api.adminUpdateAppSettings({ player_win_rate: parseFloat(rate) }); setRate(String(r.player_win_rate)); setSaved(true); setTimeout(() => setSaved(false), 1500); } catch (e: any) { alert(e.message); } };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>App Settings</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={s.card}>
          <Text style={s.section}>Game Economics</Text>
          <Text style={s.lbl}>Player Win Rate (0.0 - 1.0)</Text>
          <TextInput testID="win-rate" style={inputStyle.base} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
          <Text style={s.hint}>Current: {(parseFloat(rate || '0') * 100).toFixed(0)}% win · {(100 - parseFloat(rate || '0') * 100).toFixed(0)}% loss.  Default 38% / 62%.</Text>
        </View>
        <PrimaryButton testID="save-settings" label={saved ? 'Saved ✓' : 'Save Settings'} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  section: { fontSize: 14, fontWeight: '800', color: colors.onSurface, marginBottom: 10 },
  lbl: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  hint: { color: colors.onSurfaceMuted, fontSize: 12, marginTop: 8 },
});
