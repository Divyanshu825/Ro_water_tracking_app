import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';
import { Icon } from '../common/Icon';
import { FieldLabel } from './TextField';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { addDays, friendlyDate, monthName, parseDate, toDateStr, todayStr } from '../../utils/date';

const Calendar = ({ value, onPick, min, max }: { value?: string; onPick: (d: string) => void; min?: string; max?: string }) => {
  const c = useTheme();
  const base = value ? parseDate(value) : new Date();
  const [cursor, setCursor] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const first = cursor.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = todayStr();
  const move = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="Previous month" style={{ padding: 8 }}><Icon name="chevron-left" /></Pressable>
        <AppText v="h3">{monthName(cursor.getMonth())} {cursor.getFullYear()}</AppText>
        <Pressable onPress={() => move(1)} hitSlop={10} accessibilityLabel="Next month" style={{ padding: 8 }}><Icon name="chevron-right" /></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <AppText key={i} v="caption" color="textMuted" align="center" style={{ flex: 1 }}>{d}</AppText>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 42 }} />;
          const ds = toDateStr(new Date(cursor.getFullYear(), cursor.getMonth(), d));
          const on = ds === value;
          const dis = (min && ds < min) || (max && ds > max);
          return (
            <Pressable key={i} disabled={!!dis} onPress={() => { if (!dis) onPick(ds); }} accessibilityRole="button" accessibilityLabel={ds} accessibilityState={{ disabled: !!dis }}
              style={{ width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : 'transparent', borderWidth: ds === today && !on ? 1.5 : 0, borderColor: c.secondary, opacity: dis ? 0.3 : 1 }}>
                <AppText v="label" color={on ? 'onPrimary' : 'text'}>{d}</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const DatePickerSheet = ({ visible, onClose, value, onPick, min, max, title = 'Select date' }: { visible: boolean; onClose: () => void; value?: string; onPick: (d: string) => void; min?: string; max?: string; title?: string }) => (
  <BottomSheet visible={visible} onClose={onClose} title={title}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {!min || todayStr() >= min ? <Button title="Today" variant="soft" size="sm" full={false} onPress={() => onPick(todayStr())} /> : null}
      {!max || addDays(todayStr(), 1) <= max ? <Button title="Tomorrow" variant="soft" size="sm" full={false} onPress={() => onPick(addDays(todayStr(), 1))} /> : null}
    </View>
    <Calendar value={value} min={min} max={max} onPick={onPick} />
  </BottomSheet>
);

export function DateField({ label, value, onChange, error, min, max, placeholder = 'Select date', required }: { required?: boolean; label?: string; value?: string; onChange: (d: string) => void; error?: string; min?: string; max?: string; placeholder?: string }) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label ?? placeholder} onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: error ? c.error : c.border, paddingHorizontal: 14, minHeight: 52 }}>
        <Icon name="calendar" size={18} color={c.textMuted} />
        <AppText v="body" color={value ? 'text' : 'textMuted'} style={{ flex: 1, fontSize: 15.5 }}>{value ? friendlyDate(value) : placeholder}</AppText>
      </Pressable>
      {error ? <AppText v="caption" color="error">{error}</AppText> : null}
      <DatePickerSheet visible={open} onClose={() => setOpen(false)} value={value} min={min} max={max} title={label} onPick={(d) => { onChange(d); setOpen(false); }} />
    </View>
  );
}

export function FormDate<T extends FieldValues>({ control, name, ...rest }: { control: Control<T>; name: Path<T> } & Omit<Parameters<typeof DateField>[0], 'value' | 'onChange' | 'error'>) {
  return <Controller control={control} name={name} render={({ field, fieldState }) => <DateField {...rest} value={field.value as string} onChange={field.onChange} error={fieldState.error?.message} />} />;
}
