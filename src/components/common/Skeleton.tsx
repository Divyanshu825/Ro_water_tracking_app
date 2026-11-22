import React, { useEffect, useState } from 'react';
import { DimensionValue, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../theme';

export const Skeleton = ({ w = '100%', h = 16, r = 8, style }: { w?: DimensionValue; h?: number; r?: number; style?: ViewStyle }) => {
  const c = useTheme();
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withSequence(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), withTiming(0.55, { duration: 750, easing: Easing.inOut(Easing.quad) })), -1);
    return () => cancelAnimation(o);
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: c.border }, a, style]} />;
};

export const SkeletonList = ({ count = 5, height = 84 }: { count?: number; height?: number }) => {
  const c = useTheme();
  return (
    <View style={{ gap: 12, paddingHorizontal: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ height, borderRadius: 20, backgroundColor: c.surface, padding: 16, gap: 10 }}>
          <Skeleton w="55%" h={14} />
          <Skeleton w="80%" h={12} />
          <Skeleton w="35%" h={12} />
        </View>
      ))}
    </View>
  );
};

/** Short, first-mount skeleton so heavy lists don't block the navigation transition. */
export const useReady = (ms = 280) => {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), ms); return () => clearTimeout(t); }, [ms]);
  return ready;
};
