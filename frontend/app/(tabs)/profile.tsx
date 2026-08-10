import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api, setToken } from '@/src/api';

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  const load = useCallback(async () => { try { setMe(await api.me()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => { await setToken(null); router.replace('/(auth)/login'); };

  const items: Array<{ id: string; icon: any; label: string; onPress: () => void; color: string }> = [
    { id: 'settings', icon: 'settings-outline', label: 'Settings', onPress: () => router.push('/settings'), color: '#4A4A4A' },
    { id: 'notifications', icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/notifications'), color: '#FFB020' },
    { id: 'promotions', icon: 'pricetag-outline', label: 'Promotions', onPress: () => router.push('/promotions'), color: '#FF6B6B' },
    { id: 'vip', icon: 'diamond-outline', label: 'VIP & Rewards', onPress: () => router.push('/(tabs)/rewards'), color: '#2ECA7F' },
    { id: 'support', icon: 'headset-outline', label: 'Customer Support', onPress: () => router.push('/support'), color: '#5B8CFF' },
    { id: 'transactions', icon: 'receipt-outline', label: 'Transaction History', onPress: () => router.push('/transactions'), color: '#E53935' },
    { id: 'admin', icon: 'shield-checkmark-outline', label: 'Admin Panel', onPress: () => router.push('/admin/login'), color: '#4A4A4A' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']} style={styles.header}>
        <SafeAreaView edges={['top']} style={{ padding: spacing.lg }}>
          <View style={styles.profRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.name || '?').slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{me?.name || 'Player'}</Text>
              <Text style={styles.phone}>{me?.phone}</Text>
              <View style={styles.uidPill}><Text style={styles.uidText}>UID {me?.uid}</Text></View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }}>
        <View style={{ gap: 10 }}>
          {items.map(it => (
            <Pressable key={it.id} testID={`profile-${it.id}`} onPress={it.onPress} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: it.color + '1F' }]}>
                <Ionicons name={it.icon} size={20} color={it.color} />
              </View>
              <Text style={styles.rowLabel}>{it.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
            </Pressable>
          ))}
        </View>
        <Pressable testID="logout-btn" onPress={logout} style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color="#FF4D4F" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  profRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FF6B6B', fontSize: 28, fontWeight: '800' },
  name: { color: '#fff', fontSize: 20, fontWeight: '800' },
  phone: { color: 'rgba(255,255,255,0.9)', marginTop: 2, fontSize: 13 },
  uidPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  uidText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, ...shadows.soft },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.onSurface },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.xl, padding: spacing.md, backgroundColor: '#FDECEC', borderRadius: 999 },
  logoutText: { color: '#FF4D4F', fontWeight: '800' },
});
