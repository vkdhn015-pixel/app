import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function AdminTickets() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useFocusEffect(useCallback(() => { api.adminTickets().then(setItems).catch(() => {}); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>Support Tickets</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {items.map(t => (
          <View key={t.id} style={s.card} testID={`ticket-${t.id}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.name}>{t.subject}</Text>
              <View style={[s.pill, { backgroundColor: t.status === 'open' ? '#FFB020' : '#2ECA7F' }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t.status.toUpperCase()}</Text></View>
            </View>
            <Text style={s.msg}>{t.message}</Text>
            <Text style={s.meta}>{t.user_phone} · {new Date(t.created_at).toLocaleString()}</Text>
          </View>
        ))}
        {items.length === 0 && <Text style={{ textAlign: 'center', color: colors.onSurfaceMuted, marginTop: 40 }}>No tickets</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, ...shadows.soft },
  name: { fontWeight: '800', color: colors.onSurface, flex: 1, marginRight: 8 },
  msg: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 6 },
  meta: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
});
