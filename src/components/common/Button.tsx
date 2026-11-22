import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, shadow, useTheme } from '../../theme';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'gradient' | 'soft' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, full = true, style }: ButtonProps) => {
  const c = useTheme();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const h = size === 'md' ? 52 : 40;
  const fg =
    variant === 'primary' || variant === 'gradient' ? c.onPrimary
    : variant === 'danger' ? c.error
    : variant === 'soft' ? c.secondary
    : variant === 'outline' ? c.text : c.secondary;
  const bg =
    variant === 'primary' ? c.primary : variant === 'soft' ? c.secondarySoft : variant === 'danger' ? c.errorSoft : 'transparent';
  const inactive = disabled || loading;
  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon ? <Icon name={icon} size={size === 'md' ? 18 : 16} color={fg} /> : null}
      <AppText v={size === 'md' ? 'h3' : 'label'} color={fg}>{title}</AppText>
    </View>
  );
  return (
    <Animated.View style={[anim, full ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, { opacity: disabled ? 0.5 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        disabled={inactive}
        onPressIn={() => { s.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { s.value = withSpring(1, { damping: 12, stiffness: 260 }); }}
        onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress?.(); }}
        style={[
          { height: h, minWidth: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: size === 'md' ? 20 : 14, overflow: 'hidden', backgroundColor: bg },
          variant === 'outline' && { borderWidth: 1.5, borderColor: c.border },
          variant === 'primary' && shadow(c, 1),
        ]}
      >
        {variant === 'gradient' ? (
          <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
        ) : null}
        {content}
      </Pressable>
    </Animated.View>
  );
};

export const IconButton = ({ icon, onPress, label, color, bg, size = 44 }: { icon: IconName; onPress?: () => void; label: string; color?: string; bg?: string; size?: number }) => {
  const c = useTheme();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={anim}>
      <Pressable
        accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
        onPressIn={() => { s.value = withSpring(0.88, { damping: 15 }); }}
        onPressOut={() => { s.value = withSpring(1); }}
        onPress={onPress}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg ?? c.surface }}
      >
        <Icon name={icon} size={20} color={color ?? c.text} />
      </Pressable>
    </Animated.View>
  );
};
