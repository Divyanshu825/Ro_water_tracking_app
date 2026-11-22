import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';
import { AppText } from './Text';
import { Button } from './Button';

const Art = () => {
  const c = useTheme();
  return (
    <Svg width={140} height={140} viewBox="0 0 140 140">
      <Defs>
        <LinearGradient id="eg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5CE1F5" />
          <Stop offset="1" stopColor="#1E9FD8" />
        </LinearGradient>
      </Defs>
      <Circle cx="70" cy="70" r="62" fill={c.secondarySoft} />
      <Circle cx="108" cy="36" r="6" fill={c.accent} opacity={0.5} />
      <Circle cx="30" cy="96" r="4" fill={c.secondary} opacity={0.4} />
      <Path d="M70 26 C70 26 44 56 44 76 C44 92 55 104 70 104 C85 104 96 92 96 76 C96 56 70 26 70 26 Z" fill="url(#eg)" />
      <Path d="M52 78 C58 73 63 82 70 78 C77 73 82 82 90 78 L90 80 C90 92 82 99 70 99 C58 99 52 92 52 80 Z" fill="#fff" opacity={0.35} />
    </Svg>
  );
};

export const EmptyState = ({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel?: string; onAction?: () => void }) => (
  <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 32, gap: 8 }}>
    <Animated.View entering={ZoomIn.springify().damping(14)}><Art /></Animated.View>
    <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ alignItems: 'center', gap: 6 }}>
      <AppText v="h3" align="center">{title}</AppText>
      <AppText v="body" color="textMuted" align="center">{message}</AppText>
      {actionLabel ? <View style={{ marginTop: 10 }}><Button title={actionLabel} onPress={onAction} full={false} size="sm" /></View> : null}
    </Animated.View>
  </View>
);
