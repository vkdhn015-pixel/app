import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

const TITLES: Record<string, { title: string; color: string; icon: any }> = {
  crash: { title: 'Crash', color: '#FF6B6B', icon: 'rocket' },
  aviator: { title: 'Aviator', color: '#5B8CFF', icon: 'airplane' },
  dice: { title: 'Lucky Dice', color: '#FFB020', icon: 'dice' },
  spin: { title: 'Spin Wheel', color: '#2ECA7F', icon: 'sync-circle' },
};

export default function GameScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const gt = String(type || 'crash');

  if (gt === 'coming-soon') return <ComingSoon router={router} />;

  const meta = TITLES[gt] || TITLES.crash;
  const [bet, setBet] = useState('10');
  const [cashOut, setCashOut] = useState('2.0');
  const [pick, setPick] = useState<'over' | 'under'>('over');
  const [threshold, setThreshold] = useState(50);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [display, setDisplay] = useState<string>('READY');

  const anim = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => { api.me().then((m) => setBalance(m?.balance ?? 0)); }, []);

  const play = async () => {
    setBusy(true); setResult(null); setDisplay('...');
    try {
      const params: any = {};
      if (gt === 'crash' || gt === 'aviator') params.cash_out = parseFloat(cashOut) || 2.0;
      if (gt === 'dice') { params.pick = pick; params.threshold = threshold; }
      const res = await api.play({ game_type: gt, bet_amount: parseFloat(bet) || 0, params });
      setBalance(res.balance);
      setResult(res);
      // simple visual reveal
      if (gt === 'crash' || gt === 'aviator') {
        const target = res.result[gt === 'crash' ? 'crash_at' : 'fly_to'];
        anim.value = 0;
        anim.value = withTiming(target, { duration: 1400, easing: Easing.out(Easing.exp) });
        setTimeout(() => setDisplay(`${target.toFixed(2)}x`), 1400);
      } else if (gt === 'spin') {
        const idx = res.result.segment_index || 0;
        rotate.value = withSequence(withTiming(0, { duration: 0 }), withTiming(360 * 4 + idx * 45, { duration: 1800, easing: Easing.out(Easing.cubic) }));
        setTimeout(() => setDisplay(res.win ? `WON x${res.result.segment_multiplier}` : 'MISS'), 1800);
      } else if (gt === 'dice') {
        setDisplay(`ROLL ${res.result.roll}`);
      } else {
        setDisplay(res.win ? 'WIN' : 'LOSE');
      }
    } catch (e: any) { setDisplay('ERR'); alert(e.message); }
    finally { setBusy(false); }
  };

  const flyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -anim.value * 12 }, { translateX: anim.value * 20 }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={[meta.color + 'DD', meta.color]}>
        <SafeAreaView edges={['top']} style={styles.h}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.title}>{meta.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wallet-outline" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>₹{balance.toFixed(2)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {/* Game stage */}
        <View style={styles.stage}>
          <LinearGradient colors={['#1F2937', '#111827']} style={styles.stageBg}>
            {(gt === 'crash' || gt === 'aviator') && (
              <Animated.View style={flyStyle}>
                <Ionicons name={meta.icon} size={72} color="#fff" />
              </Animated.View>
            )}
            {gt === 'spin' && (
              <Animated.View style={[styles.wheel, spinStyle]}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                  <View key={i} style={[styles.wheelSeg, { transform: [{ rotate: `${i * 45}deg` }], backgroundColor: i % 2 ? '#FF6B6B' : '#FFB020' }]}>
                    <Text style={styles.wheelText}>{[0, 1.5, 0, 2, 0, 3, 0, 5][i] || '×'}</Text>
                  </View>
                ))}
              </Animated.View>
            )}
            {gt === 'dice' && (
              <View style={styles.diceBox}>
                <Ionicons name="dice" size={100} color="#fff" />
                <Text style={styles.rollText}>{result?.result?.roll ?? '—'}</Text>
              </View>
            )}
            <Text style={styles.display}>{display}</Text>
          </LinearGradient>
        </View>

        {result && (
          <View style={[styles.resultBox, { backgroundColor: result.win ? '#E7F8EE' : '#FDECEC' }]}>
            <Ionicons name={result.win ? 'trophy' : 'sad-outline'} size={22} color={result.win ? '#2ECA7F' : '#FF4D4F'} />
            <Text style={[styles.resultText, { color: result.win ? '#2ECA7F' : '#FF4D4F' }]}>
              {result.win ? `You won ₹${result.payout.toFixed(2)}` : 'Better luck next time!'}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <Text style={styles.label}>Bet Amount (₹)</Text>
          <TextInput testID="game-bet" style={inputStyle.base} value={bet} onChangeText={setBet} keyboardType="number-pad" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {[10, 50, 100, 500, 1000].map(v => (
              <Pressable key={v} onPress={() => setBet(String(v))} style={styles.chip} testID={`bet-${v}`}><Text style={styles.chipText}>₹{v}</Text></Pressable>
            ))}
          </ScrollView>

          {(gt === 'crash' || gt === 'aviator') && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Auto Cash-Out (×)</Text>
              <TextInput testID="cash-out" style={inputStyle.base} value={cashOut} onChangeText={setCashOut} keyboardType="decimal-pad" />
            </View>
          )}
          {gt === 'dice' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Prediction</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable testID="pick-under" onPress={() => setPick('under')} style={[styles.pickBtn, pick === 'under' && styles.pickActive]}><Text style={[styles.pickText, pick === 'under' && { color: '#fff' }]}>Under {threshold}</Text></Pressable>
                <Pressable testID="pick-over" onPress={() => setPick('over')} style={[styles.pickBtn, pick === 'over' && styles.pickActive]}><Text style={[styles.pickText, pick === 'over' && { color: '#fff' }]}>Over {threshold}</Text></Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {[25, 50, 75].map(t => <Pressable key={t} onPress={() => setThreshold(t)} style={[styles.chip, threshold === t && { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }]} testID={`th-${t}`}><Text style={styles.chipText}>{t}</Text></Pressable>)}
              </View>
            </View>
          )}

          <View style={{ height: 16 }} />
          <PrimaryButton testID="play-btn" label={busy ? 'Playing...' : `Place Bet · ₹${bet || 0}`} onPress={play} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ComingSoon({ router }: any) {
  const { title } = useLocalSearchParams<{ title: string }>();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{title || 'Coming Soon'}</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="rocket-outline" size={80} color="#FF6B6B" />
        <Text style={{ marginTop: 16, fontSize: 20, fontWeight: '800', color: colors.onSurface }}>Launching Soon</Text>
        <Text style={{ marginTop: 8, color: colors.onSurfaceMuted }}>This game is coming to Daman Play very soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  stage: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, ...shadows.strong },
  stageBg: { height: 240, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  display: { position: 'absolute', top: 16, right: 16, color: '#fff', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  wheel: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  wheelSeg: { position: 'absolute', width: 170, height: 85, top: 0, transformOrigin: '50% 100%', alignItems: 'center', paddingTop: 6 },
  wheelText: { color: '#fff', fontWeight: '800' },
  diceBox: { alignItems: 'center' },
  rollText: { color: '#fff', fontSize: 42, fontWeight: '800', marginTop: 4 },
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, marginBottom: spacing.md },
  resultText: { fontSize: 15, fontWeight: '800' },
  controls: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipText: { fontWeight: '800', color: colors.onSurface },
  pickBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  pickActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pickText: { fontWeight: '800', color: colors.onSurface },
});
