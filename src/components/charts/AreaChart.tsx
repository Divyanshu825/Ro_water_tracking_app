import React, { useEffect, useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme';
import { AppText } from '../common/Text';
import { BarDatum } from './BarChart';

const APath = Animated.createAnimatedComponent(Path);

/** Smooth line/area chart. Touch or drag to inspect a point. */
export const AreaChart = ({ data, height = 190, format, color, title }: { data: BarDatum[]; height?: number; format: (n: number) => string; color?: string; title?: string }) => {
  const c = useTheme();
  const col = color ?? c.secondary;
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(data.length - 1);
  useEffect(() => setSel(data.length - 1), [data.length]);
  const p = useSharedValue(0);
  const padX = 8, top = 14, bottom = 24;
  const ch = height - top - bottom;
  const max = Math.max(1, ...data.map((d) => d.value));

  const pts = useMemo(() => data.map((d, i) => ({ x: padX + (data.length === 1 ? 0.5 : i / (data.length - 1)) * (w - padX * 2), y: top + ch * (1 - d.value / max) })), [data, w, ch, max]);
  const line = useMemo(() => {
    if (pts.length === 0) return '';
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2;
      d += ` C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
    }
    return d;
  }, [pts]);
  const length = useMemo(() => pts.reduce((s, pt, i) => (i ? s + Math.hypot(pt.x - pts[i - 1].x, pt.y - pts[i - 1].y) : 0) + s * 0, 0) * 1.25 + 40, [pts]);
  useEffect(() => { p.value = 0; p.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }); }, [line, p]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - p.value) }));
  const fillProps = useAnimatedProps(() => ({ opacity: Math.max(0, p.value - 0.35) * 1.5 }));

  const pick = (e: GestureResponderEvent) => {
    if (!pts.length) return;
    const x = e.nativeEvent.locationX;
    let best = 0;
    pts.forEach((pt, i) => { if (Math.abs(pt.x - x) < Math.abs(pts[best].x - x)) best = i; });
    setSel(best);
  };
  const active = data[Math.min(sel, data.length - 1)];
  const sp = pts[Math.min(sel, pts.length - 1)];
  const step = Math.max(1, Math.ceil(data.length / 6));
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <AppText v="caption" color="textMuted">{title ?? 'Tap or drag to inspect'}</AppText>
        <AppText v="h3">{active ? `${active.label} · ${format(active.value)}` : ''}</AppText>
      </View>
      <View style={{ height }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={pick} onResponderMove={pick}>
        {w > 0 && pts.length > 0 ? (
          <Svg width={w} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id="af" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={col} stopOpacity={0.35} />
                <Stop offset="1" stopColor={col} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0, 0.5, 1].map((g) => <Line key={g} x1={0} x2={w} y1={top + ch * (1 - g)} y2={top + ch * (1 - g)} stroke={c.border} strokeWidth={1} strokeDasharray={g === 0 ? undefined : '3 5'} />)}
            <APath d={`${line} L${pts[pts.length - 1].x},${top + ch} L${pts[0].x},${top + ch} Z`} fill="url(#af)" animatedProps={fillProps} />
            <APath d={line} stroke={col} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={length} animatedProps={lineProps} />
            {sp ? (
              <>
                <Line x1={sp.x} x2={sp.x} y1={top} y2={top + ch} stroke={col} strokeOpacity={0.3} strokeWidth={1.5} />
                <Circle cx={sp.x} cy={sp.y} r={6} fill={c.surface} stroke={col} strokeWidth={3} />
              </>
            ) : null}
            {data.map((d, i) => (i % step === 0 || i === data.length - 1) ? (
              <SvgText key={i} x={pts[i].x} y={height - 6} fontSize={10.5} fill={c.textMuted} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{d.label}</SvgText>
            ) : null)}
          </Svg>
        ) : null}
      </View>
    </View>
  );
};
