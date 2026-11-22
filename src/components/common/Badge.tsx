import React from 'react';
import { View } from 'react-native';
import { statusColor, useTheme } from '../../theme';
import { AppText } from './Text';
import { labelize } from '../../utils/format';

export const Badge = ({ label, status, tone }: { label?: string; status?: string; tone?: { fg: string; bg: string } }) => {
  const c = useTheme();
  const t = tone ?? statusColor(c, status ?? 'default');
  return (
    <View style={{ backgroundColor: t.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}>
      <AppText v="caption" color={t.fg} style={{ fontWeight: '700' }}>{label ?? labelize(status ?? '')}</AppText>
    </View>
  );
};

export const Dot = ({ color, size = 8 }: { color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
);
