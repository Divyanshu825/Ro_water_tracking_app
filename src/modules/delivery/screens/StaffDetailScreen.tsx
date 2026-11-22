import React, { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Avatar, Row } from '../../../components/common/Misc';
import { Button, IconButton } from '../../../components/common/Button';
import { FilterChips } from '../../../components/common/Chips';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { OrderCard } from '../../../components/cards/OrderCard';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { deliveryPerformance, resolveRange } from '../../dashboard/services/stats';
import { labelize } from '../../../utils/format';

export default function StaffDetailScreen() {
  const { id } = useParams<'StaffDetail'>();
  const nav = useNav();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const s = db.staff.find((x) => x.id === id);
  const perf = useMemo(() => deliveryPerformance(db, resolveRange(range)).find((p) => p.staff.id === id), [db, range, id]);
  if (!s || !perf) return <Screen header={<Header title="Staff" />}><AppText>Not found.</AppText></Screen>;
  const mine = db.orders.filter((o) => o.staffId === id);
  const failures = mine.filter((o) => o.status === 'failed' && o.failureReason);
  return (
    <Screen scroll header={<Header title="Staff profile" right={<IconButton icon="edit-2" label="Edit staff" onPress={() => nav.navigate('StaffForm', { id })} />} />}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={s.name} size={56} />
          <View style={{ flex: 1 }}><AppText v="h2">{s.name}</AppText><AppText color="textMuted">{s.vehicle}</AppText></View>
          <IconButton icon="phone" label="Call staff" bg="transparent" onPress={() => Linking.openURL(`tel:${s.phone}`)} />
        </View>
        <Row label="Mobile" value={s.phone} />
      </Card>
      <FilterChips pad={0} value={range} onChange={setRange} options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: 'all', label: 'All time' }]} />
      <Card style={{ gap: 6 }}>
        <AppText v="h3">Performance</AppText>
        <AppText v="caption" color="textMuted">Delivery success rate</AppText>
        <ProgressBar value={perf.rate} height={12} />
        <AppText v="h2">{Math.round(perf.rate * 100)}%</AppText>
        <Row label="Assigned" value={String(perf.assigned)} /><Row label="Delivered" value={String(perf.delivered)} /><Row label="Failed" value={String(perf.failed)} />
        <Row label="Cash collected" value={money(perf.cash)} /><Row label="Empty bottles collected" value={String(perf.empties)} />
      </Card>
      {failures.length ? (
        <Card style={{ gap: 6 }}>
          <AppText v="h3">Failed delivery reasons</AppText>
          {failures.slice(0, 5).map((o) => <AppText key={o.id} v="caption" color="textMuted">{o.number} · {o.failureReason}</AppText>)}
        </Card>
      ) : null}
      <AppText v="h3">Delivery history</AppText>
      {mine.slice(0, 15).map((o) => <OrderCard key={o.id} order={o} onPress={() => nav.navigate('OrderDetail', { id: o.id })} />)}
      <Button title={s.active ? 'Deactivate staff' : 'Activate staff'} variant="outline" onPress={() => { const r = exec({ t: 'staff.active', id, active: !s.active }); r.ok ? fb.success(s.active ? 'Deactivated' : 'Activated') : fb.error(r.error); }} />
      <AppText v="caption" color="textMuted" align="center">Status filters: {labelize('delivered')}, {labelize('failed')} shown in history.</AppText>
    </Screen>
  );
}
