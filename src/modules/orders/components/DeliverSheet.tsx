import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '../../../components/common/BottomSheet';
import { AppText } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { Row } from '../../../components/common/Misc';
import { Stepper } from '../../../components/forms/Stepper';
import { TextField } from '../../../components/forms/TextField';
import { SelectField } from '../../../components/forms/SelectField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { Order, PAYMENT_METHODS, PaymentMethod } from '../../../types/domain';
import { bottleBalance, orderSubtotal } from '../../payments/services/ledger';
import { estimateDeposit } from '../services/orderService';
import { labelize, round2, toNum } from '../../../utils/format';

/** Mark-as-delivered form: empties collected + payment received. Shared by order details and Delivery Mode. */
export const DeliverSheet = ({ order, visible, onClose, onDone }: { order: Order; visible: boolean; onClose: () => void; onDone?: () => void }) => {
  const db = useDb();
  const settings = useSettings();
  const exec = useExec();
  const fb = useFeedback();
  const { money } = useFormat();
  const [empties, setEmpties] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [busy, setBusy] = useState(false);

  const returnable = order.items.filter((i) => i.returnable);
  const deposit = useMemo(() => estimateDeposit(db, settings, order, empties), [db, settings, order, empties]);
  const total = round2(orderSubtotal(order) - order.discount + order.deliveryCharge + order.taxAmount + deposit);
  const pay = amount === null ? total : toNum(amount);

  const submit = () => {
    if (busy) return;
    setBusy(true);
    const r = exec({ t: 'order.deliver', v: { orderId: order.id, empties, payment: pay > 0 ? { amount: pay, method } : undefined } });
    setBusy(false);
    if (!r.ok) return fb.error(r.error, 'Cannot complete delivery');
    onClose();
    fb.success('Delivered', order.number);
    onDone?.();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Complete delivery" tall>
      {returnable.length > 0 ? (
        <View style={{ gap: 8 }}>
          <AppText v="h3">Empty bottles collected</AppText>
          {returnable.map((i) => {
            const held = bottleBalance(db.bottleLedger, order.customerId, i.productId);
            return (
              <View key={i.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}><AppText v="bodyBold">{i.name}</AppText><AppText v="caption" color="textMuted">Delivering {i.qty} · customer holds {held}</AppText></View>
                <Stepper value={empties[i.productId] ?? 0} max={held} onChange={(n) => setEmpties({ ...empties, [i.productId]: n })} />
              </View>
            );
          })}
        </View>
      ) : null}
      <View style={{ gap: 2 }}>
        <Row label="Products" value={money(orderSubtotal(order))} />
        {order.discount > 0 ? <Row label="Discount" value={`−${money(order.discount)}`} /> : null}
        <Row label="Delivery" value={money(order.deliveryCharge)} />
        {order.taxAmount > 0 ? <Row label="Tax" value={money(order.taxAmount)} /> : null}
        <Row label="Bottle deposit" value={money(deposit)} />
        <Row label="Order total" value={money(total)} bold />
      </View>
      <TextField label="Payment received" prefix={settings.currency.symbol} keyboardType="decimal-pad" value={amount ?? String(total)} onChangeText={setAmount} hint="Enter 0 if nothing was collected. Partial amounts leave the balance outstanding." />
      <SelectField label="Payment method" value={method} onChange={setMethod} options={PAYMENT_METHODS.filter((m) => settings.paymentMethods[m]).map((m) => ({ value: m, label: labelize(m) }))} />
      <Button title="Confirm delivery" icon="check-circle" onPress={submit} loading={busy} />
    </BottomSheet>
  );
};
