import React, { useState } from 'react';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Row } from '../../../components/common/Misc';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useBalances, useDb, useRequestId, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav, useParams } from '../../../navigation/hooks';
import { PAYMENT_METHODS, PaymentMethod } from '../../../types/domain';
import { labelize, toNum } from '../../../utils/format';

export default function RecordPaymentScreen() {
  const nav = useNav();
  const params = useParams<'RecordPayment'>();
  const db = useDb();
  const settings = useSettings();
  const balances = useBalances();
  const exec = useExec();
  const fb = useFeedback();
  const requestId = useRequestId();
  const { money } = useFormat();
  const [customerId, setCustomerId] = useState(params?.customerId ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const bal = balances.get(customerId) ?? 0;
  const amt = toNum(amount);
  const after = bal - amt;

  const submit = () => {
    const r = exec({ t: 'payment.record', v: { customerId, amount: amt, method, note, requestId } });
    if (!r.ok) return setErr(r.error);
    fb.success('Payment recorded', r.advance ? `${r.receiptNo} · includes advance` : r.receiptNo);
    nav.goBack();
  };
  return (
    <Screen scroll header={<Header title="Record payment" />} footer={<Button title="Save payment" icon="check" onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <SelectField label="Customer" value={customerId} searchable placeholder="Select customer" options={db.customers.map((c) => ({ value: c.id, label: c.name, sub: (balances.get(c.id) ?? 0) > 0 ? `Owes ${money(balances.get(c.id) ?? 0)}` : c.phone }))} onChange={setCustomerId} />
        <TextField label="Amount" prefix={settings.currency.symbol} value={amount} onChangeText={(v) => { setAmount(v); setErr(''); }} keyboardType="decimal-pad" placeholder="0" error={err || undefined} />
        {customerId && bal > 0 ? <Button title={`Pay full outstanding ${money(bal)}`} size="sm" variant="soft" onPress={() => setAmount(String(bal))} /> : null}
        <SelectField label="Method" value={method} onChange={setMethod} options={PAYMENT_METHODS.filter((m) => settings.paymentMethods[m]).map((m) => ({ value: m, label: labelize(m) }))} />
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Reference no., remarks" />
      </Card>
      {customerId ? (
        <Card style={{ gap: 2 }}>
          <Row label={bal < 0 ? 'Current advance credit' : 'Current outstanding'} value={money(Math.abs(bal))} />
          <Row label="This payment" value={`−${money(amt)}`} />
          <Row label={after < 0 ? 'Advance after payment' : 'Outstanding after'} value={money(Math.abs(after))} bold color={after < 0 ? '#16A34A' : undefined} />
          {amt > 0 && bal > 0 && amt < bal ? <AppText v="caption" color="warning">Partial payment: the remaining balance stays outstanding.</AppText> : null}
          {amt > Math.max(bal, 0) && amt > 0 ? <AppText v="caption" color="success">Amount exceeds dues, so the excess is kept as advance payment.</AppText> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
