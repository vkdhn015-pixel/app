import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function AdminBroadcast() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => { setLoading(true); try { await api.adminBroadcast(title, body); setTitle(''); setBody(''); setOk(true); setTimeout(() => setOk(false), 1500); } catch (e: any) { alert(e.message); } finally { setLoading(false); } };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title}>Broadcast Notification</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={s.card}>
          <Text style={s.lbl}>Title</Text>
          <TextInput testID="bcast-title" style={inputStyle.base} value={title} onChangeText={setTitle} placeholder="Big Weekend Cashback!" placeholderTextColor={colors.onSurfaceMuted} />
          <View style={{ height: 12 }} />
          <Text style={s.lbl}>Body</Text>
          <TextInput testID="bcast-body" style={[inputStyle.base, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} value={body} onChangeText={setBody} multiline placeholder="Every user will see this" placeholderTextColor={colors.onSurfaceMuted} />
        </View>
        <PrimaryButton testID="bcast-send" label={ok ? 'Sent ✓' : 'Send to all users'} onPress={send} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: '#fff', ...shadows.soft },
  title: { fontSize: 17, fontWeight: '800', color: colors.onSurface },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  lbl: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
});
