import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';

const ARect = Animated.createAnimatedComponent(Rect);
export interface BarDatum { label: string; value: number }

const Bar = ({ x, w, base, h, i, color, active, onPress }: { x: number; w: number; base: number; h: number; i: number; color: string; active: boolean; onPress: () => void }) => {
  const p = useSharedValue(0);
  useEffect(() => { p.value = 0; p.value = withDelay(i * 55, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })); }, [h, i, p]);
  const props = useAnimatedProps(() => ({ y: base - h * p.value, height: Math.max(0.1, h * p.value) }));
  return <ARect x={x} width={w} rx={Math.min(8, w / 2)} fill={color} opacity={active ? 1 : 0.45} animatedProps={props} onPress={onPress} />;
};

export const BarChart = ({ data, height = 170, format, color, title }: { data: BarDatum[]; height?: number; format: (n: number) => string; color?: string; title?: string }) => {
  const c = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(data.length - 1);
  useEffect(() => setSel(data.length - 1), [data.length]);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = 8, bottom = 24, ch = height - top - bottom;
  const slot = w / Math.max(1, data.length);
  const bw = Math.min(34, slot * 0.58);
  const active = data[Math.min(sel, data.length - 1)];
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <AppText v="caption" color="textMuted">{title ?? active?.label}</AppText>
        <AppText v="h3">{active ? `${title ? active.label + ' · ' : ''}${format(active.value)}` : ''}</AppText>
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            {[0, 0.5, 1].map((g) => <Line key={g} x1={0} x2={w} y1={top + ch * (1 - g)} y2={top + ch * (1 - g)} stroke={c.border} strokeWidth={1} strokeDasharray={g === 0 ? undefined : '3 5'} />)}
            {data.map((d, i) => (
              <React.Fragment key={d.label + i}>
                <Bar i={i} x={i * slot + (slot - bw) / 2} w={bw} base={top + ch} h={(d.value / max) * ch} color={color ?? c.secondary} active={i === sel} onPress={() => setSel(i)} />
                <SvgText x={i * slot + slot / 2} y={height - 6} fontSize={11} fill={i === sel ? c.text : c.textMuted} fontWeight={i === sel ? '700' : '500'} textAnchor="middle">{d.label}</SvgText>
              </React.Fragment>
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
};
