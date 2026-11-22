import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Row, Fab } from '../../../components/common/Misc';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav } from '../../../navigation/hooks';
import { FREQ_LABEL, SubDisplayStatus, displayStatus, subscriptionStats } from '../services/subscriptionService';
import { addDays, formatShortDate, todayStr } from '../../../utils/date';

export default function SubscriptionsScreen() {
  const nav = useNav();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const [f, setF] = useState<'all' | SubDisplayStatus>('all');
  const list = useMemo(() => db.subscriptions.filter((s) => f === 'all' || displayStatus(s) === f), [db.subscriptions, f]);
  const act = (r: ReturnType<typeof exec>, msg: string) => (r.ok ? fb.success(msg) : fb.error(r.error));
  const generate = () => {
    const r = exec({ t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 1) });
    if (r.ok) fb.success(r.created ? `${r.created} order(s) created` : 'Already up to date', r.created ? undefined : 'No duplicate orders were created');
    else fb.error(r.error);
  };
  return (
    <Screen padded={false} header={<Header title="Subscriptions" subtitle={`${db.subscriptions.filter((s) => displayStatus(s) === 'active').length} active`} right={<Button title="Generate" icon="refresh-cw" size="sm" variant="soft" full={false} onPress={generate} />} />}>
      <FilterChips value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <View style={{ height: 12 }} />
      <FlatList data={list} keyExtractor={(s) => s.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No subscriptions" message="Recurring deliveries you set up will be listed here." actionLabel="Create subscription" onAction={() => nav.navigate('SubscriptionForm')} />}
        renderItem={({ item: s }) => {
          const st = subscriptionStats(db, s);
          const status = displayStatus(s);
          const cust = db.customers.find((c) => c.id === s.customerId);
          return (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><AppText v="h3" numberOfLines={1}>{cust?.name}</AppText><AppText v="caption" color="textMuted">{FREQ_LABEL[s.frequency]}{s.frequency === 'custom' ? ` · every ${s.intervalDays}d` : ''} · {formatShortDate(s.startDate)} → {formatShortDate(s.endDate)}</AppText></View>
                <Badge status={status} />
              </View>
              <AppText v="caption" color="textMuted">{s.items.map((i) => `${i.qty}× ${db.products.find((p) => p.id === i.productId)?.name}`).join(', ')}</AppText>
              <ProgressBar value={st.total ? st.delivered / st.total : 0} />
              <Row label="Remaining deliveries" value={`${st.remaining} of ${st.total}`} />
              <Row label="Per delivery · Total" value={`${money(st.perDelivery)} · ${money(st.totalAmount)}`} />
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {s.status === 'active' ? <Button title="Pause" icon="pause" size="sm" variant="soft" full={false} onPress={() => act(exec({ t: 'sub.status', id: s.id, status: 'paused' }), 'Paused')} /> : null}
                {s.status === 'paused' ? <Button title="Resume" icon="play" size="sm" variant="soft" full={false} onPress={() => act(exec({ t: 'sub.status', id: s.id, status: 'active' }), 'Resumed')} /> : null}
                {s.status !== 'cancelled' ? <Button title="Renew" icon="repeat" size="sm" variant="soft" full={false} onPress={() => act(exec({ t: 'sub.renew', id: s.id }), 'Renewed')} /> : null}
                {s.status !== 'cancelled' ? <Button title="Edit" icon="edit-2" size="sm" variant="outline" full={false} onPress={() => nav.navigate('SubscriptionForm', { id: s.id })} /> : null}
                {s.status !== 'cancelled' ? <Button title="Cancel" size="sm" variant="danger" full={false} onPress={() => fb.confirm('Cancel subscription?', 'No further orders will be generated. Existing orders are kept.', () => act(exec({ t: 'sub.status', id: s.id, status: 'cancelled' }), 'Cancelled'), 'Cancel subscription', true)} /> : null}
              </View>
            </Card>
          );
        }} />
      <Fab label="New" onPress={() => nav.navigate('SubscriptionForm')} />
    </Screen>
  );
}
