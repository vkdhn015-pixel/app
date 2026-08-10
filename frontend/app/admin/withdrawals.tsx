import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function AdminWithdrawals() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const load = useCallback(async () => { try { setItems(await api.adminWithdrawals(status)); } catch {} }, [status]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const act = async (id: string, action: 'approve' | 'reject') => { try { await api.adminActWithdrawal(id, action); load(); } catch (e: any) { alert(e.message); } };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>Withdrawal Requests</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <View style={s.segment}>
        {(['pending', 'approved', 'rejected'] as const).map(k => (
          <Pressable key={k} testID={`wstatus-${k}`} onPress={() => setStatus(k)} style={[s.segBtn, status === k && s.segActive]}>
            <Text style={[s.segLabel, status === k && s.segLabelActive]}>{k[0].toUpperCase() + k.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {items.map(w => (
          <View key={w.id} style={s.card} testID={`withdraw-${w.id}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={s.name}>{w.user_name} · {w.user_phone}</Text>
                <Text style={s.sub}>UPI: {w.upi_id}</Text>
                <Text style={s.sub}>Account: {w.account_name}</Text>
                <Text style={s.date}>{new Date(w.created_at).toLocaleString()}</Text>
              </View>
              <Text style={s.amt}>₹{w.amount.toFixed(0)}</Text>
            </View>
            {w.status === 'pending' && (
              <View style={s.row2}>
                <Pressable testID={`wapprove-${w.id}`} onPress={() => act(w.id, 'approve')} style={[s.btn, { backgroundColor: '#2ECA7F' }]}><Text style={s.btnT}>Approve</Text></Pressable>
                <Pressable testID={`wreject-${w.id}`} onPress={() => act(w.id, 'reject')} style={[s.btn, { backgroundColor: '#FF4D4F' }]}><Text style={s.btnT}>Reject & Refund</Text></Pressable>
              </View>
            )}
          </View>
        ))}
        {items.length === 0 && <Text style={{ textAlign: 'center', color: colors.onSurfaceMuted, marginTop: 40 }}>No {status} withdrawals</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  segment: { flexDirection: 'row', margin: spacing.lg, backgroundColor: '#fff', borderRadius: 999, padding: 4, ...shadows.soft },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segActive: { backgroundColor: '#FF6B6B' },
  segLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary },
  segLabelActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, ...shadows.soft },
  name: { fontWeight: '800', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  date: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 4 },
  amt: { fontWeight: '800', color: colors.brandPrimary, fontSize: 20 },
  row2: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 999 },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
