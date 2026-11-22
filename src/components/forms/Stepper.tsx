import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';
import { Icon } from '../common/Icon';

export const Stepper = ({ value, onChange, min = 0, max = 9999, step = 1 }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) => {
  const c = useTheme();
  const btn = (icon: 'minus' | 'plus', delta: number, disabled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === 'minus' ? 'Decrease' : 'Increase'} disabled={disabled} onPress={() => onChange(Math.max(min, Math.min(max, value + delta)))}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.secondarySoft, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Icon name={icon} size={18} color={c.secondary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn('minus', -step, value <= min)}
      <AppText v="h3" align="center" style={{ minWidth: 38 }}>{value}</AppText>
      {btn('plus', step, value >= max)}
    </View>
  );
};
