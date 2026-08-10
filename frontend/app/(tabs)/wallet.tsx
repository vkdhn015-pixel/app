import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function Wallet() {
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [tab, setTab] = useState<'all' | 'deposit' | 'withdraw'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([api.wallet(), api.transactions()]);
      setWallet(w); setTxs(t);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = txs.filter((t) => tab === 'all' ? true : tab === 'deposit' ? t.kind === 'deposit' : t.kind === 'withdraw');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text style={styles.title}>My Wallet</Text>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={styles.balanceCard} testID="wallet-balance-card">
          <Text style={styles.label}>Total Balance</Text>
          <Text style={styles.value}>₹{(wallet?.balance ?? 0).toFixed(2)}</Text>
          <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: 8 }}>
            <Pressable testID="wallet-deposit" onPress={() => router.push('/deposit')} style={[styles.actBtn, { backgroundColor: '#FF6B6B' }]}><Ionicons name="add-circle" size={18} color="#fff" /><Text style={styles.actText}>Deposit</Text></Pressable>
            <Pressable testID="wallet-withdraw" onPress={() => router.push('/withdraw')} style={[styles.actBtn, { backgroundColor: '#2ECA7F' }]}><Ionicons name="cash-outline" size={18} color="#fff" /><Text style={styles.actText}>Withdraw</Text></Pressable>
          </View>
        </View>

        <View style={styles.segment}>
          {(['all', 'deposit', 'withdraw'] as const).map(k => (
            <Pressable key={k} testID={`seg-${k}`} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segActive]}>
              <Text style={[styles.segLabel, tab === k && styles.segLabelActive]}>{k === 'all' ? 'Transactions' : k[0].toUpperCase() + k.slice(1) + 's'}</Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.onSurfaceMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {filtered.map(t => (
              <View key={t.id} style={styles.tx}>
                <View style={[styles.txIcon, { backgroundColor: t.amount > 0 ? '#E7F8EE' : '#FDECEC' }]}>
                  <Ionicons name={iconFor(t.kind)} size={20} color={t.amount > 0 ? '#2ECA7F' : '#FF4D4F'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{titleFor(t.kind)}</Text>
                  <Text style={styles.txDate}>{new Date(t.created_at).toLocaleString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmt, { color: t.amount > 0 ? '#2ECA7F' : '#FF4D4F' }]}>{t.amount > 0 ? '+' : ''}₹{t.amount.toFixed(2)}</Text>
                  <Text style={styles.txStatus}>{t.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function iconFor(k: string): any {
  return { deposit: 'add-circle', withdraw: 'arrow-up-circle', bet: 'game-controller', win: 'trophy', bonus: 'gift', refund: 'refresh' }[k] || 'ellipse';
}
function titleFor(k: string) {
  return { deposit: 'Deposit', withdraw: 'Withdrawal', bet: 'Game Bet', win: 'Game Win', bonus: 'Bonus', refund: 'Refund' }[k] || k;
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: spacing.xxl },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  balanceCard: { backgroundColor: '#fff', marginHorizontal: spacing.lg, marginTop: -spacing.lg, padding: spacing.lg, borderRadius: radius.lg, ...shadows.card },
  label: { fontSize: 12, color: colors.onSurfaceMuted, fontWeight: '700' },
  value: { fontSize: 32, fontWeight: '800', color: colors.onSurface, marginTop: 4 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 999 },
  actText: { color: '#fff', fontWeight: '800' },
  segment: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.xl, backgroundColor: '#fff', borderRadius: 999, padding: 4, ...shadows.soft },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segActive: { backgroundColor: '#FF6B6B' },
  segLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary },
  segLabelActive: { color: '#fff' },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { marginTop: 12, color: colors.onSurfaceMuted, fontWeight: '600' },
  tx: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadows.soft },
  txIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txTitle: { fontSize: 14, fontWeight: '700', color: colors.onSurface },
  txDate: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  txAmt: { fontSize: 15, fontWeight: '800' },
  txStatus: { fontSize: 10, color: colors.onSurfaceMuted, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
});
