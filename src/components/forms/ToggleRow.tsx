import React from 'react';
import { Switch, View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';

export const ToggleRow = ({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) => {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1 }}>
        <AppText v="bodyBold">{title}</AppText>
        {subtitle ? <AppText v="caption" color="textMuted">{subtitle}</AppText> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.secondary, false: c.border }} thumbColor="#fff" accessibilityLabel={title} />
    </View>
  );
};
