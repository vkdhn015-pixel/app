import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing } from './theme';

export function Card({ style, children, testID }: { style?: ViewStyle | ViewStyle[]; children: React.ReactNode; testID?: string }) {
  return <View testID={testID} style={[cardStyles.card, style as any]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, loading, disabled, testID, style }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; testID?: string; style?: ViewStyle }) {
  return (
    <Pressable testID={testID} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [{ opacity: pressed || disabled ? 0.85 : 1, borderRadius: radius.pill }, style]}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={btnStyles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={btnStyles.label}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, testID, style }: { label: string; onPress: () => void; testID?: string; style?: ViewStyle }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [ghostStyles.btn, style, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={ghostStyles.label}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[chipStyles.chip, active && chipStyles.active]}>
      <Text style={[chipStyles.label, active && chipStyles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

export function StatTile({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={[cardStyles.card, { flex: 1, padding: spacing.md, marginRight: spacing.sm }]}>
      <Text style={{ fontSize: 12, color: colors.onSurfaceMuted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ marginTop: 6, fontSize: 20, fontWeight: '800', color: tint || colors.onSurface }}>{value}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});

const btnStyles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 } as TextStyle,
});

const ghostStyles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    backgroundColor: '#FFF5F4',
  },
  label: { color: colors.brandPrimary, fontSize: 15, fontWeight: '700' },
});

const chipStyles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  active: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary },
  activeLabel: { color: colors.brandPrimary },
});

const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceSecondary, marginBottom: 6 },
  error: { fontSize: 12, color: colors.error, marginTop: 4 },
});

export const inputStyle = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
