import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'crash', name: 'Crash' },
  { id: 'cards', name: 'Cards' },
  { id: 'dice', name: 'Dice' },
  { id: 'number', name: 'Number' },
  { id: 'spin', name: 'Spin' },
  { id: 'arcade', name: 'Arcade' },
  { id: 'puzzle', name: 'Puzzle' },
  { id: 'casual', name: 'Casual' },
  { id: 'skill', name: 'Skill' },
  { id: 'tournament', name: 'Tournaments' },
];

const GAMES = [
  { id: 'crash', title: 'Crash', tag: 'crash', icon: 'rocket', color: '#FF6B6B', playable: true },
  { id: 'aviator', title: 'Aviator', tag: 'crash', icon: 'airplane', color: '#5B8CFF', playable: true },
  { id: 'dice', title: 'Lucky Dice', tag: 'dice', icon: 'dice', color: '#FFB020', playable: true },
  { id: 'spin', title: 'Spin Wheel', tag: 'spin', icon: 'sync-circle', color: '#2ECA7F', playable: true },
  { id: 'andar-bahar', title: 'Andar Bahar', tag: 'cards', icon: 'albums', color: '#4A4A4A', playable: false },
  { id: 'teenpatti', title: 'Teen Patti', tag: 'cards', icon: 'grid', color: '#E53935', playable: false },
  { id: 'number-king', title: 'Number King', tag: 'number', icon: 'apps', color: '#FF7E67', playable: false },
  { id: 'plinko', title: 'Plinko', tag: 'arcade', icon: 'game-controller', color: '#FF9A9E', playable: false },
  { id: 'mines', title: 'Mines', tag: 'arcade', icon: 'flame', color: '#FF6B6B', playable: false },
  { id: 'sudoku', title: 'Sudoku', tag: 'puzzle', icon: 'grid-outline', color: '#5B8CFF', playable: false },
  { id: 'match3', title: 'Match Three', tag: 'casual', icon: 'shapes', color: '#FFB020', playable: false },
  { id: 'archery', title: 'Bull\'s Eye', tag: 'skill', icon: 'radio-button-on', color: '#2ECA7F', playable: false },
  { id: 'weekly-cup', title: 'Weekly Cup', tag: 'tournament', icon: 'trophy', color: '#E53935', playable: false },
];

export default function Games() {
  const router = useRouter();
  const [cat, setCat] = useState('all');

  const filtered = cat === 'all' ? GAMES : GAMES.filter(g => g.tag === cat);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerInner}>
          <Text style={styles.title}>Game Lobby</Text>
          <Text style={styles.sub}>Choose your game and start winning</Text>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {CATEGORIES.map(c => (
            <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => setCat(c.id)} style={[styles.chip, cat === c.id && styles.chipActive]}>
              <Text style={[styles.chipLabel, cat === c.id && styles.chipLabelActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <View style={styles.grid}>
          {filtered.map(g => (
            <Pressable
              key={g.id}
              testID={`game-${g.id}`}
              onPress={() => (g.playable ? router.push(`/game/${g.id}`) : router.push({ pathname: '/game/coming-soon', params: { title: g.title } }))}
              style={styles.card}
            >
              <LinearGradient colors={[g.color + 'CC', g.color]} style={styles.thumb}>
                <Ionicons name={g.icon as any} size={40} color="#fff" />
                {!g.playable && (
                  <View style={styles.badge}><Text style={styles.badgeText}>SOON</Text></View>
                )}
              </LinearGradient>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardTag}>{g.tag.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  title: { color: '#fff', fontSize: 26, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.92)', marginTop: 4, fontSize: 13 },
  chipsWrap: { height: 56, backgroundColor: '#fff', justifyContent: 'center', ...shadows.soft },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipLabel: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary },
  chipLabelActive: { color: colors.brandPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.lg },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  thumb: { height: 110, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardTitle: { marginTop: 10, fontSize: 15, fontWeight: '800', color: colors.onSurface },
  cardTag: { fontSize: 11, color: colors.onSurfaceMuted, fontWeight: '700', marginTop: 2 },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
