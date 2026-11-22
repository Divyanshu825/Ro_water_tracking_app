import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Row } from '../../../components/common/Misc';
import { FormText } from '../../../components/forms/TextField';
import { FormSelect } from '../../../components/forms/SelectField';
import { FormDate } from '../../../components/forms/DateField';
import { Stepper } from '../../../components/forms/Stepper';
import { useFeedback } from '../../../components/common/Feedback';
import { ProductThumb } from '../../products/components/ProductThumb';
import { useExec } from '../../../store/hooks';
import { useDb, useRequestId, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { TIME_SLOTS, defaultDeliveryCharge, priceOrder } from '../services/orderService';
import { getStock } from '../../inventory/services/inventoryService';
import { numStr } from '../../../utils/zodHelpers';
import { formatCapacity, toNum } from '../../../utils/format';
import { addDays, formatTimeSlot, todayStr } from '../../../utils/date';
import { useTheme } from '../../../theme';

const schema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  addressId: z.string().min(1, 'Select a delivery address'),
  deliveryDate: z.string().min(1, 'Select a delivery date'),
  timeSlot: z.string().min(1, 'Select a time slot'),
  instructions: z.string(),
  discount: numStr('Discount', 0, { required: false }),
  deliveryCharge: numStr('Delivery charge', 0, { required: false }),
  staffId: z.string(),
});
type F = z.infer<typeof schema>;

export default function OrderCreateScreen() {
  const c = useTheme();
  const nav = useNav();
  const params = useParams<'OrderCreate'>();
  const db = useDb();
  const settings = useSettings();
  const exec = useExec();
  const fb = useFeedback();
  const requestId = useRequestId();
  const { money } = useFormat();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [chargeEdited, setChargeEdited] = useState(false);

  const customers = useMemo(() => db.customers.filter((x) => x.active), [db.customers]);
  const first = params?.customerId ? db.customers.find((x) => x.id === params.customerId) : undefined;
  const { control, handleSubmit, setValue } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { customerId: first?.id ?? '', addressId: first?.addresses[0]?.id ?? '', deliveryDate: todayStr(), timeSlot: TIME_SLOTS[1], instructions: '', discount: '0', deliveryCharge: String(settings.delivery.defaultCharge), staffId: '' },
  });
  const w = useWatch({ control });
  const customer = db.customers.find((x) => x.id === w.customerId);
  React.useEffect(() => {
    if (customer && !customer.addresses.some((a) => a.id === w.addressId)) setValue('addressId', customer.addresses[0]?.id ?? '');
  }, [customer, w.addressId, setValue]);
  const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([productId, n]) => ({ productId, qty: n }));
  const discount = toNum(w.discount);
  const charge = toNum(w.deliveryCharge);
  const price = useMemo(() => priceOrder(db, settings, w.customerId ?? '', lines, discount, charge), [db, settings, w.customerId, qty, discount, charge]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQtyFor = (id: string, n: number) => {
    const next = { ...qty, [id]: n };
    setQty(next);
    if (!chargeEdited) {
      const sub = priceOrder(db, settings, w.customerId ?? '', Object.entries(next).map(([productId, q]) => ({ productId, qty: q })), 0, 0).subtotal;
      setValue('deliveryCharge', String(defaultDeliveryCharge(settings, sub)));
    }
  };

  const submit = handleSubmit((v) => {
    if (lines.length === 0) return fb.error('Add at least one product to the order.', 'No products');
    const r = exec({ t: 'order.create', v: { customerId: v.customerId, addressId: v.addressId, items: lines, deliveryDate: v.deliveryDate, timeSlot: v.timeSlot, instructions: v.instructions, discount: toNum(v.discount), deliveryCharge: toNum(v.deliveryCharge), staffId: v.staffId || undefined, requestId } });
    if (!r.ok) return fb.error(r.error);
    fb.success('Order created', r.number);
    nav.replace('OrderDetail', { id: r.id });
  });

  return (
    <Screen scroll header={<Header title="New order" />} footer={
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><AppText color="textMuted">Total payable</AppText><AppText v="h2">{money(price.total)}</AppText></View>
        <Button title="Create order" icon="check" onPress={submit} />
      </View>}>
      <Card style={{ gap: 14 }}>
        <AppText v="h3">Customer & delivery</AppText>
        <FormSelect control={control} name="customerId" label="Customer" required placeholder="Select customer" searchable
          options={customers.map((x) => ({ value: x.id, label: x.name, sub: `${x.type} · ${x.phone}` }))} />
        {customer ? <FormSelect control={control} name="addressId" label="Delivery address" required options={customer.addresses.map((a) => ({ value: a.id, label: a.label, sub: `${a.line}, ${a.city}` }))} /> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><FormDate control={control} name="deliveryDate" label="Delivery date" required min={addDays(todayStr(), -1)} /></View>
          <View style={{ flex: 1 }}><FormSelect control={control} name="timeSlot" label="Time slot" required options={TIME_SLOTS.map((t) => ({ value: t, label: formatTimeSlot(t) }))} /></View>
        </View>
        <FormText control={control} name="instructions" label="Delivery instructions" placeholder="Gate code, floor, call on arrival…" multiline />
      </Card>

      <Card style={{ gap: 10 }}>
        <AppText v="h3">Products</AppText>
        {db.products.filter((p) => p.active).sort((a, b) => a.capacityMl - b.capacityMl).map((p) => {
          const n = qty[p.id] ?? 0;
          const avail = getStock(db, p.id).filled;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
              <ProductThumb uri={p.image} size={44} />
              <View style={{ flex: 1 }}>
                <AppText v="bodyBold" numberOfLines={1}>{p.name}</AppText>
                <AppText v="caption" color={n > avail ? 'error' : 'textMuted'}>{money(p.sellingPrice)} · {formatCapacity(p.capacityMl)}{p.returnable ? ` · deposit ${money(p.deposit)}` : ''} · {avail} in stock</AppText>
              </View>
              <Stepper value={n} onChange={(v) => setQtyFor(p.id, v)} />
            </View>
          );
        })}
        {lines.some((l) => l.qty > getStock(db, l.productId).filled) ? <AppText v="caption" color="warning">Some quantities exceed filled stock. The order can be created, but dispatch is blocked until stock is added.</AppText> : null}
      </Card>

      <Card style={{ gap: 14 }}>
        <AppText v="h3">Charges & staff</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><FormText control={control} name="discount" label="Discount" prefix={settings.currency.symbol} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><FormText control={control} name="deliveryCharge" label="Delivery charge" prefix={settings.currency.symbol} keyboardType="decimal-pad" onFocus={() => setChargeEdited(true)} /></View>
        </View>
        <FormSelect control={control} name="staffId" label="Assign delivery staff (optional)" placeholder="Assign later"
          options={[{ value: '', label: 'Assign later' }, ...db.staff.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name, sub: s.vehicle }))]} />
      </Card>

      <Card style={{ gap: 2 }}>
        <AppText v="h3" style={{ marginBottom: 6 }}>Summary</AppText>
        <Row label="Subtotal" value={money(price.subtotal)} />
        {discount > 0 ? <Row label="Discount" value={`−${money(discount)}`} color={c.success} /> : null}
        <Row label="Delivery charge" value={money(charge)} />
        {price.tax > 0 ? <Row label={`${settings.tax.label} (${settings.tax.rate}%)`} value={money(price.tax)} /> : null}
        <Row label="Bottle deposit (estimate)" value={money(price.deposit)} />
        <AppText v="caption" color="textMuted">Deposit is finalised at delivery based on empties collected, and is tracked separately from revenue.</AppText>
      </Card>
    </Screen>
  );
}
