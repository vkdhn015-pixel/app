import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function Support() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => { try { setTickets(await api.myTickets()); } catch {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setMsg(null);
    if (!subject.trim() || !message.trim()) { setMsg({ ok: false, text: 'Fill all fields' }); return; }
    setLoading(true);
    try { await api.createTicket(subject.trim(), message.trim()); setSubject(''); setMessage(''); setMsg({ ok: true, text: 'Ticket submitted' }); load(); }
    catch (e: any) { setMsg({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Customer Support</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Text style={s.label}>Subject</Text>
          <TextInput testID="support-subject" style={inputStyle.base} value={subject} onChangeText={setSubject} placeholder="Deposit not credited..." placeholderTextColor={colors.onSurfaceMuted} />
          <View style={{ height: 12 }} />
          <Text style={s.label}>Message</Text>
          <TextInput testID="support-message" style={[inputStyle.base, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]} value={message} onChangeText={setMessage} placeholder="Describe your issue" placeholderTextColor={colors.onSurfaceMuted} multiline />
        </View>
        {msg && <View style={[s.msg, { backgroundColor: msg.ok ? '#E7F8EE' : '#FDECEC' }]}><Text style={{ color: msg.ok ? '#2ECA7F' : '#FF4D4F', fontWeight: '700' }}>{msg.text}</Text></View>}
        <PrimaryButton testID="support-submit" label="Submit Ticket" onPress={submit} loading={loading} />
        <Text style={s.section}>Your tickets</Text>
        {tickets.length === 0 ? <Text style={{ color: colors.onSurfaceMuted, textAlign: 'center' }}>No tickets yet</Text> : tickets.map(t => (
          <View key={t.id} style={s.card2}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '800', color: colors.onSurface, flex: 1 }}>{t.subject}</Text>
              <View style={[s.statusPill, { backgroundColor: t.status === 'open' ? '#FFB020' : '#2ECA7F' }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{t.status.toUpperCase()}</Text></View>
            </View>
            <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 4 }}>{t.message}</Text>
            <Text style={{ fontSize: 11, color: colors.onSurfaceMuted, marginTop: 6 }}>{new Date(t.created_at).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  card2: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginTop: 8, ...shadows.soft },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  msg: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  section: { fontSize: 16, fontWeight: '800', color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
});
