import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button, IconButton } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Row } from '../../../components/common/Misc';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { useFeedback } from '../../../components/common/Feedback';
import { StatusTimeline } from '../components/StatusTimeline';
import { DeliverSheet } from '../components/DeliverSheet';
import { FailSheet } from '../components/FailSheet';
import { useExec } from '../../../store/hooks';
import { useDb, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { orderPaid, orderSubtotal, orderTotal, paymentStatus } from '../../payments/services/ledger';
import { invoiceHtml } from '../../payments/services/invoice';
import { sharePdf } from '../../../services/export';
import { formatDate, formatTimeSlot, friendlyDate } from '../../../utils/date';
import { labelize } from '../../../utils/format';
import { OrderStatus } from '../../../types/domain';
import { ListItem } from '../../../components/common/Misc';

export default function OrderDetailScreen() {
  const { id } = useParams<'OrderDetail'>();
  const nav = useNav();
  const db = useDb();
  const settings = useSettings();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const [deliver, setDeliver] = useState(false);
  const [fail, setFail] = useState(false);
  const [assign, setAssign] = useState(false);
  const o = db.orders.find((x) => x.id === id);
  if (!o) return <Screen header={<Header title="Order" />}><AppText color="textMuted">Order not found.</AppText></Screen>;
  const customer = db.customers.find((c) => c.id === o.customerId);
  const addr = customer?.addresses.find((a) => a.id === o.addressId);
  const staff = db.staff.find((s) => s.id === o.staffId);
  const paid = orderPaid(db.financialEntries, o.id);
  const total = orderTotal(o);
  const pstat = o.status === 'delivered' ? paymentStatus(o, paid) : undefined;

  const go = (status: OrderStatus, reason?: string) => {
    const r = exec({ t: 'order.status', v: { orderId: o.id, status, reason } });
    if (!r.ok) return fb.error(r.error);
    fb.success(labelize(status));
  };
  const cancel = () => fb.confirm('Cancel this order?', 'Any stock loaded for delivery is returned. Cancelled orders are not counted as sales.', () => go('cancelled'), 'Cancel order', true);
  const dispatch = () => (o.staffId ? go('out_for_delivery') : setAssign(true));
  const invoice = async () => { try { await sharePdf(invoiceHtml(db, settings, o), `Invoice ${o.number}`); } catch { fb.error('Could not generate the PDF invoice.'); } };
  const navigate = () => { if (addr) Linking.openURL(Platform.select({ ios: `http://maps.apple.com/?q=${encodeURIComponent(`${addr.line}, ${addr.city}`)}`, default: `geo:0,0?q=${encodeURIComponent(`${addr.line}, ${addr.city}`)}` })!); };

  return (
    <Screen scroll header={<Header title={o.number} subtitle={`${friendlyDate(o.deliveryDate)} · ${formatTimeSlot(o.timeSlot)}`} right={<Badge status={o.status} label={labelize(o.status)} />} />}>
      <Card><StatusTimeline order={o} /></Card>

      <Card style={{ gap: 12 }}>
        <ListItem icon="user" title={customer?.name ?? 'Customer'} subtitle={customer?.phone} onPress={() => customer && nav.navigate('CustomerDetail', { id: customer.id })}
          right={<IconButton icon="phone" label="Call customer" bg="transparent" onPress={() => customer && Linking.openURL(`tel:${customer.phone}`)} />} />
        {addr ? <ListItem icon="map-pin" title={addr.label} subtitle={`${addr.line}, ${addr.city} ${addr.pincode}`} onPress={navigate} right={<IconButton icon="navigation" label="Navigate" bg="transparent" onPress={navigate} />} /> : null}
        {staff ? <ListItem icon="truck" title={staff.name} subtitle={staff.vehicle} onPress={() => nav.navigate('StaffDetail', { id: staff.id })} /> : null}
        {o.instructions ? <AppText v="caption" color="textMuted">Instructions: {o.instructions}</AppText> : null}
        {o.failureReason ? <AppText v="bodyBold" color="error">Failed: {o.failureReason}</AppText> : null}
      </Card>

      <Card style={{ gap: 4 }}>
        <AppText v="h3" style={{ marginBottom: 6 }}>Items</AppText>
        {o.items.map((i) => <Row key={i.productId} label={`${i.qty} × ${i.name}`} value={money(i.qty * i.unitPrice)} />)}
        <View style={{ height: 8 }} />
        <Row label="Subtotal" value={money(orderSubtotal(o))} />
        {o.discount > 0 ? <Row label="Discount" value={`−${money(o.discount)}`} /> : null}
        <Row label="Delivery charge" value={money(o.deliveryCharge)} />
        {o.taxAmount > 0 ? <Row label={settings.tax.label} value={money(o.taxAmount)} /> : null}
        <Row label={o.status === 'delivered' ? 'Bottle deposit' : 'Bottle deposit (estimate)'} value={money(o.depositAmount)} />
        <Row label="Total" value={money(total)} bold />
        {pstat ? (
          <>
            <Row label="Paid" value={money(paid)} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><AppText color="textMuted">Payment</AppText><Badge status={pstat} label={labelize(pstat)} /></View>
          </>
        ) : null}
      </Card>

      <View style={{ gap: 10 }}>
        {o.status === 'pending' ? <Button title="Confirm order" icon="check" onPress={() => go('confirmed')} /> : null}
        {(o.status === 'pending' || o.status === 'confirmed' || o.status === 'assigned') ? <Button title={staff ? 'Reassign staff' : 'Assign delivery staff'} icon="truck" variant="soft" onPress={() => setAssign(true)} /> : null}
        {(o.status === 'confirmed' || o.status === 'assigned') ? <Button title="Out for delivery" icon="navigation" onPress={dispatch} /> : null}
        {['confirmed', 'assigned', 'out_for_delivery'].includes(o.status) ? <Button title="Mark delivered" icon="check-circle" variant="gradient" onPress={() => setDeliver(true)} /> : null}
        {o.status === 'out_for_delivery' ? <Button title="Report failed delivery" variant="outline" onPress={() => setFail(true)} /> : null}
        {o.status === 'failed' ? <Button title="Reschedule (back to pending)" icon="rotate-ccw" onPress={() => go('pending')} /> : null}
        {o.status === 'delivered' && paid < total ? <Button title="Record payment" icon="credit-card" onPress={() => nav.navigate('RecordPayment', { customerId: o.customerId })} /> : null}
        {o.status === 'delivered' ? <Button title="Invoice (PDF)" icon="file-text" variant="soft" onPress={invoice} /> : null}
        {['pending', 'confirmed', 'assigned', 'out_for_delivery', 'failed'].includes(o.status) ? <Button title="Cancel order" variant="danger" onPress={cancel} /> : null}
      </View>
      <AppText v="caption" color="textMuted" align="center">Created {formatDate(o.createdAt.slice(0, 10))}</AppText>

      <DeliverSheet order={o} visible={deliver} onClose={() => setDeliver(false)} />
      <FailSheet orderId={o.id} visible={fail} onClose={() => setFail(false)} />
      <BottomSheet visible={assign} onClose={() => setAssign(false)} title="Assign delivery staff">
        {db.staff.filter((s) => s.active).map((s) => (
          <ListItem key={s.id} icon="user" title={s.name} subtitle={s.vehicle} right={o.staffId === s.id ? <Badge status="active" label="Current" /> : undefined}
            onPress={() => { const r = exec({ t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: s.id } }); setAssign(false); if (!r.ok) fb.error(r.error); else fb.success('Staff assigned', s.name); }} />
        ))}
      </BottomSheet>
    </Screen>
  );
}
