import React, { useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';
import { Icon, IconName } from '../common/Icon';

export interface TextFieldProps extends Omit<TextInputProps, 'onChange'> {
  label?: string;
  error?: string;
  icon?: IconName;
  suffix?: string;
  prefix?: string;
  secure?: boolean;
  hint?: string;
}

export const TextField = ({ label, error, icon, suffix, prefix, secure, hint, multiline, style, ...rest }: TextFieldProps) => {
  const c = useTheme();
  const [focus, setFocus] = useState(false);
  const [hide, setHide] = useState(!!secure);
  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText v="label" color="textMuted">{label}</AppText> : null}
      <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: error ? c.error : focus ? c.secondary : c.border, paddingHorizontal: 14, minHeight: 52 }}>
        {icon ? <View style={{ paddingTop: multiline ? 14 : 0 }}><Icon name={icon} size={18} color={focus ? c.secondary : c.textMuted} /></View> : null}
        {prefix ? <AppText v="bodyBold" color="textMuted">{prefix}</AppText> : null}
        <TextInput
          {...rest} multiline={multiline} secureTextEntry={hide}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }} onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          placeholderTextColor={c.textMuted} accessibilityLabel={label ?? rest.placeholder}
          style={[{ flex: 1, color: c.text, fontSize: 15.5, paddingVertical: multiline ? 14 : 0, minHeight: multiline ? 84 : 50, textAlignVertical: multiline ? 'top' : 'center' }, style]}
        />
        {suffix ? <AppText v="bodyBold" color="textMuted">{suffix}</AppText> : null}
        {secure ? (
          <Pressable onPress={() => setHide((h) => !h)} hitSlop={10} accessibilityLabel={hide ? 'Show password' : 'Hide password'}>
            <Icon name={hide ? 'eye' : 'eye-off'} size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <AppText v="caption" color="error">{error}</AppText> : hint ? <AppText v="caption" color="textMuted">{hint}</AppText> : null}
    </View>
  );
};

/** react-hook-form bound text field. */
export function FormText<T extends FieldValues>({ control, name, ...rest }: { control: Control<T>; name: Path<T> } & TextFieldProps) {
  return (
    <Controller
      control={control} name={name}
      render={({ field, fieldState }) => (
        <TextField {...rest} value={String(field.value ?? '')} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )}
    />
  );
}
