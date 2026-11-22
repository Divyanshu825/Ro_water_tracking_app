import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { shadow, useTheme } from '../../theme';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';
import { initials } from '../../utils/format';

export const Avatar = ({ name, size = 44, tint }: { name: string; size?: number; tint?: string }) => {
  const c = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint ?? c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <AppText v="label" color={c.secondary} style={{ fontSize: size * 0.34, fontWeight: '800' }}>{initials(name)}</AppText>
    </View>
  );
};

export const SearchBar = ({ value, onChangeText, placeholder = 'Search', right }: { value: string; onChangeText: (s: string) => void; placeholder?: string; right?: React.ReactNode }) => {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: c.border }}>
        <Icon name="search" size={18} color={c.textMuted} />
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.textMuted} style={{ flex: 1, color: c.text, fontSize: 15, height: 48 }} autoCorrect={false} returnKeyType="search" accessibilityLabel={placeholder} />
        {value ? <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search"><Icon name="x-circle" size={18} color={c.textMuted} /></Pressable> : null}
      </View>
      {right}
    </View>
  );
};

export const Fab = ({ icon = 'plus', label, onPress }: { icon?: IconName; label?: string; onPress: () => void }) => {
  const c = useTheme();
  return (
    <Animated.View entering={ZoomIn.delay(300).springify()} style={[{ position: 'absolute', right: 20, bottom: 20 }, shadow(c, 2)]}>
      <Pressable accessibilityRole="button" accessibilityLabel={label ?? 'Add'} onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.primary, height: 56, minWidth: 56, paddingHorizontal: label ? 20 : 0, justifyContent: 'center', borderRadius: 28 }}>
        <Icon name={icon} size={22} color={c.onPrimary} />
        {label ? <AppText v="h3" color="onPrimary">{label}</AppText> : null}
      </Pressable>
    </Animated.View>
  );
};

export const Row = ({ label, value, bold, color }: { label: string; value: React.ReactNode; bold?: boolean; color?: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 12 }}>
    <AppText v="body" color="textMuted">{label}</AppText>
    {typeof value === 'string' || typeof value === 'number'
      ? <AppText v={bold ? 'h3' : 'bodyBold'} color={color} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</AppText>
      : value}
  </View>
);

export const ListItem = ({ icon, title, subtitle, right, onPress, tint, danger }: { icon: IconName; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; tint?: string; danger?: boolean }) => {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: danger ? c.errorSoft : c.secondarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={tint ?? (danger ? c.error : c.secondary)} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold" color={danger ? 'error' : 'text'}>{title}</AppText>
        {subtitle ? <AppText v="caption" color="textMuted">{subtitle}</AppText> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color={c.textMuted} /> : null)}
    </Pressable>
  );
};

/** Count-up number; easing runs on rAF and only while the value changes. */
export const CountUp = ({ value, format, duration = 900, style, v = 'h1', color }: { value: number; format?: (n: number) => string; duration?: number; style?: object; v?: 'h1' | 'h2' | 'h3' | 'display'; color?: string }) => {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = Date.now();
    const a = from.current;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setShown(a + (value - a) * e);
      if (t < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const n = Math.abs(value - shown) < 0.5 ? value : shown;
  return <AppText v={v} color={color} style={style} accessibilityLabel={format ? format(value) : String(value)}>{format ? format(Math.round(n * 100) / 100) : String(Math.round(n))}</AppText>;
};
