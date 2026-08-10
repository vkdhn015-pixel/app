import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useFocusEffect(useCallback(() => { api.notifications().then(setItems).catch(() => {}); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={s.h}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={s.t}>Notifications</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {items.length === 0 ? (
          <View style={s.empty}><Ionicons name="notifications-off-outline" size={48} color={colors.onSurfaceMuted} /><Text style={s.emptyText}>No notifications</Text></View>
        ) : items.map(n => (
          <Pressable key={n.id} onPress={() => api.markRead(n.id)} style={[s.row, !n.read && s.rowUnread]} testID={`notif-${n.id}`}>
            <View style={[s.icon, { backgroundColor: '#FFF5F4' }]}><Ionicons name="notifications" size={18} color="#FF6B6B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.tt}>{n.title}</Text>
              <Text style={s.bb}>{n.body}</Text>
              <Text style={s.dd}>{new Date(n.created_at).toLocaleString()}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  t: { color: '#fff', fontSize: 18, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 12, color: colors.onSurfaceMuted },
  row: { flexDirection: 'row', backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, marginBottom: 8, ...shadows.soft },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: colors.brandPrimary },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tt: { fontWeight: '800', color: colors.onSurface, fontSize: 14 },
  bb: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  dd: { fontSize: 11, color: colors.onSurfaceMuted, marginTop: 4 },
});
