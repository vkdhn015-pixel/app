import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function Rewards() {
  const router = useRouter();
  const [vip, setVip] = useState<any>(null);
  const [promos, setPromos] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [v, p, m] = await Promise.all([api.vip(), api.promotions(), api.me()]);
      setVip(v); setPromos(p); setMe(m);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const currentTier = vip?.tiers?.find((t: any) => t.id === vip?.current);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Text style={styles.title}>Rewards & VIP</Text>
          <Text style={styles.sub}>Play more. Earn more.</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.vipCard} testID="vip-current-card">
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Current Tier</Text>
            <Text style={styles.tierName}>{currentTier?.name || 'Bronze'}</Text>
            <Text style={styles.wagered}>Total wagered: ₹{(vip?.total_wagered ?? 0).toFixed(0)}</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: currentTier?.color || '#CD7F32' }]}>
            <Ionicons name="diamond" size={26} color="#fff" />
          </View>
        </View>

        <Text style={styles.section}>All Tiers</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
          {vip?.tiers?.map((t: any) => (
            <View key={t.id} style={[styles.tier, vip.current === t.id && styles.tierActive]} testID={`tier-${t.id}`}>
              <View style={[styles.tierDot, { backgroundColor: t.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tierN}>{t.name}</Text>
                <Text style={styles.tierM}>Min wager ₹{t.min_wager} · Cashback {t.cashback}%</Text>
              </View>
              {vip.current === t.id && <View style={styles.activePill}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>ACTIVE</Text></View>}
            </View>
          ))}
        </View>

        <Text style={styles.section}>Promotions & Referral</Text>
        <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
          <Pressable testID="referral-card" style={styles.refCard} onPress={() => {}}>
            <LinearGradient colors={['#FF9A9E', '#FF6B6B']} style={styles.refInner}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Your Referral Code</Text>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: 1 }}>{me?.referral_code || '—'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>Invite friends, earn ₹250 each</Text>
              </View>
              <Ionicons name="share-social" size={30} color="#fff" />
            </LinearGradient>
          </Pressable>
          {promos.map(p => (
            <View key={p.id} style={styles.promo} testID={`promo-${p.code}`}>
              <View style={styles.promoIcon}><Ionicons name="pricetag" size={20} color="#FF6B6B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>{p.title}</Text>
                <Text style={styles.promoSub}>{p.subtitle}</Text>
              </View>
              <View style={styles.codePill}><Text style={styles.codeText}>{p.code}</Text></View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: spacing.xxl },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 },
  vipCard: { backgroundColor: '#fff', marginHorizontal: spacing.lg, marginTop: -spacing.lg, padding: spacing.lg, borderRadius: radius.lg, flexDirection: 'row', ...shadows.card },
  smallLabel: { color: colors.onSurfaceMuted, fontSize: 12, fontWeight: '700' },
  tierName: { fontSize: 28, fontWeight: '800', color: colors.onSurface, marginTop: 4 },
  wagered: { color: colors.onSurfaceMuted, fontSize: 12, marginTop: 4 },
  tierBadge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 16, fontWeight: '800', color: colors.onSurface, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  tier: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, ...shadows.soft },
  tierActive: { borderWidth: 1.5, borderColor: colors.brandPrimary },
  tierDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  tierN: { fontWeight: '800', color: colors.onSurface },
  tierM: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  activePill: { backgroundColor: colors.brandPrimary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  refCard: { borderRadius: radius.lg, overflow: 'hidden', ...shadows.card },
  refInner: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  promo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, gap: 12, ...shadows.soft },
  promoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  promoTitle: { fontSize: 14, fontWeight: '800', color: colors.onSurface },
  promoSub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  codePill: { backgroundColor: '#FFF5F4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.brandPrimary },
  codeText: { color: colors.brandPrimary, fontWeight: '800', fontSize: 11 },
});
