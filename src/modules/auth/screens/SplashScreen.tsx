import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Logo } from '../../../components/common/Logo';
import { AppText } from '../../../components/common/Text';
import { useAppSelector } from '../../../store/hooks';
import { useNav } from '../../../navigation/hooks';

const Ring = ({ delay }: { delay: number }) => {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) })); }, [delay, p]);
  const a = useAnimatedStyle(() => ({ opacity: (1 - p.value) * 0.5, transform: [{ scale: 0.6 + p.value * 2.2 }] }));
  return <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#5CE1F5' }, a]} />;
};

export default function SplashScreen() {
  const nav = useNav();
  const { user, seenWelcome } = useAppSelector((s) => s.auth);
  const drop = useSharedValue(-220);
  const scale = useSharedValue(0.6);
  useEffect(() => {
    drop.value = withSpring(0, { damping: 11, stiffness: 90 });
    scale.value = withDelay(500, withSequence(withSpring(1.12, { damping: 6 }), withSpring(1)));
    const t = setTimeout(() => nav.replace(user ? 'Main' : seenWelcome ? 'Login' : 'Welcome'), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const logo = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }, { scale: scale.value }] }));
  return (
    <LinearGradient colors={['#071530', '#0B1F44', '#12427E']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="light" />
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 220, height: 220 }}>
        <Ring delay={650} /><Ring delay={950} />
        <Animated.View style={logo}><Logo size={110} /></Animated.View>
      </View>
      <Animated.View entering={FadeInUp.delay(900).duration(600)} style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
        <AppText v="display" color="#fff">Bottle Track</AppText>
        <AppText v="body" color="rgba(255,255,255,0.7)">Run your water business smarter</AppText>
      </Animated.View>
    </LinearGradient>
  );
}
