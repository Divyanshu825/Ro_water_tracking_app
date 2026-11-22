import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radius, shadow, useTheme } from '../../theme';

export const Card = ({ children, style, onPress, pad = 16, flat }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; pad?: number; flat?: boolean }) => {
  const c = useTheme();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: radius.lg, padding: pad, ...(flat ? { borderWidth: 1, borderColor: c.border } : shadow(c, 1)) };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Animated.View style={anim}>
      <Pressable
        accessibilityRole="button"
        onPressIn={() => { s.value = withSpring(0.975, { damping: 18 }); }}
        onPressOut={() => { s.value = withSpring(1, { damping: 14 }); }}
        onPress={onPress}
        style={[base, style]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
