import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api, setAdminToken } from '@/src/api';

const MENU = [
  { id: 'users', label: 'User Management', icon: 'people', color: '#5B8CFF', to: '/admin/users' },
  { id: 'deposits', label: 'Deposit Requests', icon: 'add-circle', color: '#2ECA7F', to: '/admin/deposits' },
  { id: 'withdrawals', label: 'Withdrawal Requests', icon: 'arrow-up-circle', color: '#FFB020', to: '/admin/withdrawals' },
  { id: 'payments', label: 'QR / UPI / Payments', icon: 'card', color: '#FF6B6B', to: '/admin/payments' },
  { id: 'broadcast', label: 'Notifications', icon: 'megaphone', color: '#E53935', to: '/admin/broadcast' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'bar-chart', color: '#4A4A4A', to: '/admin/reports' },
  { id: 'settings', label: 'App Settings', icon: 'settings', color: '#8B5CF6', to: '/admin/app-settings' },
  { id: 'tickets', label: 'Support Tickets', icon: 'headset', color: '#0EA5E9', to: '/admin/tickets' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api.adminDashboard()); } catch (e: any) {
      if (String(e.message).includes('token') || String(e.message).includes('401') || String(e.message).includes('403')) {
        router.replace('/admin/login');
      }
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => { await setAdminToken(null); router.replace('/admin/login'); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#212121', '#4A4A4A']}>
        <SafeAreaView edges={['top']} style={s.header}>
          <View>
            <Text style={s.hi}>Villan 11 Admin</Text>
            <Text style={s.subH}>Control Center</Text>
          </View>
          <Pressable testID="admin-logout" onPress={logout} style={s.out}><Ionicons name="log-out-outline" size={22} color="#fff" /></Pressable>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Total Users" value={String(data.total_users ?? 0)} color="#5B8CFF" />
          <Stat label="Revenue Today" value={`₹${(data.revenue_today ?? 0).toFixed(0)}`} color="#2ECA7F" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Stat label="Pending Deposits" value={String(data.pending_deposits ?? 0)} color="#FF6B6B" />
          <Stat label="Pending Withdrawals" value={String(data.pending_withdrawals ?? 0)} color="#FFB020" />
        </View>

        <Text style={s.section}>Management</Text>
        <View style={s.grid}>
          {MENU.map(m => (
            <Pressable key={m.id} testID={`admin-${m.id}`} onPress={() => router.push(m.to as any)} style={s.tile}>
              <View style={[s.tileIcon, { backgroundColor: m.color + '1F' }]}><Ionicons name={m.icon as any} size={22} color={m.color} /></View>
              <Text style={s.tileLabel}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <View style={[s.stat, { borderLeftColor: color }]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  hi: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subH: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  out: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 4, ...shadows.soft },
  statLabel: { color: colors.onSurfaceMuted, fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, ...shadows.soft },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { marginTop: 10, fontWeight: '800', color: colors.onSurface, fontSize: 13 },
});
