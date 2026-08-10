import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function Transactions() {
  const router = useRouter();
  const [txs, setTxs] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { api.transactions().then(setTxs).catch(() => {}); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={s.header}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={s.title}>Transaction History</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {txs.length === 0 ? (
          <View style={s.empty}><Ionicons name="receipt-outline" size={48} color={colors.onSurfaceMuted} /><Text style={s.emptyText}>No transactions</Text></View>
        ) : txs.map(t => (
          <View key={t.id} style={s.row}>
            <View style={[s.icon, { backgroundColor: t.amount > 0 ? '#E7F8EE' : '#FDECEC' }]}><Ionicons name={t.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={t.amount > 0 ? '#2ECA7F' : '#FF4D4F'} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.txT}>{t.kind.toUpperCase()}</Text>
              <Text style={s.txD}>{new Date(t.created_at).toLocaleString()}</Text>
            </View>
            <Text style={[s.amt, { color: t.amount > 0 ? '#2ECA7F' : '#FF4D4F' }]}>{t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 12, color: colors.onSurfaceMuted },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, marginBottom: 8, ...shadows.soft },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txT: { fontWeight: '800', color: colors.onSurface, fontSize: 13 },
  txD: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  amt: { fontSize: 15, fontWeight: '800' },
});
