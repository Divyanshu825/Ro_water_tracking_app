import React from 'react';
import { FlatList, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Avatar, Fab } from '../../../components/common/Misc';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { useDb } from '../../../hooks/useData';
import { useNav } from '../../../navigation/hooks';
import { isOpen } from '../../orders/services/orderService';
import { todayStr } from '../../../utils/date';

export default function StaffListScreen() {
  const nav = useNav();
  const db = useDb();
  return (
    <Screen padded={false} header={<Header title="Delivery staff" subtitle={`${db.staff.filter((s) => s.active).length} active`} right={<Button title="Delivery mode" icon="truck" size="sm" variant="soft" full={false} onPress={() => nav.navigate('DeliveryMode')} />} />}>
      <FlatList data={db.staff} keyExtractor={(s) => s.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No staff yet" message="Add delivery staff to assign orders." actionLabel="Add staff" onAction={() => nav.navigate('StaffForm')} />}
        renderItem={({ item: s }) => {
          const today = db.orders.filter((o) => o.staffId === s.id && o.deliveryDate === todayStr() && (isOpen(o.status) || o.status === 'delivered'));
          return (
            <Card onPress={() => nav.navigate('StaffDetail', { id: s.id })} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: s.active ? 1 : 0.6 }}>
              <Avatar name={s.name} />
              <View style={{ flex: 1 }}><AppText v="h3">{s.name}</AppText><AppText v="caption" color="textMuted">{s.phone} · {s.vehicle}</AppText><AppText v="caption" color="secondary">{today.length} deliveries today</AppText></View>
              <Badge status={s.active ? 'active' : 'expired'} label={s.active ? 'Active' : 'Inactive'} />
            </Card>
          );
        }} />
      <Fab label="Add staff" onPress={() => nav.navigate('StaffForm')} />
    </Screen>
  );
}
