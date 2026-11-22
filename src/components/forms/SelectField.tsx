import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';
import { Icon } from '../common/Icon';
import { BottomSheet } from '../common/BottomSheet';
import { SearchBar } from '../common/Misc';

export interface Option<T extends string = string> { value: T; label: string; sub?: string }

export function SelectField<T extends string>({ label, value, options, onChange, placeholder = 'Select', error, searchable, disabled, title }: {
  label?: string; value?: T; options: Option<T>[]; onChange: (v: T) => void; placeholder?: string; error?: string; searchable?: boolean; disabled?: boolean; title?: string;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = options.find((o) => o.value === value);
  const list = useMemo(() => (q ? options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);
  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText v="label" color="textMuted">{label}</AppText> : null}
      <Pressable
        accessibilityRole="button" accessibilityLabel={label ?? placeholder} disabled={disabled} onPress={() => { setQ(''); setOpen(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: error ? c.error : c.border, paddingHorizontal: 14, minHeight: 52, opacity: disabled ? 0.5 : 1 }}
      >
        <View style={{ flex: 1 }}>
          <AppText v="body" color={sel ? 'text' : 'textMuted'} numberOfLines={1} style={{ fontSize: 15.5 }}>{sel?.label ?? placeholder}</AppText>
        </View>
        <Icon name="chevron-down" size={18} color={c.textMuted} />
      </Pressable>
      {error ? <AppText v="caption" color="error">{error}</AppText> : null}
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={title ?? label ?? 'Select'}>
        {searchable ? <SearchBar value={q} onChangeText={setQ} placeholder="Search" /> : null}
        {list.length === 0 ? <AppText color="textMuted" align="center" style={{ paddingVertical: 24 }}>No matches</AppText> : null}
        {list.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: on ? c.secondarySoft : c.surfaceAlt }}>
              <View style={{ flex: 1 }}>
                <AppText v="bodyBold">{o.label}</AppText>
                {o.sub ? <AppText v="caption" color="textMuted">{o.sub}</AppText> : null}
              </View>
              {on ? <Icon name="check-circle" size={20} color={c.secondary} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

export function FormSelect<T extends FieldValues>({ control, name, ...rest }: { control: Control<T>; name: Path<T> } & Omit<Parameters<typeof SelectField<string>>[0], 'value' | 'onChange' | 'error'>) {
  return (
    <Controller control={control} name={name}
      render={({ field, fieldState }) => <SelectField<string> {...rest} value={field.value as string} onChange={field.onChange} error={fieldState.error?.message} />}
    />
  );
}
