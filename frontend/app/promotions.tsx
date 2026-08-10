import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { api } from '@/src/api';

export default function Promotions() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useFocusEffect(useCallback(() => { api.promotions().then(setItems).catch(() => {}); }, []));
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Promotions</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }}>
        {items.map(p => (
          <LinearGradient key={p.id} colors={['#FF9A9E', '#FF6B6B']} style={{ borderRadius: radius.lg, padding: spacing.lg, ...shadows.card }} testID={`promo-${p.code}`}>
            <Ionicons name="pricetag" size={26} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 }}>{p.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.95)', marginTop: 4 }}>{p.subtitle}</Text>
            <View style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontWeight: '800', letterSpacing: 1 }}>{p.code}</Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
    </View>
  );
}
