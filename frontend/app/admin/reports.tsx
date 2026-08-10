import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function AdminReports() {
  const router = useRouter();
  const [series, setSeries] = useState<any[]>([]);
  useFocusEffect(useCallback(() => { api.adminReports().then(r => setSeries(r.series || [])).catch(() => {}); }, []));

  const totals = series.reduce((acc, d) => ({ deposits: acc.deposits + d.deposits, withdrawals: acc.withdrawals + d.withdrawals, bets: acc.bets + d.bets, wins: acc.wins + d.wins }), { deposits: 0, withdrawals: 0, bets: 0, wins: 0 });
  const maxV = Math.max(1, ...series.map(d => Math.max(d.deposits, d.withdrawals, d.bets)));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>Reports & Analytics</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Deposits" value={`₹${totals.deposits.toFixed(0)}`} color="#2ECA7F" />
          <Stat label="Withdrawals" value={`₹${totals.withdrawals.toFixed(0)}`} color="#FF6B6B" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Stat label="Bets" value={`₹${totals.bets.toFixed(0)}`} color="#FFB020" />
          <Stat label="Wins Paid" value={`₹${totals.wins.toFixed(0)}`} color="#5B8CFF" />
        </View>
        <View style={s.chartCard}>
          <Text style={s.section}>Last {series.length || 0} days</Text>
          {series.length === 0 ? <Text style={{ color: colors.onSurfaceMuted, textAlign: 'center', paddingVertical: 30 }}>No data yet</Text> : (
            <View>
              {series.map((d) => (
                <View key={d.date} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: colors.onSurfaceMuted, marginBottom: 4, fontWeight: '700' }}>{d.date}</Text>
                  <View style={{ height: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 4 }}>
                    <View style={{ height: 8, backgroundColor: '#2ECA7F', borderRadius: 4, width: `${(d.deposits / maxV) * 100}%` }} />
                  </View>
                </View>
              ))}
            </View>
          )}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, borderLeftWidth: 4, ...shadows.soft },
  statLabel: { color: colors.onSurfaceMuted, fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  chartCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, ...shadows.card },
  section: { fontSize: 14, fontWeight: '800', color: colors.onSurface, marginBottom: 12 },
});
