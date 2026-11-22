import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';

const ACircle = Animated.createAnimatedComponent(Circle);
export interface Segment { label: string; value: number; color: string }

const Arc = ({ r, circ, start, len, color, sw, p }: { r: number; circ: number; start: number; len: number; color: string; sw: number; p: { value: number } }) => {
  const props = useAnimatedProps(() => ({ strokeDasharray: `${Math.max(0, len * p.value - 1.5)} ${circ}` }));
  return <ACircle cx={0} cy={0} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="butt" rotation={start} originX={0} originY={0} animatedProps={props} />;
};

export const DonutChart = ({ segments, size = 150, centerLabel, centerValue, legend = true }: { segments: Segment[]; size?: number; centerLabel?: string; centerValue?: string; legend?: boolean }) => {
  const c = useTheme();
  const p = useSharedValue(0);
  const total = segments.reduce((s, x) => s + x.value, 0);
  useEffect(() => { p.value = 0; p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [total, p]);
  const sw = 18, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
          <G rotation={-90} originX={0} originY={0}>
            <Circle cx={0} cy={0} r={r} stroke={c.border} strokeWidth={sw} fill="none" />
            {total > 0 ? segments.filter((s) => s.value > 0).map((s) => {
              const len = (s.value / total) * circ;
              const start = (acc / total) * 360;
              acc += s.value;
              return <Arc key={s.label} r={r} circ={circ} start={start} len={len} color={s.color} sw={sw} p={p} />;
            }) : null}
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {centerValue ? <AppText v="h3">{centerValue}</AppText> : null}
          {centerLabel ? <AppText v="caption" color="textMuted">{centerLabel}</AppText> : null}
        </View>
      </View>
      {legend ? (
        <View style={{ flex: 1, gap: 8 }}>
          {segments.map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <AppText v="caption" style={{ flex: 1 }} numberOfLines={1}>{s.label}</AppText>
              <AppText v="label">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export const chartColors = (c: { secondary: string; primary: string; warning: string; success: string; accent: string; error: string }) =>
  [c.secondary, c.warning, c.success, '#7C5CFC', c.accent, c.error, '#F472B6', c.primary];
