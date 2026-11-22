import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { Palette, useTheme } from '../../theme';

export type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'caption' | 'label' | 'overline';
const styles: Record<Variant, TextStyle> = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 26 },
  h3: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  body: { fontSize: 14.5, fontWeight: '400', lineHeight: 21 },
  bodyBold: { fontSize: 14.5, fontWeight: '600', lineHeight: 21 },
  caption: { fontSize: 12.5, fontWeight: '500', lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase', lineHeight: 15 },
};
export type ColorKey = keyof Pick<Palette, 'text' | 'textMuted' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'onPrimary' | 'accent'>;

export interface AppTextProps extends TextProps { v?: Variant; color?: ColorKey | string; align?: TextStyle['textAlign'] }
export const AppText = ({ v = 'body', color = 'text', align, style, ...rest }: AppTextProps) => {
  const c = useTheme();
  const col = (c as unknown as Record<string, string>)[color] ?? color;
  return <RNText allowFontScaling maxFontSizeMultiplier={1.3} {...rest} style={[styles[v], { color: col, textAlign: align }, style]} />;
};
