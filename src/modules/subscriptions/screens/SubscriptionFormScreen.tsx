import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Row } from '../../../components/common/Misc';
import { SelectField } from '../../../components/forms/SelectField';
import { DateField } from '../../../components/forms/DateField';
import { TextField } from '../../../components/forms/TextField';
import { Stepper } from '../../../components/forms/Stepper';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { FREQ_LABEL, scheduleDates } from '../services/subscriptionService';
import { TIME_SLOTS } from '../../orders/services/orderService';
import { Frequency } from '../../../types/domain';
import { addDays, todayStr } from '../../../utils/date';
import { toNum } from '../../../utils/format';

export default function SubscriptionFormScreen() {
  const nav = useNav();
  const params = useParams<'SubscriptionForm'>();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const ex = db.subscriptions.find((s) => s.id === params?.id);
  const [customerId, setCustomerId] = useState(ex?.customerId ?? '');
  const [addressId, setAddressId] = useState(ex?.addressId ?? '');
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries((ex?.items ?? []).map((i) => [i.productId, i.qty])));
  const [frequency, setFrequency] = useState<Frequency>(ex?.frequency ?? 'daily');
  const [interval, setInterval] = useState(String(ex?.intervalDays ?? 3));
  const [start, setStart] = useState(ex?.startDate ?? todayStr());
  const [end, setEnd] = useState(ex?.endDate ?? addDays(todayStr(), 29));
  const [slot, setSlot] = useState(ex?.timeSlot ?? TIME_SLOTS[1]);
  const customer = db.customers.find((c) => c.id === customerId);
  useEffect(() => { if (customer && !customer.addresses.some((a) => a.id === addressId)) setAddressId(customer.addresses[0]?.id ?? ''); }, [customer, addressId]);

  const items = Object.entries(qty).filter(([, n]) => n > 0).map(([productId, n]) => ({ productId, qty: n }));
  const dates = useMemo(() => scheduleDates({ frequency, intervalDays: toNum(interval) || 1, startDate: start, endDate: end }), [frequency, interval, start, end]);
  const per = items.reduce((s, i) => s + i.qty * (db.products.find((p) => p.id === i.productId)?.sellingPrice ?? 0), 0);

  const submit = () => {
    const r = exec({ t: 'sub.save', v: { id: ex?.id, customerId, addressId, items, frequency, intervalDays: toNum(interval) || 1, startDate: start, endDate: end, timeSlot: slot } });
    if (!r.ok) return fb.error(r.error);
    fb.success(ex ? 'Subscription updated' : 'Subscription created');
    nav.goBack();
  };
  return (
    <Screen scroll header={<Header title={ex ? 'Edit subscription' : 'New subscription'} />} footer={<Button title={ex ? 'Save changes' : 'Create subscription'} onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <SelectField label="Customer" value={customerId} searchable placeholder="Select customer" options={db.customers.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name, sub: c.type }))} onChange={setCustomerId} />
        {customer ? <SelectField label="Delivery address" value={addressId} options={customer.addresses.map((a) => ({ value: a.id, label: a.label, sub: a.line }))} onChange={setAddressId} /> : null}
        <SelectField label="Frequency" value={frequency} options={(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => ({ value: f, label: FREQ_LABEL[f] }))} onChange={setFrequency} />
        {frequency === 'custom' ? <TextField label="Deliver every (days)" value={interval} onChangeText={setInterval} keyboardType="number-pad" /> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><DateField label="Start date" value={start} onChange={setStart} /></View>
          <View style={{ flex: 1 }}><DateField label="End date" value={end} min={start} onChange={setEnd} /></View>
        </View>
        <SelectField label="Time slot" value={slot} options={TIME_SLOTS.map((t) => ({ value: t, label: t }))} onChange={setSlot} />
      </Card>
      <Card style={{ gap: 8 }}>
        <AppText v="h3">Products per delivery</AppText>
        {db.products.filter((p) => p.active).map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><AppText v="bodyBold">{p.name}</AppText><AppText v="caption" color="textMuted">{money(p.sellingPrice)}</AppText></View>
            <Stepper value={qty[p.id] ?? 0} onChange={(n) => setQty({ ...qty, [p.id]: n })} />
          </View>
        ))}
      </Card>
      <Card style={{ gap: 2 }}>
        <Row label="Scheduled deliveries" value={String(dates.length)} />
        <Row label="Per delivery" value={money(per)} />
        <Row label="Total subscription amount" value={money(per * dates.length)} bold />
        <AppText v="caption" color="textMuted">Orders are generated for today and tomorrow, once per scheduled date, with no duplicates.</AppText>
      </Card>
    </Screen>
  );
}
