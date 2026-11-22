import React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { AppText } from '../../../components/common/Text';
import { Icon, IconName } from '../../../components/common/Icon';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { NotifType } from '../../../types/domain';
import { formatDateTime } from '../../../utils/date';

const ICON: Record<NotifType, { icon: IconName; tone: 'secondary' | 'success' | 'warning' | 'error' }> = {
  new_order: { icon: 'shopping-bag', tone: 'secondary' }, delivery_assigned: { icon: 'truck', tone: 'secondary' }, payment_received: { icon: 'credit-card', tone: 'success' },
  pending_payment: { icon: 'alert-circle', tone: 'warning' }, low_stock: { icon: 'alert-triangle', tone: 'warning' }, subscription_expiry: { icon: 'repeat', tone: 'warning' },
  delivery_completed: { icon: 'check-circle', tone: 'success' }, delivery_failed: { icon: 'x-circle', tone: 'error' },
};

export default function NotificationsScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const exec = useExec();
  const unread = db.notifications.filter((n) => !n.read).length;
  return (
    <Screen padded={false} header={<Header title="Notifications" subtitle={`${unread} unread`} right={unread ? <Button title="Mark all read" size="sm" variant="soft" full={false} onPress={() => exec({ t: 'notif.readAll' })} /> : undefined} />}>
      <FlatList data={db.notifications} keyExtractor={(n) => n.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }} initialNumToRender={12}
        ListEmptyComponent={<EmptyState title="You're all caught up" message="Orders, payments and stock alerts will show up here." />}
        renderItem={({ item: n }) => {
          const t = ICON[n.type];
          const col = c[t.tone];
          return (
            <Pressable accessibilityRole="button" onPress={() => {
              exec({ t: 'notif.read', id: n.id });
              if (n.refType === 'order' && n.refId) nav.navigate('OrderDetail', { id: n.refId });
              else if (n.refType === 'customer' && n.refId) nav.navigate('CustomerDetail', { id: n.refId });
              else if (n.refType === 'product') nav.navigate('StockEntry', { kind: 'new_stock', productId: n.refId });
              else if (n.refType === 'subscription') nav.navigate('Subscriptions');
            }} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: n.read ? c.surface : c.secondarySoft, alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={19} color={col} /></View>
              <View style={{ flex: 1 }}>
                <AppText v="bodyBold">{n.title}</AppText>
                <AppText v="caption" color="textMuted" numberOfLines={2}>{n.body}</AppText>
                <AppText v="caption" color="textMuted" style={{ marginTop: 2 }}>{formatDateTime(n.at)}</AppText>
              </View>
              {!n.read ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.secondary }} /> : null}
            </Pressable>
          );
        }} />
    </Screen>
  );
}
