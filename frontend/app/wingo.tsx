import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';
import LiveBetFeed from '@/src/components/LiveBetFeed';

const DURATIONS = [
  { d: 30, label: '30s' },
  { d: 60, label: '1 Min' },
  { d: 180, label: '3 Min' },
  { d: 300, label: '5 Min' },
];
const AMOUNTS = [10, 50, 100, 500, 1000];

function numberGradient(n: number): [string, string] {
  if (n === 0) return ['#FF4D4F', '#8B5CF6'];
  if (n === 5) return ['#2ECA7F', '#8B5CF6'];
  if ([1, 3, 7, 9].includes(n)) return ['#33D68A', '#2ECA7F'];
  return ['#FF6B6B', '#FF4D4F'];
}
const COLOR_HEX: Record<string, string> = { green: '#2ECA7F', violet: '#8B5CF6', red: '#FF4D4F' };

export default function WinGo() {
  const router = useRouter();
  const [duration, setDuration] = useState(60);
  const [state, setState] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tab, setTab] = useState<'history' | 'mybets'>('history');
  const [bet, setBet] = useState<{ type: string; value: string; label: string; tint: string } | null>(null);
  const [amount, setAmount] = useState(10);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tick = useRef<any>(null);

  const load = useCallback(async (d: number) => {
    try {
      const s = await api.wingoState(d);
      setState(s); setTimeLeft(s.time_left);
    } catch {}
  }, []);

  useEffect(() => { load(duration); }, [duration, load]);

  // local countdown + refetch on period end
  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { load(duration); return duration; }
        return t - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [duration, load]);

  const locked = timeLeft <= 5;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  const openBet = (type: string, value: string, label: string, tint: string) => {
    if (locked) { setToast('Betting closed — wait for next round'); setTimeout(() => setToast(null), 1500); return; }
    setBet({ type, value, label, tint }); setAmount(10); setQty(1);
  };

  const confirm = async () => {
    if (!bet) return;
    setPlacing(true);
    try {
      const r = await api.wingoBet(duration, bet.type, bet.value, amount * qty);
      setState((s: any) => ({ ...s, balance: r.balance }));
      setBet(null);
      setToast(`Bet placed on ${bet.label}`); setTimeout(() => setToast(null), 1500);
      load(duration);
    } catch (e: any) { setToast(e.message); setTimeout(() => setToast(null), 1800); }
    finally { setPlacing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <Pressable onPress={() => router.back()} testID="wingo-back"><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.title}>Win Go</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wallet-outline" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800' }} testID="wingo-balance">₹{(state?.balance ?? 0).toFixed(2)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <LiveBetFeed game="wingo" />

        {/* Duration tabs */}
        <View style={styles.durRow}>
          {DURATIONS.map((x) => (
            <Pressable key={x.d} testID={`dur-${x.d}`} onPress={() => setDuration(x.d)} style={[styles.durTab, duration === x.d && styles.durActive]}>
              <Ionicons name="time-outline" size={16} color={duration === x.d ? '#fff' : colors.onSurfaceSecondary} />
              <Text style={[styles.durLabel, duration === x.d && { color: '#fff' }]}>{x.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Timer + period */}
        <LinearGradient colors={['#FF6B6B', '#FF9A9E']} style={styles.timerCard}>
          <View>
            <Text style={styles.timerLabel}>Period</Text>
            <Text style={styles.period} testID="wingo-period">{state?.period ?? '—'}</Text>
            {/* last 5 result balls */}
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
              {(state?.history || []).slice(0, 5).map((h: any, i: number) => (
                <LinearGradient key={i} colors={numberGradient(h.number)} style={styles.miniBall}><Text style={styles.miniBallText}>{h.number}</Text></LinearGradient>
              ))}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timerLabel}>{locked ? 'Betting Closed' : 'Time Left'}</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {[mm[0], mm[1], ':', ss[0], ss[1]].map((c, i) => (
                <View key={i} style={c === ':' ? undefined : styles.timeBox}><Text style={styles.timeText}>{c}</Text></View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Color bets */}
        <View style={[styles.panel, locked && { opacity: 0.5 }]} pointerEvents={locked ? 'none' : 'auto'}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable testID="bet-green" style={[styles.colorBtn, { backgroundColor: '#2ECA7F' }]} onPress={() => openBet('color', 'green', 'Green (2x)', '#2ECA7F')}><Text style={styles.colorText}>Green</Text><Text style={styles.colorMult}>2x</Text></Pressable>
            <Pressable testID="bet-violet" style={[styles.colorBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => openBet('color', 'violet', 'Violet (4.5x)', '#8B5CF6')}><Text style={styles.colorText}>Violet</Text><Text style={styles.colorMult}>4.5x</Text></Pressable>
            <Pressable testID="bet-red" style={[styles.colorBtn, { backgroundColor: '#FF4D4F' }]} onPress={() => openBet('color', 'red', 'Red (2x)', '#FF4D4F')}><Text style={styles.colorText}>Red</Text><Text style={styles.colorMult}>2x</Text></Pressable>
          </View>

          {/* Number grid 0-9 */}
          <View style={styles.numGrid}>
            {Array.from({ length: 10 }).map((_, n) => (
              <Pressable key={n} testID={`bet-num-${n}`} onPress={() => openBet('number', String(n), `Number ${n} (9x)`, COLOR_HEX[n === 0 ? 'violet' : n === 5 ? 'green' : ([1,3,7,9].includes(n) ? 'green' : 'red')])} style={styles.numWrap}>
                <LinearGradient colors={numberGradient(n)} style={styles.numBall}><Text style={styles.numBallText}>{n}</Text></LinearGradient>
              </Pressable>
            ))}
          </View>

          {/* Big / Small */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable testID="bet-big" style={[styles.sizeBtn, { backgroundColor: '#FFB020' }]} onPress={() => openBet('size', 'big', 'Big (2x)', '#FFB020')}><Text style={styles.sizeText}>BIG</Text><Text style={styles.sizeSub}>5-9 · 2x</Text></Pressable>
            <Pressable testID="bet-small" style={[styles.sizeBtn, { backgroundColor: '#5B8CFF' }]} onPress={() => openBet('size', 'small', 'Small (2x)', '#5B8CFF')}><Text style={styles.sizeText}>SMALL</Text><Text style={styles.sizeSub}>0-4 · 2x</Text></Pressable>
          </View>
        </View>

        {/* History / My bets */}
        <View style={styles.segment}>
          {(['history', 'mybets'] as const).map((k) => (
            <Pressable key={k} testID={`tab-${k}`} onPress={() => setTab(k)} style={[styles.segBtn, tab === k && styles.segActive]}>
              <Text style={[styles.segLabel, tab === k && styles.segLabelActive]}>{k === 'history' ? 'Game History' : 'My Bets'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'history' ? (
          <View style={styles.tableCard}>
            <View style={styles.trHead}>
              <Text style={[styles.th, { flex: 2 }]}>Period</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Number</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Big/Small</Text>
              <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Color</Text>
            </View>
            {(state?.history || []).map((h: any, i: number) => (
              <Animated.View key={h.period} entering={FadeInDown.delay(i * 20)} style={styles.tr}>
                <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{h.period}</Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <LinearGradient colors={numberGradient(h.number)} style={styles.tdBall}><Text style={styles.tdBallText}>{h.number}</Text></LinearGradient>
                </View>
                <Text style={[styles.td, { flex: 1, textAlign: 'center', textTransform: 'capitalize' }]}>{h.size}</Text>
                <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
                  {h.colors.map((c: string) => <View key={c} style={[styles.dot, { backgroundColor: COLOR_HEX[c] }]} />)}
                </View>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.tableCard}>
            {(state?.my_bets || []).length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.onSurfaceMuted, paddingVertical: 20 }}>No bets yet</Text>
            ) : (state?.my_bets || []).map((b: any) => (
              <View key={b.id} style={styles.betRow} testID={`mybet-${b.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.betVal}>{b.bet_type === 'number' ? `Number ${b.value}` : b.value.toUpperCase()}</Text>
                  <Text style={styles.betPeriod}>{b.period_display}</Text>
                </View>
                <Text style={styles.betAmt}>₹{b.amount}</Text>
                <View style={[styles.betStatus, { backgroundColor: b.settled ? (b.win ? '#E7F8EE' : '#FDECEC') : '#FFF6E6' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: b.settled ? (b.win ? '#2ECA7F' : '#FF4D4F') : '#FFB020' }}>
                    {b.settled ? (b.win ? `WON +₹${b.payout}` : 'LOST') : 'PENDING'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {toast && (
        <Animated.View entering={ZoomIn} style={styles.toast}><Text style={styles.toastText}>{toast}</Text></Animated.View>
      )}

      {/* Bet modal */}
      <Modal visible={!!bet} transparent animationType="slide" onRequestClose={() => setBet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setBet(null)} />
        <View style={styles.sheet}>
          <LinearGradient colors={[bet?.tint || '#FF6B6B', (bet?.tint || '#FF6B6B') + 'CC']} style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Bet on {bet?.label}</Text>
            <Text style={styles.sheetPeriod}>{state?.period}</Text>
          </LinearGradient>
          <View style={{ padding: spacing.lg }}>
            <Text style={styles.sheetLabel}>Amount</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {AMOUNTS.map((a) => (
                <Pressable key={a} testID={`amt-${a}`} onPress={() => setAmount(a)} style={[styles.amtChip, amount === a && styles.amtActive]}>
                  <Text style={[styles.amtText, amount === a && { color: '#fff' }]}>₹{a}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sheetLabel, { marginTop: 16 }]}>Quantity</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable testID="qty-minus" onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}><Ionicons name="remove" size={20} color={colors.onSurface} /></Pressable>
              <Text style={styles.qtyVal}>{qty}</Text>
              <Pressable testID="qty-plus" onPress={() => setQty((q) => q + 1)} style={styles.qtyBtn}><Ionicons name="add" size={20} color={colors.onSurface} /></Pressable>
              {[5, 10, 20].map((m) => <Pressable key={m} onPress={() => setQty(m)} style={styles.qtyQuick}><Text style={styles.qtyQuickText}>x{m}</Text></Pressable>)}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>₹{amount * qty}</Text>
            </View>
            <Pressable testID="confirm-bet" disabled={placing} onPress={confirm} style={[styles.confirmBtn, { backgroundColor: bet?.tint || '#FF6B6B' }]}>
              <Text style={styles.confirmText}>{placing ? 'Placing…' : `Confirm · ₹${amount * qty}`}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  durRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  durTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  durActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  durLabel: { fontSize: 12, fontWeight: '800', color: colors.onSurfaceSecondary },
  timerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, ...shadows.card },
  timerLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },
  period: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  miniBall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  miniBallText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  timeBox: { width: 26, height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  timeText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  panel: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md, ...shadows.card },
  colorBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md },
  colorText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  colorMult: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16, rowGap: 12 },
  numWrap: { width: '18%', alignItems: 'center' },
  numBall: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  numBallText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sizeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md },
  sizeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sizeSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  segment: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 999, padding: 4, marginTop: spacing.lg, ...shadows.soft },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999 },
  segActive: { backgroundColor: '#FF6B6B' },
  segLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary },
  segLabelActive: { color: '#fff' },
  tableCard: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, ...shadows.soft },
  trHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  th: { fontSize: 12, fontWeight: '800', color: colors.onSurfaceMuted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  td: { fontSize: 13, fontWeight: '600', color: colors.onSurface },
  tdBall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tdBallText: { color: '#fff', fontWeight: '800' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  betRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10 },
  betVal: { fontWeight: '800', color: colors.onSurface },
  betPeriod: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 2 },
  betAmt: { fontWeight: '800', color: colors.onSurface },
  betStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  toast: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#212121', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  toastText: { color: '#fff', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHead: { padding: spacing.lg },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sheetPeriod: { color: 'rgba(255,255,255,0.9)', marginTop: 2, fontSize: 12 },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 10 },
  amtChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  amtActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  amtText: { fontWeight: '800', color: colors.onSurface },
  qtyBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  qtyVal: { fontSize: 18, fontWeight: '800', color: colors.onSurface, minWidth: 30, textAlign: 'center' },
  qtyQuick: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.brandTertiary },
  qtyQuickText: { color: colors.brandPrimary, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.onSurfaceSecondary },
  totalVal: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  confirmBtn: { marginTop: 16, paddingVertical: 16, borderRadius: 999, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
