import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/src/theme';
import { PrimaryButton, inputStyle } from '@/src/ui';
import { api } from '@/src/api';

export default function Settings() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState('');
  const [notifs, setNotifs] = useState(true);
  const [sound, setSound] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.me().then(m => { setMe(m); setName(m?.name || ''); }); }, []);

  const save = async () => { await api.updateMe({ name }); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <LinearGradient colors={['#FFB99D', '#FF6B6B']}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg }}>
          <Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Settings</Text>
          <View style={{ width: 22 }} />
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={s.card}>
          <Text style={s.label}>Display Name</Text>
          <TextInput testID="settings-name" style={inputStyle.base} value={name} onChangeText={setName} />
          <View style={{ height: 12 }} />
          <PrimaryButton testID="settings-save" label={saved ? 'Saved ✓' : 'Save Changes'} onPress={save} />
        </View>
        <View style={s.card}>
          <Row label="Push Notifications" value={notifs} onChange={setNotifs} testID="settings-notifs" />
          <Row label="Sound Effects" value={sound} onChange={setSound} testID="settings-sound" />
        </View>
        <View style={s.card}>
          <Text style={s.label}>Account</Text>
          <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 4 }}>Phone: {me?.phone}</Text>
          <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 2 }}>UID: {me?.uid}</Text>
          <Text style={{ color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 2 }}>Joined: {me?.created_at ? new Date(me.created_at).toLocaleDateString() : ''}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, onChange, testID }: any) {
  return (
    <View style={s.row}>
      <Text style={{ flex: 1, fontWeight: '700', color: colors.onSurface }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#FF6B6B' }} testID={testID} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.onSurfaceSecondary, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
