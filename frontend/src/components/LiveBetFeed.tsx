import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme';
import { api } from '@/src/api';

type Entry = { name: string; game: string; amount: number; multiplier?: number | null; real?: boolean };

const NAMES = ['RajaKing', 'LuckyStar', 'AceHunter', 'ProGamer', 'SkyWinner', 'GoldRush', 'RoyalAK', 'TigerZ', 'MegaWin', 'ThunderX', 'FastCash', 'DiamondD'];
function mask(n: string) { return n.length <= 3 ? n[0] + '**' : n.slice(0, 2) + '***' + n.slice(-1); }
function synth(game: string): Entry {
  return {
    name: mask(NAMES[Math.floor(Math.random() * NAMES.length)]),
    game,
    amount: Math.round([120, 250, 480, 999, 1500, 3200, 7800][Math.floor(Math.random() * 7)] * (0.5 + Math.random())),
    multiplier: Math.round((1.5 + Math.random() * 10) * 100) / 100,
    real: false,
  };
}

export default function LiveBetFeed({ game }: { game: string }) {
  const [items, setItems] = useState<Entry[]>([]);
  const timer = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    api.gamesFeed(game).then((d: any) => { if (mounted) setItems(d.feed || []); }).catch(() => {
      if (mounted) setItems(Array.from({ length: 12 }).map(() => synth(game)));
    });
    // liveliness: prepend a synthetic win every ~2.8s
    timer.current = setInterval(() => {
      setItems((prev) => [synth(game), ...prev].slice(0, 20));
    }, 2800);
    return () => { mounted = false; if (timer.current) clearInterval(timer.current); };
  }, [game]);

  return (
    <View style={styles.wrap} testID="live-bet-feed">
      <View style={styles.header}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE WINS</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {items.map((e, i) => (
          <View key={`${i}-${e.name}-${e.amount}`} style={styles.chip}>
            <View style={styles.avatar}><Ionicons name="person" size={11} color={colors.brandPrimary} /></View>
            <Text style={styles.name} numberOfLines={1}>{e.name}</Text>
            {e.multiplier ? <Text style={styles.mult}>{e.multiplier}x</Text> : null}
            <Text style={styles.amount}>+₹{e.amount}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ECA7F' },
  liveText: { fontSize: 11, fontWeight: '800', color: colors.onSurfaceSecondary, letterSpacing: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '700', color: colors.onSurface, maxWidth: 70 },
  mult: { fontSize: 11, fontWeight: '800', color: colors.warning },
  amount: { fontSize: 12, fontWeight: '800', color: colors.success },
});
