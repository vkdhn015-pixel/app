import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

const { width } = Dimensions.get('window');

const GAME_TILES = [
  { id: 'crash', label: 'Crash', icon: 'rocket', color: '#FF6B6B' },
  { id: 'aviator', label: 'Aviator', icon: 'airplane', color: '#5B8CFF' },
  { id: 'dice', label: 'Dice', icon: 'dice', color: '#FFB020' },
  { id: 'spin', label: 'Spin Wheel', icon: 'sync-circle', color: '#2ECA7F' },
];

const BANNERS = [
  { title: 'First Deposit Bonus', sub: 'Get 100% up to ₹5,000', gradient: ['#FF9A9E', '#FF6B6B'] as const },
  { title: 'Weekend Cashback', sub: '15% back every Sat & Sun', gradient: ['#FFB99D', '#FF7E67'] as const },
  { title: 'Refer & Earn ₹250', sub: 'Invite friends, both win', gradient: ['#FFC796', '#FF9A9E'] as const },
];

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setMe(await api.me()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.name || '?').slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Hello, {me?.name || 'Player'}</Text>
              <Text style={styles.uid}>VILLAN11 · UID {me?.uid || '—'}</Text>
            </View>
            <Pressable testID="notifications-btn" onPress={() => router.push('/notifications')} style={styles.bellBtn}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}>
        {/* Wallet card overlapping */}
        <View style={styles.balanceWrap}>
          <View style={styles.balanceCard} testID="home-balance-card">
            <View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceValue}>₹{(me?.balance ?? 0).toFixed(2)}</Text>
              <Text style={styles.bonus}>Bonus ₹{(me?.bonus_balance ?? 0).toFixed(2)}</Text>
            </View>
            <View style={styles.vipBadge}>
              <Ionicons name="diamond" size={12} color="#fff" />
              <Text style={styles.vipText}>{(me?.vip_tier || 'bronze').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            <QuickAction testID="qa-deposit" label="Deposit" color="#FF6B6B" icon="add-circle" onPress={() => router.push('/deposit')} />
            <QuickAction testID="qa-withdraw" label="Withdraw" color="#2ECA7F" icon="cash-outline" onPress={() => router.push('/withdraw')} />
            <QuickAction testID="qa-history" label="History" color="#FFB020" icon="time-outline" onPress={() => router.push('/transactions')} />
            <QuickAction testID="qa-support" label="Support" color="#5B8CFF" icon="headset-outline" onPress={() => router.push('/support')} />
          </View>
        </View>

        {/* Banners */}
        <Text style={styles.section}>Promotions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}>
          {BANNERS.map((b, i) => (
            <Pressable key={i} testID={`banner-${i}`} onPress={() => router.push('/promotions')}>
              <LinearGradient colors={b.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                <Ionicons name="sparkles" size={28} color="rgba(255,255,255,0.8)" />
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        {/* Popular games */}
        <RailHeader title="Popular Games" onSeeAll={() => router.push('/(tabs)/games')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}>
          <Pressable testID="tile-wingo" onPress={() => router.push('/wingo')} style={styles.tile}>
            <LinearGradient colors={['#FF6B6B', '#8B5CF6']} style={styles.tileGrad}><Ionicons name="color-palette" size={44} color="#fff" /></LinearGradient>
            <Text style={styles.tileLabel}>Win Go</Text>
          </Pressable>
          {GAME_TILES.map((g) => (
            <GameTile key={g.id} game={g} onPress={() => router.push(`/game/${g.id}`)} />
          ))}
        </ScrollView>

        <RailHeader title="Trending Now" onSeeAll={() => router.push('/(tabs)/games')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 12 }}>
          {[...GAME_TILES].reverse().map((g) => (
            <GameTile key={g.id + 'x'} game={g} onPress={() => router.push(`/game/${g.id}`)} />
          ))}
        </ScrollView>

        {/* Daily rewards */}
        <Text style={styles.section}>Daily Rewards</Text>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Pressable testID="daily-rewards" onPress={() => router.push('/(tabs)/rewards')} style={styles.rewardCard}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Claim Today's Bonus</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 }}>Login streak reward and daily spin</Text>
            </View>
            <View style={styles.giftIcon}><Ionicons name="gift" size={30} color="#FF6B6B" /></View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ label, icon, color, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.qa}>
      <View style={[styles.qaIcon, { backgroundColor: color + '1F' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </Pressable>
  );
}

function RailHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.onSurface }}>{title}</Text>
      <Pressable onPress={onSeeAll}><Text style={{ color: colors.brandPrimary, fontWeight: '700' }}>See all</Text></Pressable>
    </View>
  );
}

function GameTile({ game, onPress }: any) {
  return (
    <Pressable testID={`tile-${game.id}`} onPress={onPress} style={styles.tile}>
      <LinearGradient colors={[game.color + 'CC', game.color]} style={styles.tileGrad}>
        <Ionicons name={game.icon as any} size={44} color="#fff" />
      </LinearGradient>
      <Text style={styles.tileLabel}>{game.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 90 },
  headerInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.brandPrimary },
  hello: { color: '#fff', fontSize: 16, fontWeight: '800' },
  uid: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  balanceWrap: { paddingHorizontal: spacing.lg, marginTop: -70 },
  balanceCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', ...shadows.strong },
  balanceLabel: { fontSize: 12, color: colors.onSurfaceMuted, fontWeight: '700' },
  balanceValue: { fontSize: 32, fontWeight: '800', color: colors.onSurface, marginTop: 4 },
  bonus: { fontSize: 12, color: colors.success, fontWeight: '700', marginTop: 4 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B6B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  vipText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  qa: { alignItems: 'center', flex: 1 },
  qaIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { marginTop: 6, fontSize: 11, fontWeight: '700', color: colors.onSurfaceSecondary },
  section: { fontSize: 17, fontWeight: '800', color: colors.onSurface, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  banner: { width: width * 0.75, height: 130, borderRadius: radius.lg, padding: spacing.lg, justifyContent: 'flex-end', overflow: 'hidden' },
  bannerTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 6 },
  bannerSub: { color: 'rgba(255,255,255,0.95)', marginTop: 2, fontSize: 12 },
  tile: { width: 112, alignItems: 'center' },
  tileGrad: { width: 112, height: 112, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  tileLabel: { marginTop: 8, fontSize: 13, fontWeight: '700', color: colors.onSurface },
  rewardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B6B', borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  giftIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
