import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Avatar } from '../../../components/common/Misc';
import { Badge, Dot } from '../../../components/common/Badge';
import { Customer } from '../../../types/domain';
import { useTheme } from '../../../theme';
import { useFormat } from '../../../hooks/useFormat';

export const CustomerRow = React.memo(({ customer, balance, bottles, onPress, index }: { customer: Customer; balance: number; bottles: number; onPress: () => void; index: number }) => {
  const c = useTheme();
  const { money } = useFormat();
  const body = (
    <Card onPress={onPress} pad={14} style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={customer.name} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Dot color={customer.active ? c.success : c.textMuted} />
            <AppText v="h3" numberOfLines={1} style={{ flex: 1 }}>{customer.name}</AppText>
          </View>
          <AppText v="caption" color="textMuted">{customer.phone}</AppText>
        </View>
        <Badge label={customer.type} tone={{ fg: c.secondary, bg: c.secondarySoft }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: balance > 0 ? c.errorSoft : c.surfaceAlt, borderRadius: 12, padding: 10 }}>
          <AppText v="caption" color="textMuted">{balance < 0 ? 'Advance credit' : 'Outstanding'}</AppText>
          <AppText v="h3" color={balance > 0 ? 'error' : balance < 0 ? 'success' : 'text'}>{money(Math.abs(balance))}</AppText>
        </View>
        <View style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10 }}>
          <AppText v="caption" color="textMuted">Bottles held</AppText>
          <AppText v="h3">{bottles}</AppText>
        </View>
      </View>
    </Card>
  );
  return index < 8 ? <Animated.View entering={FadeInDown.delay(index * 45).duration(380)}>{body}</Animated.View> : body;
});
CustomerRow.displayName = 'CustomerRow';
