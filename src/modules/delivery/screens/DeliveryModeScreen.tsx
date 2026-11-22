import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Icon } from '../../../components/common/Icon';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { useFeedback } from '../../../components/common/Feedback';
import { DeliverSheet } from '../../orders/components/DeliverSheet';
import { FailSheet } from '../../orders/components/FailSheet';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useTheme } from '../../../theme';
import { orderTotal } from '../../payments/services/ledger';
import { todayStr } from '../../../utils/date';
import { labelize } from '../../../utils/format';

/** Field-staff view: today's deliveries for one staff member with the actions they need on the road. */
export default function DeliveryModeScreen() {
  const c = useTheme();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const active = db.staff.filter((s) => s.active);
  const [staffId, setStaffId] = useState(active[0]?.id ?? '');
  const [deliverId, setDeliverId] = useState<string | null>(null);
  const [failId, setFailId] = useState<string | null>(null);
  const today = todayStr();
  const mine = db.orders.filter((o) => o.staffId === staffId && o.deliveryDate === today && o.status !== 'cancelled').sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  const done = mine.filter((o) => o.status === 'delivered').length;
  const deliverOrder = db.orders.find((o) => o.id === deliverId);
  const maps = (q: string) => Linking.openURL(Platform.select({ ios: `http://maps.apple.com/?q=${encodeURIComponent(q)}`, default: `geo:0,0?q=${encodeURIComponent(q)}` })!);
  return (
    <Screen scroll header={<Header title="Delivery mode" subtitle={`Today · ${done}/${mine.length} done`} />}>
      <FilterChips pad={0} value={staffId} onChange={setStaffId} options={active.map((s) => ({ value: s.id, label: s.name }))} />
      {mine.length === 0 ? <Card><EmptyState title="No deliveries today" message="Orders assigned to this staff member for today appear here." /></Card> : null}
      {mine.map((o) => {
        const cust = db.customers.find((x) => x.id === o.customerId);
        const addr = cust?.addresses.find((a) => a.id === o.addressId);
        const open = o.status === 'assigned' || o.status === 'confirmed' || o.status === 'out_for_delivery';
        return (
          <Card key={o.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText v="label" color="textMuted">{o.number} · {o.timeSlot}</AppText><Badge status={o.status} label={labelize(o.status)} /></View>
            <AppText v="h3">{cust?.name}</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}><Icon name="map-pin" size={15} color={c.textMuted} /><AppText v="caption" color="textMuted" style={{ flex: 1 }}>{addr?.line}, {addr?.city}</AppText></View>
            <AppText v="caption">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')} · {money(orderTotal(o))}</AppText>
            {o.instructions ? <AppText v="caption" color="warning">Note: {o.instructions}</AppText> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Button title="Call" icon="phone" size="sm" variant="soft" onPress={() => cust && Linking.openURL(`tel:${cust.phone}`)} /></View>
              <View style={{ flex: 1 }}><Button title="Navigate" icon="navigation" size="sm" variant="soft" onPress={() => addr && maps(`${addr.line}, ${addr.city}`)} /></View>
            </View>
            {open && o.status !== 'out_for_delivery' ? <Button title="Start delivery" icon="truck" size="sm" onPress={() => { const r = exec({ t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } }); r.ok ? fb.success('On the way') : fb.error(r.error); }} /> : null}
            {open ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Button title="Delivered" icon="check-circle" size="sm" variant="gradient" onPress={() => setDeliverId(o.id)} /></View>
                <View style={{ flex: 1 }}><Button title="Failed" size="sm" variant="danger" onPress={() => { if (o.status !== 'out_for_delivery') { const r = exec({ t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } }); if (!r.ok) return fb.error(r.error); } setFailId(o.id); }} /></View>
              </View>
            ) : null}
          </Card>
        );
      })}
      {deliverOrder ? <DeliverSheet order={deliverOrder} visible onClose={() => setDeliverId(null)} /> : null}
      {failId ? <FailSheet orderId={failId} visible onClose={() => setFailId(null)} /> : null}
    </Screen>
  );
}
