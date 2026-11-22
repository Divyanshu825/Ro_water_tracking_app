import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Order } from '../../../types/domain';
import { AppText } from '../../../components/common/Text';
import { Icon } from '../../../components/common/Icon';
import { useTheme } from '../../../theme';
import { formatDateTime } from '../../../utils/date';

const FLOW = [
  { s: 'pending', label: 'Order placed' }, { s: 'confirmed', label: 'Confirmed' }, { s: 'assigned', label: 'Staff assigned' },
  { s: 'out_for_delivery', label: 'Out for delivery' }, { s: 'delivered', label: 'Delivered' },
] as const;

const Step = ({ i, done, current, label, at, note, bad }: { i: number; done: boolean; current: boolean; label: string; at?: string; note?: string; bad?: boolean }) => {
  const c = useTheme();
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(i * 120, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })); }, [i, p]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: (1 - p.value) * 12 }] }));
  const col = bad ? c.error : done ? c.success : c.border;
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 12, minHeight: 52 }, a]}>
      <View style={{ alignItems: 'center', width: 26 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: done || bad ? col : c.surface, borderWidth: 2, borderColor: col, alignItems: 'center', justifyContent: 'center' }}>
          {done || bad ? <Icon name={bad ? 'x' : 'check'} size={14} color="#fff" /> : null}
        </View>
      </View>
      <View style={{ flex: 1, paddingBottom: 14 }}>
        <AppText v="bodyBold" color={done || current || bad ? 'text' : 'textMuted'}>{label}</AppText>
        {at ? <AppText v="caption" color="textMuted">{formatDateTime(at)}{note ? ` · ${note}` : ''}</AppText> : null}
      </View>
    </Animated.View>
  );
};

export const StatusTimeline = ({ order }: { order: Order }) => {
  const c = useTheme();
  const at = (s: string) => [...order.statusHistory].reverse().find((h) => h.status === s);
  const terminalBad = order.status === 'cancelled' || order.status === 'failed';
  const reachedIdx = FLOW.findIndex((f) => f.s === order.status);
  const lastIdx = terminalBad ? Math.max(0, FLOW.reduce((m, f, i) => (at(f.s) ? i : m), 0)) : reachedIdx;
  const prog = useSharedValue(0);
  useEffect(() => { prog.value = withTiming(lastIdx / (FLOW.length - 1), { duration: 800, easing: Easing.out(Easing.cubic) }); }, [lastIdx, prog]);
  const fill = useAnimatedStyle(() => ({ height: `${prog.value * 100}%` }));
  const steps = terminalBad ? [...FLOW.slice(0, lastIdx + 1)] : [...FLOW];
  return (
    <View>
      <View style={{ position: 'absolute', left: 12, top: 13, bottom: terminalBad ? 40 : 28, width: 2, backgroundColor: c.border }}>
        <Animated.View style={[{ width: 2, backgroundColor: c.success }, fill]} />
      </View>
      {steps.map((f, i) => <Step key={f.s} i={i} label={f.label} done={i <= lastIdx} current={i === lastIdx} at={at(f.s)?.at} note={at(f.s)?.note} />)}
      {terminalBad ? <Step i={steps.length} label={order.status === 'failed' ? 'Delivery failed' : 'Order cancelled'} done={false} current bad at={at(order.status)?.at} note={order.failureReason ?? at(order.status)?.note} /> : null}
    </View>
  );
};
