import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';

export default function Splash() {
  const router = useRouter();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.95, { duration: 900 })), -1, true);
    opacity.value = withTiming(1, { duration: 600 });
    const t = setTimeout(async () => {
      const token = await AsyncStorage.getItem('villan.token');
      router.replace(token ? '/(tabs)' : '/(auth)/login');
    }, 1600);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a1a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <Animated.View style={[styles.logoWrap, style]} testID="splash-logo">
        <Image source={require('../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.subtitle}>PREMIUM GAMING PLATFORM</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center' },
  logo: { width: 260, height: 260 },
  subtitle: { marginTop: 12, color: '#FFD700', fontSize: 12, fontWeight: '800', letterSpacing: 3 },
});

