import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../common/Card';
import { AppText } from '../common/Text';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { Order } from '../../types/domain';
import { useCustomer } from '../../hooks/useData';
import { useFormat } from '../../hooks/useFormat';
import { orderTotal } from '../../modules/payments/services/ledger';
import { friendlyDate } from '../../utils/date';
import { labelize } from '../../utils/format';
import { useTheme } from '../../theme';

export const OrderCard = ({ order, onPress, index }: { order: Order; onPress: () => void; index?: number }) => {
  const c = useTheme();
  const customer = useCustomer(order.customerId);
  const { money } = useFormat();
  const qty = order.items.reduce((s, i) => s + i.qty, 0);
  const summary = order.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
  const card = (
    <Card onPress={onPress} pad={14} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText v="label" color="textMuted">{order.number}</AppText>
        <Badge status={order.status} label={labelize(order.status)} />
      </View>
      <View>
        <AppText v="h3" numberOfLines={1}>{customer?.name ?? 'Unknown customer'}</AppText>
        <AppText v="caption" color="textMuted" numberOfLines={1}>{summary}</AppText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={13} color={c.textMuted} />
          <AppText v="caption" color="textMuted">{friendlyDate(order.deliveryDate)} · {order.timeSlot} · {qty} items</AppText>
        </View>
        <AppText v="h3">{money(orderTotal(order))}</AppText>
      </View>
    </Card>
  );
  return index !== undefined && index < 8 ? <Animated.View entering={FadeInDown.delay(index * 45).duration(380)}>{card}</Animated.View> : card;
};
