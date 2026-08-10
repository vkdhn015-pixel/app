import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';
import { inputStyle } from '@/src/ui';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => { try { setUsers(await api.adminUsers(q)); } catch {} }, [q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const adjust = async (uid: string, delta: number) => { try { await api.adminAdjust(uid, delta, 'Admin adjustment'); load(); } catch (e: any) { alert(e.message); } };
  const block = async (uid: string) => { try { await api.adminBlock(uid); load(); } catch (e: any) { alert(e.message); } };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>User Management</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TextInput testID="search-user" style={inputStyle.base} value={q} onChangeText={setQ} onSubmitEditing={load} placeholder="Search phone / UID / name" placeholderTextColor={colors.onSurfaceMuted} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {users.map(u => (
          <View key={u.id} style={s.card} testID={`user-${u.uid}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={s.av}><Text style={{ color: '#FF6B6B', fontWeight: '800' }}>{(u.name || '?').slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.name}>{u.name}</Text>
                <Text style={s.sub}>{u.phone} · UID {u.uid}</Text>
              </View>
              <Text style={s.bal}>₹{(u.balance || 0).toFixed(0)}</Text>
            </View>
            <View style={s.row2}>
              <Pressable testID={`credit-${u.id}`} onPress={() => adjust(u.id, 100)} style={[s.btn, { backgroundColor: '#2ECA7F' }]}><Text style={s.btnT}>+₹100</Text></Pressable>
              <Pressable testID={`debit-${u.id}`} onPress={() => adjust(u.id, -100)} style={[s.btn, { backgroundColor: '#FFB020' }]}><Text style={s.btnT}>-₹100</Text></Pressable>
              <Pressable testID={`block-${u.id}`} onPress={() => block(u.id)} style={[s.btn, { backgroundColor: u.blocked ? '#4A4A4A' : '#FF4D4F' }]}><Text style={s.btnT}>{u.blocked ? 'Unblock' : 'Block'}</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: 10, ...shadows.soft },
  av: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF5F4', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', color: colors.onSurface },
  sub: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  bal: { fontWeight: '800', color: colors.brandPrimary },
  row2: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 999 },
  btnT: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
