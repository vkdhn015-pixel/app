import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, withDelay,
  withSpring, Easing, cancelAnimation, FadeInDown, FadeIn, ZoomIn, runOnJS,
} from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';
import LiveBetFeed from '@/src/components/LiveBetFeed';

const TITLES: Record<string, { title: string; color: string; icon: any }> = {
  crash: { title: 'Crash', color: '#FF6B6B', icon: 'rocket' },
  aviator: { title: 'Aviator', color: '#5B8CFF', icon: 'airplane' },
  dice: { title: 'Lucky Dice', color: '#FFB020', icon: 'dice' },
  spin: { title: 'Spin Wheel', color: '#2ECA7F', icon: 'sync-circle' },
  'andar-bahar': { title: 'Andar Bahar', color: '#4A4A4A', icon: 'albums' },
  teenpatti: { title: 'Teen Patti', color: '#E53935', icon: 'grid' },
  'number-king': { title: 'Number King', color: '#FF7E67', icon: 'apps' },
  plinko: { title: 'Plinko', color: '#FF9A9E', icon: 'game-controller' },
  mines: { title: 'Mines', color: '#FF6B6B', icon: 'flame' },
  sudoku: { title: 'Sudoku', color: '#5B8CFF', icon: 'grid-outline' },
  match3: { title: 'Match Three', color: '#FFB020', icon: 'shapes' },
  bullseye: { title: 'Bull\'s Eye', color: '#2ECA7F', icon: 'radio-button-on' },
  tournament: { title: 'Weekly Cup', color: '#E53935', icon: 'trophy' },
};

const SPIN_SEGMENTS = [0, 1.5, 0, 2, 0, 3, 0, 5];

// ---- Small particle burst for celebrations (lightweight, max 10) ----
function Particles({ show, color }: { show: number; color: string }) {
  if (!show) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 10 }).map((_, i) => (
        <Particle key={`${show}-${i}`} index={i} color={color} />
      ))}
    </View>
  );
}
function Particle({ index, color }: { index: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }); }, []);
  const angle = (index / 10) * Math.PI * 2;
  const st = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * 90 * p.value },
      { translateY: Math.sin(angle) * 90 * p.value },
      { scale: 1 - p.value * 0.5 },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', top: '46%', left: '48%', width: 10, height: 10, borderRadius: 5, backgroundColor: color }, st]} />
  );
}

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
  const [abPick, setAbPick] = useState<'andar' | 'bahar'>('andar');
  const [numberPick, setNumberPick] = useState(5);
  const [minePicks, setMinePicks] = useState(3);

  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<string>('READY');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveMult, setLiveMult] = useState('1.00');
  const [revealCount, setRevealCount] = useState(0); // for mines/cards sequential reveal
  const [celebrate, setCelebrate] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [history, setHistory] = useState<Array<{ win: boolean; label: string }>>([]);
  const [flying, setFlying] = useState(false);
  const isCrash = gt === 'crash' || gt === 'aviator';

  const multTimer = useRef<any>(null);
  const revealTimer = useRef<any>(null);
  const cdTimer = useRef<any>(null);
  const climbTimer = useRef<any>(null);
  const pollTimer = useRef<any>(null);
  const roundRef = useRef<{ id: string; start: number; auto: number | null } | null>(null);
  const cashingRef = useRef(false);

  // reanimated shared values
  const fly = useSharedValue(0);        // crash/aviator climb 0..1
  const rotate = useSharedValue(0);     // spin wheel deg
  const diceRot = useSharedValue(0);    // dice rotation
  const diceBounce = useSharedValue(0); // dice bounce
  const bgShift = useSharedValue(0);    // dynamic bg
  const cardFlip = useSharedValue(0);   // 0..1 flip
  const ballDrop = useSharedValue(0);   // plinko 0..1
  const dartFly = useSharedValue(0);    // bullseye 0..1
  const resultPulse = useSharedValue(1);

  useEffect(() => {
    api.me().then((m) => setBalance(m?.balance ?? 0));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const clearTimers = useCallback(() => {
    [multTimer, revealTimer, cdTimer, climbTimer, pollTimer].forEach((t) => { if (t.current) { clearInterval(t.current); clearTimeout(t.current); t.current = null; } });
  }, []);

  useEffect(() => () => { clearTimers(); [fly, rotate, diceRot, diceBounce, bgShift, cardFlip, ballDrop, dartFly].forEach(cancelAnimation); }, []);

  const finishRound = (res: any, label: string) => {
    setDisplay(label);
    setHistory((h) => [{ win: res.win, label }, ...h].slice(0, 8));
    if (res.win) {
      setCelebrate((c) => c + 1);
      resultPulse.value = withSequence(withTiming(1.08, { duration: 160 }), withSpring(1));
    }
    setBusy(false);
  };

  const runAnimationFor = (res: any) => {
    const r = res.result;
    // Reduced motion: skip visuals, show result immediately
    if (reduceMotion) {
      finishRound(res, labelFor(gt, res));
      return;
    }

    if (gt === 'spin') {
      const idx = r.segment_index || 0;
      rotate.value = 0;
      rotate.value = withTiming(360 * 5 + (360 - idx * 45), { duration: 2600, easing: Easing.out(Easing.cubic) });
      cdTimer.current = setTimeout(() => finishRound(res, res.win ? `WON x${r.segment_multiplier}` : 'NO WIN'), 2650);
    } else if (gt === 'dice') {
      diceRot.value = withTiming(360 * 3, { duration: 1100, easing: Easing.out(Easing.cubic) });
      diceBounce.value = withSequence(
        withTiming(-40, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 250, easing: Easing.bounce }),
        withTiming(-20, { duration: 200 }),
        withTiming(0, { duration: 250, easing: Easing.bounce }),
      );
      cdTimer.current = setTimeout(() => { diceRot.value = 0; finishRound(res, `ROLLED ${r.roll}`); }, 1150);
    } else if (gt === 'andar-bahar' || gt === 'teenpatti') {
      // shuffle then flip
      cardFlip.value = 0;
      cardFlip.value = withDelay(500, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
      cdTimer.current = setTimeout(() => finishRound(res, labelFor(gt, res)), 1050);
    } else if (gt === 'number-king') {
      // quick number shuffle
      let ticks = 0;
      setLiveMult(String(Math.floor(Math.random() * 10)));
      multTimer.current = setInterval(() => {
        ticks++;
        setLiveMult(String(Math.floor(Math.random() * 10)));
        if (ticks > 14) { clearInterval(multTimer.current); multTimer.current = null; setLiveMult(String(r.roll)); finishRound(res, `ROLLED ${r.roll}`); }
      }, 70);
    } else if (gt === 'plinko') {
      ballDrop.value = 0;
      ballDrop.value = withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) });
      cdTimer.current = setTimeout(() => finishRound(res, `x${r.multiplier}`), 1450);
    } else if (gt === 'mines') {
      setRevealCount(0);
      let i = 0;
      revealTimer.current = setInterval(() => {
        i++; setRevealCount(i);
        if (i >= (r.revealed?.length || minePicks)) { clearInterval(revealTimer.current); revealTimer.current = null; finishRound(res, res.win ? `SAFE x${r.multiplier}` : 'BOOM!'); }
      }, 320);
    } else if (gt === 'match3') {
      // reels spin briefly
      let ticks = 0;
      multTimer.current = setInterval(() => {
        ticks++;
        if (ticks > 12) { clearInterval(multTimer.current); multTimer.current = null; finishRound(res, (r.board || []).join(' ')); }
        else setDisplay('...');
      }, 80);
    } else if (gt === 'bullseye') {
      dartFly.value = 0;
      dartFly.value = withTiming(1, { duration: 900, easing: Easing.in(Easing.cubic) });
      cdTimer.current = setTimeout(() => finishRound(res, (r.ring || 'MISS').toUpperCase()), 950);
    } else {
      cdTimer.current = setTimeout(() => finishRound(res, labelFor(gt, res)), 900);
    }
  };

  // ---- Interactive Crash / Aviator ----
  const CURVE_A = 0.35, CURVE_B = 0.09;
  const multAt = (elapsedS: number) => 1 + CURVE_A * elapsedS + CURVE_B * elapsedS * elapsedS;

  const endCrashRound = () => {
    if (climbTimer.current) { clearInterval(climbTimer.current); climbTimer.current = null; }
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    setFlying(false);
    bgShift.value = withTiming(0, { duration: 300 });
  };

  const onCrash = (crashPoint?: number) => {
    if (cashingRef.current) return;
    cashingRef.current = true;
    endCrashRound();
    // explosion: drop back down
    fly.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) });
    setResult({ win: false, payout: 0, result: {} });
    finishRound({ win: false }, crashPoint ? `CRASHED @ ${crashPoint.toFixed(2)}x` : 'CRASHED');
    if (roundRef.current) api.crashSettle(roundRef.current.id).catch(() => {});
  };

  const doCashout = async (atMult: number) => {
    if (cashingRef.current || !roundRef.current) return;
    cashingRef.current = true;
    const rid = roundRef.current.id;
    endCrashRound();
    try {
      const res = await api.crashCashout(rid, Number(atMult.toFixed(2)));
      setBalance(res.balance);
      if (res.win) {
        setResult({ win: true, payout: res.payout, result: { multiplier: res.multiplier } });
        setLiveMult(res.multiplier.toFixed(2));
        finishRound({ win: true }, `CASHED @ ${res.multiplier}x`);
      } else {
        setResult({ win: false, payout: 0, result: {} });
        finishRound({ win: false }, `CRASHED @ ${(res.crash_point || 0).toFixed(2)}x`);
      }
    } catch (e: any) {
      setError(e.message || 'Cash-out failed');
      finishRound({ win: false }, 'ERROR');
    }
  };

  const startCrashRound = async (amt: number) => {
    try {
      const auto = parseFloat(cashOut);
      const autoVal = !isNaN(auto) && auto > 1 ? auto : null;
      const res = await api.crashStart(amt, gt, autoVal);
      setBalance(res.balance);
      roundRef.current = { id: res.round_id, start: Date.now(), auto: autoVal };
      cashingRef.current = false;
      setResult(null);
      setFlying(true);
      setLiveMult('1.00');
      setDisplay('FLYING');
      fly.value = 0;
      bgShift.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);

      // local climb + auto cash-out
      climbTimer.current = setInterval(() => {
        if (!roundRef.current) return;
        const t = (Date.now() - roundRef.current.start) / 1000;
        const m = multAt(t);
        setLiveMult(m.toFixed(2));
        fly.value = Math.min(1, (m - 1) / 10);
        if (roundRef.current.auto && m >= roundRef.current.auto && !cashingRef.current) {
          doCashout(roundRef.current.auto);
        }
      }, 40);

      // poll server for crash (server is authoritative, crash point hidden)
      pollTimer.current = setInterval(async () => {
        if (!roundRef.current || cashingRef.current) return;
        try {
          const st = await api.crashStatus(roundRef.current.id);
          if (st.status === 'crashed') onCrash(st.crash_point);
        } catch {}
      }, 350);
    } catch (e: any) {
      setError(e.message || 'Could not start round'); setDisplay('ERROR'); setBusy(false); setFlying(false);
    }
  };

  const play = async () => {
    if (busy) return; // prevent duplicate taps
    const amt = parseFloat(bet) || 0;
    if (amt <= 0) { setError('Enter a valid bet amount'); return; }
    if (amt > balance) { setError('Insufficient balance'); return; }
    setError(null); setBusy(true); setResult(null); setDisplay('...');
    clearTimers();

    const startRound = async () => {
      if (isCrash) { await startCrashRound(amt); return; }
      try {
        const params: any = {};
        if (gt === 'dice') { params.pick = pick; params.threshold = threshold; }
        if (gt === 'andar-bahar') params.pick = abPick;
        if (gt === 'number-king') params.number = numberPick;
        if (gt === 'mines') params.picks = minePicks;
        const res = await api.play({ game_type: gt, bet_amount: amt, params });
        setBalance(res.balance);
        setResult(res);
        runAnimationFor(res);
      } catch (e: any) {
        setError(e.message || 'Something went wrong'); setDisplay('ERROR'); setBusy(false);
      }
    };

    // Countdown for crash/aviator, else straight to round
    if (isCrash && !reduceMotion) {
      let c = 3; setCountdown(c);
      cdTimer.current = setInterval(() => {
        c -= 1;
        if (c <= 0) { clearInterval(cdTimer.current); cdTimer.current = null; setCountdown(null); startRound(); }
        else setCountdown(c);
      }, 700);
    } else {
      startRound();
    }
  };

  // ---- animated styles ----
  const flyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -fly.value * 150 }, { translateX: fly.value * 60 }, { rotate: `${-fly.value * 12}deg` }] }));
  const bgStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -bgShift.value * 40 }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));
  const diceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: diceBounce.value }, { rotate: `${diceRot.value}deg` }] }));
  const flipStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 600 }, { rotateY: `${(1 - cardFlip.value) * 180}deg` }], opacity: cardFlip.value < 0.5 ? 0.4 : 1 }));
  const ballStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ballDrop.value * 120 }, { translateX: Math.sin(ballDrop.value * 12) * 30 }] }));
  const dartStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - dartFly.value * 0.7 }], opacity: 0.4 + dartFly.value * 0.6 }));
  const resultStyle = useAnimatedStyle(() => ({ transform: [{ scale: resultPulse.value }] }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={[meta.color + 'DD', meta.color]}>
        <SafeAreaView edges={['top']} style={styles.h}>
          <Pressable onPress={() => router.back()} testID="game-back"><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={styles.title}>{meta.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="wallet-outline" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }} testID="game-balance">₹{balance.toFixed(2)}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        {/* Live bet feed */}
        <LiveBetFeed game={gt} />
        {/* Game stage */}
        <View style={styles.stage}>
          <LinearGradient colors={['#1F2937', '#111827']} style={styles.stageBg}>
            {/* dynamic drifting bg dots for crash/aviator */}
            {(gt === 'crash' || gt === 'aviator') && (
              <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={{ position: 'absolute', top: 20 + i * 34, left: 40 + i * 48, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                ))}
              </Animated.View>
            )}

            {countdown !== null ? (
              <Animated.Text key={countdown} entering={ZoomIn.duration(300)} style={styles.countdown} testID="countdown">{countdown}</Animated.Text>
            ) : (
              <>
                {(gt === 'crash' || gt === 'aviator') && (
                  <>
                    <Animated.View style={flyStyle}><Ionicons name={meta.icon} size={72} color="#fff" /></Animated.View>
                    {(flying || busy) && <Text style={[styles.liveMult, !flying && result && !result.win && { color: '#FF4D4F' }]}>{liveMult}x</Text>}
                  </>
                )}

                {gt === 'spin' && (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <View style={styles.pointer} />
                    <Animated.View style={[styles.wheel, spinStyle]}>
                      {SPIN_SEGMENTS.map((m, i) => (
                        <View key={i} style={[styles.wheelSeg, { transform: [{ rotate: `${i * 45}deg` }], backgroundColor: i % 2 ? '#FF6B6B' : '#FFB020' }]}>
                          <Text style={styles.wheelText}>{m || '×'}</Text>
                        </View>
                      ))}
                    </Animated.View>
                  </View>
                )}

                {gt === 'dice' && (
                  <View style={styles.diceBox}>
                    <Animated.View style={diceStyle}><Ionicons name="dice" size={100} color="#fff" /></Animated.View>
                    <Text style={styles.rollText} testID="dice-roll">{result?.result?.roll ?? '—'}</Text>
                  </View>
                )}

                {(gt === 'andar-bahar' || gt === 'teenpatti') && (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {[0, 1, 2].slice(0, gt === 'teenpatti' ? 3 : 2).map((i) => (
                        <Animated.View key={i} style={[styles.cardBox, flipStyle]}>
                          <Ionicons name={gt === 'teenpatti' ? 'heart' : 'albums'} size={34} color={meta.color} />
                        </Animated.View>
                      ))}
                    </View>
                    {result && (
                      <Text style={{ color: '#fff', marginTop: 14, fontWeight: '800' }}>
                        {gt === 'teenpatti' ? result.result.player_hand : `Winner: ${(result.result.winner || '').toUpperCase()}`}
                      </Text>
                    )}
                  </View>
                )}

                {gt === 'number-king' && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.bigNumber} testID="number-roll">{busy ? liveMult : (result?.result?.roll ?? '?')}</Text>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Your pick: {numberPick}</Text>
                  </View>
                )}

                {gt === 'plinko' && (
                  <View style={{ alignItems: 'center' }}>
                    <Animated.View style={ballStyle}><Ionicons name="ellipse" size={26} color="#FFD700" /></Animated.View>
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 60 }}>
                      {[10, 4, 2, 1.2, 0.5, 1.2, 2, 4, 10].map((m, i) => (
                        <View key={i} style={[styles.plinkoSlot, result?.result?.slot === i && !busy && { backgroundColor: '#FFD700' }]}>
                          <Text style={styles.plinkoText}>{m}x</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {gt === 'mines' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(result?.result?.revealed || Array(minePicks).fill('?')).map((v: string, i: number) => {
                      const shown = !busy || i < revealCount;
                      return (
                        <Animated.View key={i} entering={FadeIn} style={[styles.mineTile, shown && v === 'gem' && { backgroundColor: '#2ECA7F' }, shown && v === 'mine' && { backgroundColor: '#FF4D4F' }]}>
                          <Ionicons name={!shown ? 'help' : v === 'gem' ? 'diamond' : v === 'mine' ? 'flame' : 'help'} size={24} color="#fff" />
                        </Animated.View>
                      );
                    })}
                  </View>
                )}

                {gt === 'match3' && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(result && !busy ? result.result.board : ['?', '?', '?']).map((sVal: string, i: number) => (
                      <Animated.View key={`${sVal}-${i}-${celebrate}`} entering={FadeInDown} style={styles.slot}><Text style={styles.slotText}>{busy ? '?' : sVal}</Text></Animated.View>
                    ))}
                  </View>
                )}

                {gt === 'bullseye' && (
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: 130, height: 130 }}>
                    {[120, 90, 60, 32].map((sz, i) => (
                      <View key={i} style={{ width: sz, height: sz, borderRadius: sz / 2, position: 'absolute', backgroundColor: ['#fff', '#5B8CFF', '#FFB020', '#FF4D4F'][i], alignItems: 'center', justifyContent: 'center' }} />
                    ))}
                    <Animated.View style={[{ position: 'absolute' }, dartStyle]}><Ionicons name="locate" size={28} color="#111" /></Animated.View>
                  </View>
                )}

                {gt === 'sudoku' && (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="grid" size={80} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', marginTop: 8 }}>{busy ? 'Solving…' : 'Complete the grid'}</Text>
                  </View>
                )}

                {gt === 'tournament' && (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="trophy" size={72} color="#FFD700" />
                    <Text style={{ color: '#fff', fontWeight: '800', marginTop: 4, fontSize: 22 }}>#{result?.result?.rank ?? '?'}</Text>
                  </View>
                )}

                <Text style={styles.display} testID="game-display">{display}</Text>
              </>
            )}

            <Particles show={celebrate} color={meta.color} />
          </LinearGradient>
        </View>

        {/* Round history */}
        {history.length > 0 && (
          <View style={styles.historyRow}>
            {history.map((h, i) => (
              <Animated.View key={`${i}-${h.label}`} entering={FadeInDown.duration(250)} style={[styles.histChip, { backgroundColor: h.win ? '#E7F8EE' : '#FDECEC' }]}>
                <Text style={[styles.histText, { color: h.win ? '#2ECA7F' : '#FF4D4F' }]} numberOfLines={1}>{h.win ? 'W' : 'L'}</Text>
              </Animated.View>
            ))}
          </View>
        )}

        {result && !busy && (
          <Animated.View style={[styles.resultBox, resultStyle, { backgroundColor: result.win ? '#E7F8EE' : '#FDECEC' }]} testID="game-result">
            <Ionicons name={result.win ? 'trophy' : 'sad-outline'} size={22} color={result.win ? '#2ECA7F' : '#FF4D4F'} />
            <Text style={[styles.resultText, { color: result.win ? '#2ECA7F' : '#FF4D4F' }]}>
              {result.win ? `You won ₹${result.payout.toFixed(2)}` : 'Better luck next time!'}
            </Text>
          </Animated.View>
        )}

        {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={18} color="#FF4D4F" /><Text style={styles.errorText}>{error}</Text></View>}

        {/* Controls */}
        <View style={styles.controls}>
          <Text style={styles.label}>Bet Amount (₹)</Text>
          <TextInput testID="game-bet" style={inputStyle.base} value={bet} onChangeText={setBet} keyboardType="number-pad" editable={!busy} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {[10, 50, 100, 500, 1000].map(v => (
              <Pressable key={v} disabled={busy} onPress={() => setBet(String(v))} style={styles.chip} testID={`bet-${v}`}><Text style={styles.chipText}>₹{v}</Text></Pressable>
            ))}
          </ScrollView>

          {(gt === 'crash' || gt === 'aviator') && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Auto Cash-Out (×)</Text>
              <TextInput testID="cash-out" style={inputStyle.base} value={cashOut} onChangeText={setCashOut} keyboardType="decimal-pad" editable={!busy} />
            </View>
          )}

          {gt === 'dice' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Prediction</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable testID="pick-under" disabled={busy} onPress={() => setPick('under')} style={[styles.pickBtn, pick === 'under' && styles.pickActive]}><Text style={[styles.pickText, pick === 'under' && { color: '#fff' }]}>Under {threshold}</Text></Pressable>
                <Pressable testID="pick-over" disabled={busy} onPress={() => setPick('over')} style={[styles.pickBtn, pick === 'over' && styles.pickActive]}><Text style={[styles.pickText, pick === 'over' && { color: '#fff' }]}>Over {threshold}</Text></Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                {[25, 50, 75].map(t => <Pressable key={t} disabled={busy} onPress={() => setThreshold(t)} style={[styles.chip, threshold === t && { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary }]} testID={`th-${t}`}><Text style={styles.chipText}>{t}</Text></Pressable>)}
              </View>
            </View>
          )}

          {gt === 'andar-bahar' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Pick a Side</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['andar', 'bahar'] as const).map(k => (
                  <Pressable key={k} testID={`ab-${k}`} disabled={busy} onPress={() => setAbPick(k)} style={[styles.pickBtn, abPick === k && styles.pickActive]}><Text style={[styles.pickText, abPick === k && { color: '#fff' }]}>{k.toUpperCase()}</Text></Pressable>
                ))}
              </View>
            </View>
          )}

          {gt === 'number-king' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Pick a Number (0-9) · Payout 9x</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: 10 }).map((_, n) => (
                  <Pressable key={n} testID={`num-${n}`} disabled={busy} onPress={() => setNumberPick(n)} style={[styles.numBtn, numberPick === n && styles.numBtnA]}>
                    <Text style={[styles.numTxt, numberPick === n && { color: '#fff' }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {gt === 'mines' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Tiles to reveal (higher = bigger reward)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Pressable key={n} testID={`picks-${n}`} disabled={busy} onPress={() => setMinePicks(n)} style={[styles.numBtn, minePicks === n && styles.numBtnA]}>
                    <Text style={[styles.numTxt, minePicks === n && { color: '#fff' }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 16 }} />
          {isCrash && flying ? (
            <Pressable testID="cash-out-btn" onPress={() => doCashout(parseFloat(liveMult))} style={styles.cashOutBtn}>
              <Ionicons name="hand-left" size={20} color="#fff" />
              <Text style={styles.cashOutText}>CASH OUT · {liveMult}x</Text>
              <Text style={styles.cashOutSub}>₹{((parseFloat(bet) || 0) * parseFloat(liveMult)).toFixed(0)}</Text>
            </Pressable>
          ) : (
            <PrimaryButton testID="play-btn" label={busy ? (isCrash ? 'Launching…' : 'Playing…') : `Place Bet · ₹${bet || 0}`} onPress={play} loading={busy && !isCrash} disabled={busy} />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function labelFor(gt: string, res: any): string {
  const r = res.result || {};
  switch (gt) {
    case 'crash': return res.win ? `CASHED @ ${r.cash_out}x` : `CRASHED @ ${(r.crash_at || 0).toFixed(2)}x`;
    case 'aviator': return res.win ? `CASHED @ ${r.cash_out}x` : `FLEW @ ${(r.fly_to || 0).toFixed(2)}x`;
    case 'dice': return `ROLLED ${r.roll}`;
    case 'andar-bahar': return `WINNER: ${(r.winner || '').toUpperCase()}`;
    case 'teenpatti': return res.win ? `WIN · ${r.player_hand}` : `${r.player_hand}`;
    case 'number-king': return `ROLLED ${r.roll}`;
    case 'plinko': return `x${r.multiplier}`;
    case 'mines': return res.win ? `SAFE x${r.multiplier}` : 'BOOM!';
    case 'match3': return (r.board || []).join(' ');
    case 'bullseye': return (r.ring || 'MISS').toUpperCase();
    case 'sudoku': return res.win ? 'SOLVED!' : 'TIME OUT';
    case 'tournament': return `RANK #${r.rank}`;
    default: return res.win ? 'WIN' : 'LOSE';
  }
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
        <Text style={{ marginTop: 8, color: colors.onSurfaceMuted }}>This game is coming very soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  stage: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, ...shadows.strong },
  stageBg: { height: 260, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  display: { position: 'absolute', top: 16, right: 16, color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  countdown: { color: '#fff', fontSize: 90, fontWeight: '800' },
  liveMult: { position: 'absolute', color: '#FFD700', fontSize: 34, fontWeight: '800' },
  bigNumber: { color: '#FFD700', fontSize: 90, fontWeight: '800' },
  pointer: { position: 'absolute', top: 26, zIndex: 2, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' },
  wheel: { width: 172, height: 172, borderRadius: 86, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
  wheelSeg: { position: 'absolute', width: 172, height: 86, top: 0, transformOrigin: '50% 100%', alignItems: 'center', paddingTop: 8 },
  wheelText: { color: '#fff', fontWeight: '800' },
  diceBox: { alignItems: 'center' },
  rollText: { color: '#fff', fontSize: 40, fontWeight: '800', marginTop: 8 },
  cardBox: { width: 62, height: 88, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  tpCard: { width: 50, height: 72, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  plinkoSlot: { width: 24, height: 26, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  plinkoText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  mineTile: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  slot: { width: 60, height: 72, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  slotText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  ring: {},
  historyRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
  histChip: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  histText: { fontWeight: '800', fontSize: 12 },
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, marginBottom: spacing.md },
  resultText: { fontSize: 15, fontWeight: '800' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FDECEC', padding: 12, borderRadius: radius.md, marginBottom: spacing.md },
  errorText: { color: '#FF4D4F', fontWeight: '700', flex: 1 },
  controls: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipText: { fontWeight: '800', color: colors.onSurface },
  pickBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  pickActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pickText: { fontWeight: '800', color: colors.onSurface },
  numBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  numBtnA: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  numTxt: { fontWeight: '800', color: colors.onSurface },
  cashOutBtn: { minHeight: 56, borderRadius: radius.pill, backgroundColor: '#2ECA7F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  cashOutText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  cashOutSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800' },
});
