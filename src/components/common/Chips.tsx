import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

export interface ChipOption<T extends string> { value: T; label: string; icon?: IconName }

export function FilterChips<T extends string>({ options, value, onChange, pad = 20 }: { options: ChipOption<T>[]; value: T; onChange: (v: T) => void; pad?: number }) {
  const c = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ paddingHorizontal: pad, gap: 8, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: on ? c.primary : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border }}
          >
            {o.icon ? <Icon name={o.icon} size={14} color={on ? c.onPrimary : c.textMuted} /> : null}
            <AppText v="label" color={on ? 'onPrimary' : 'textMuted'}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.primarySoft, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }}>
            <AppText v="label" color={on ? 'text' : 'textMuted'}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
