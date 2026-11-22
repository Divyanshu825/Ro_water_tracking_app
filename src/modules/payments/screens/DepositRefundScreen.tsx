import React, { useState } from 'react';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Row } from '../../../components/common/Misc';
import { SelectField } from '../../../components/forms/SelectField';
import { Stepper } from '../../../components/forms/Stepper';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb, useRequestId } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { refundableBottles } from '../services/paymentService';
import { bottleBalance, depositHeld } from '../services/ledger';

export default function DepositRefundScreen() {
  const nav = useNav();
  const params = useParams<'DepositRefund'>();
  const db = useDb();
  const exec = useExec();
  const fb = useFeedback();
  const requestId = useRequestId();
  const { money } = useFormat();
  const [customerId, setCustomerId] = useState(params?.customerId ?? '');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const product = db.products.find((p) => p.id === productId);
  const max = customerId && productId ? refundableBottles(db, customerId, productId) : 0;
  const submit = () => {
    const r = exec({ t: 'payment.refund', v: { customerId, productId, qty, requestId } });
    if (!r.ok) return fb.error(r.error);
    fb.success('Deposit refunded', money(r.amount));
    nav.goBack();
  };
  return (
    <Screen scroll header={<Header title="Refund bottle deposit" />} footer={<Button title="Refund deposit" icon="check" disabled={max === 0} onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <AppText v="caption" color="textMuted">Deposits can be refunded only for bottles the customer has returned.</AppText>
        <SelectField label="Customer" value={customerId} searchable placeholder="Select customer" options={db.customers.map((c) => ({ value: c.id, label: c.name, sub: `Deposit held ${money(depositHeld(db.financialEntries, c.id))}` }))} onChange={setCustomerId} />
        <SelectField label="Product" value={productId} placeholder="Select product" options={db.products.filter((p) => p.returnable).map((p) => ({ value: p.id, label: p.name, sub: customerId ? `${refundableBottles(db, customerId, p.id)} refundable · holds ${bottleBalance(db.bottleLedger, customerId, p.id)}` : undefined }))} onChange={(v) => { setProductId(v); setQty(1); }} />
        {productId && customerId ? (
          <>
            <Row label="Refundable bottles" value={String(max)} />
            {max > 0 ? <Row label="Bottles to refund" value={<Stepper value={qty} min={1} max={max} onChange={setQty} />} /> : <AppText color="warning" v="caption">No returned bottles with a held deposit. Collect empties first.</AppText>}
            {product && max > 0 ? <Row label="Refund amount" value={money(qty * product.deposit)} bold /> : null}
          </>
        ) : null}
      </Card>
    </Screen>
  );
}
