import React, { useState } from 'react';
import { View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { AppText } from '../../../components/common/Text';
import { Segmented } from '../../../components/common/Chips';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { useFeedback } from '../../../components/common/Feedback';
import { useExec } from '../../../store/hooks';
import { useDb, useRequestId, useSettings } from '../../../hooks/useData';
import { useNav, useParams } from '../../../navigation/hooks';
import { InventoryEntryKind, getStock } from '../services/inventoryService';
import { bottleBalance } from '../../payments/services/ledger';
import { StockField } from '../../../types/domain';
import { toNum } from '../../../utils/format';

const TITLES: Record<InventoryEntryKind, string> = { new_stock: 'New stock entry', purchase: 'Bottle purchase', refill: 'Refill empties', adjust: 'Stock adjustment', damaged: 'Damaged bottles', lost: 'Lost bottles', collect_empty: 'Empty bottle collection' };
const HELP: Record<InventoryEntryKind, string> = {
  new_stock: 'Adds newly filled bottles (e.g. from production).', purchase: 'Adds new empty bottles you bought. Optionally records a Bottle Purchase expense.',
  refill: 'Moves empty bottles to filled after refilling.', adjust: 'Corrects a stock count after a physical check.',
  damaged: 'Moves bottles to damaged stock.', lost: 'Writes bottles off as lost.', collect_empty: 'Takes empty bottles back from a customer and updates their bottle ledger.',
};

export default function StockEntryScreen() {
  const nav = useNav();
  const params = useParams<'StockEntry'>();
  const db = useDb();
  const settings = useSettings();
  const exec = useExec();
  const fb = useFeedback();
  const requestId = useRequestId();
  const [kind, setKind] = useState<InventoryEntryKind>(params?.kind ?? 'new_stock');
  const [productId, setProductId] = useState(params?.productId ?? '');
  const [customerId, setCustomerId] = useState('');
  const [qty, setQty] = useState('');
  const [field, setField] = useState<StockField>('filled');
  const [dir, setDir] = useState<'1' | '-1'>('1');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [lostFrom, setLostFrom] = useState<'empty' | 'withCustomers'>('empty');
  const [dmgFrom, setDmgFrom] = useState<'filled' | 'empty'>('filled');

  const product = db.products.find((p) => p.id === productId);
  const st = product ? getStock(db, product.id) : undefined;
  const heldBy = customerId && productId ? bottleBalance(db.bottleLedger, customerId, productId) : 0;
  const returnables = db.products.filter((p) => p.returnable || kind !== 'collect_empty');

  const submit = () => {
    setErr('');
    const q = toNum(qty);
    const f = kind === 'adjust' ? field : kind === 'damaged' ? dmgFrom : kind === 'lost' ? lostFrom : undefined;
    const r = exec({ t: 'inventory.entry', v: { productId, kind, qty: q, field: f, direction: kind === 'adjust' ? (Number(dir) as 1 | -1) : undefined, customerId: customerId || undefined, unitCost: toNum(cost) || undefined, note, requestId } });
    if (!r.ok) return setErr(r.error);
    fb.success('Stock updated', TITLES[kind]);
    nav.goBack();
  };

  return (
    <Screen scroll header={<Header title={TITLES[kind]} />} footer={<Button title="Save entry" icon="check" onPress={submit} />}>
      <Card style={{ gap: 14 }}>
        <AppText v="caption" color="textMuted">{HELP[kind]}</AppText>
        <SelectField label="Product" value={productId} placeholder="Select product" options={returnables.map((p) => ({ value: p.id, label: p.name, sub: `${getStock(db, p.id).filled} filled · ${getStock(db, p.id).empty} empty` }))} onChange={setProductId} />
        {st ? <AppText v="caption" color="textMuted">Current: {st.filled} filled · {st.empty} empty · {st.withCustomers} with customers · {st.damaged} damaged · {st.lost} lost</AppText> : null}
        {(kind === 'collect_empty' || (kind === 'lost' && lostFrom === 'withCustomers')) ? (
          <SelectField label="Customer" value={customerId} placeholder="Select customer" searchable options={db.customers.map((c) => ({ value: c.id, label: c.name, sub: productId ? `Holds ${bottleBalance(db.bottleLedger, c.id, productId)}` : c.phone }))} onChange={setCustomerId} />
        ) : null}
        {customerId && productId ? <AppText v="caption" color="textMuted">Customer currently holds {heldBy} of this product.</AppText> : null}
        {kind === 'adjust' ? (
          <View style={{ gap: 10 }}>
            <SelectField label="Adjust which stock" value={field} onChange={setField} options={(['filled', 'empty', 'withCustomers', 'damaged', 'lost'] as StockField[]).map((f) => ({ value: f, label: f === 'withCustomers' ? 'With customers' : f[0].toUpperCase() + f.slice(1) }))} />
            <Segmented value={dir} onChange={setDir} options={[{ value: '1', label: 'Add' }, { value: '-1', label: 'Remove' }]} />
          </View>
        ) : null}
        {kind === 'damaged' ? <Segmented value={dmgFrom} onChange={setDmgFrom} options={[{ value: 'filled', label: 'From filled' }, { value: 'empty', label: 'From empty' }]} /> : null}
        {kind === 'lost' ? <Segmented value={lostFrom} onChange={setLostFrom} options={[{ value: 'empty', label: 'From empty' }, { value: 'withCustomers', label: 'With customer' }]} /> : null}
        <TextField label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="0" />
        {kind === 'purchase' ? <TextField label="Cost per bottle (optional)" prefix={settings.currency.symbol} value={cost} onChangeText={setCost} keyboardType="decimal-pad" hint="If set, an expense is recorded automatically." /> : null}
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Supplier, batch, reason…" multiline />
        {err ? <AppText color="error" v="bodyBold">{err}</AppText> : null}
      </Card>
    </Screen>
  );
}
