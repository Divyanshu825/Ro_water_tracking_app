import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';

export const ProgressBar = ({ value, color, height = 8, track }: { value: number; color?: string; height?: number; track?: string }) => {
  const c = useTheme();
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 650, easing: Easing.out(Easing.cubic) }); }, [value, p]);
  const a = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track ?? c.border, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: color ?? c.secondary }, a]} />
    </View>
  );
};
