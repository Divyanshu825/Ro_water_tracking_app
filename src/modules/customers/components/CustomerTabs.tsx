import React from 'react';
import { View } from 'react-native';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Row } from '../../../components/common/Misc';
import { Badge } from '../../../components/common/Badge';
import { EmptyState } from '../../../components/common/EmptyState';
import { OrderCard } from '../../../components/cards/OrderCard';
import { Customer, DbState } from '../../../types/domain';
import { BALANCE_SIGN, bottleBalance, depositedBottles } from '../../payments/services/ledger';
import { FREQ_LABEL, displayStatus, subscriptionStats } from '../../subscriptions/services/subscriptionService';
import { useTheme } from '../../../theme';
import { useFormat } from '../../../hooks/useFormat';
import { formatDate, formatDateTime } from '../../../utils/date';
import { labelize } from '../../../utils/format';
import { useNav } from '../../../navigation/hooks';

const KIND_LABEL: Record<string, string> = { product: 'Products', delivery: 'Delivery charge', tax: 'Tax', deposit: 'Bottle deposit', discount: 'Discount', payment: 'Payment', deposit_refund: 'Deposit refund (paid out)' };

export const OverviewTab = ({ customer }: { customer: Customer }) => (
  <>
    <Card style={{ gap: 6 }}>
      <AppText v="h3" style={{ marginBottom: 4 }}>Personal information</AppText>
      <Row label="Name" value={customer.name} />
      <Row label="Mobile" value={customer.phone} />
      <Row label="Email" value={customer.email || '—'} />
      <Row label="Type" value={customer.type} />
      <Row label="Customer since" value={formatDate(customer.createdAt.slice(0, 10))} />
    </Card>
    <Card style={{ gap: 12 }}>
      <AppText v="h3">Delivery addresses</AppText>
      {customer.addresses.map((a) => (
        <View key={a.id} style={{ gap: 2 }}>
          <Badge label={a.label} status="confirmed" />
          <AppText style={{ marginTop: 4 }}>{a.line}</AppText>
          <AppText v="caption" color="textMuted">{a.city} {a.pincode}</AppText>
        </View>
      ))}
    </Card>
    <Card style={{ gap: 6 }}>
      <AppText v="h3">Notes</AppText>
      <AppText color={customer.notes ? 'text' : 'textMuted'}>{customer.notes || 'No notes added.'}</AppText>
    </Card>
  </>
);

export const OrdersTab = ({ db, customerId }: { db: DbState; customerId: string }) => {
  const nav = useNav();
  const list = db.orders.filter((o) => o.customerId === customerId);
  if (!list.length) return <Card><EmptyState title="No orders yet" message="Orders placed for this customer will appear here." /></Card>;
  return <>{list.map((o) => <OrderCard key={o.id} order={o} onPress={() => nav.navigate('OrderDetail', { id: o.id })} />)}</>;
};

export const PaymentsTab = ({ db, customerId }: { db: DbState; customerId: string }) => {
  const c = useTheme();
  const { money } = useFormat();
  const list = db.financialEntries.filter((e) => e.customerId === customerId);
  if (!list.length) return <Card><EmptyState title="No transactions" message="Charges and payments will be listed here." /></Card>;
  // running balance, oldest first
  const asc = [...list].reverse();
  let run = 0;
  const bal = new Map<string, number>();
  for (const e of asc) { run += BALANCE_SIGN[e.kind] * e.amount; bal.set(e.id, run); }
  return (
    <Card pad={4}>
      {list.map((e, i) => {
        const sign = BALANCE_SIGN[e.kind];
        const col = e.kind === 'payment' ? c.success : e.kind === 'deposit_refund' ? c.warning : sign < 0 ? c.success : c.text;
        return (
          <View key={e.id} style={{ padding: 12, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText v="bodyBold">{KIND_LABEL[e.kind]}{e.method ? ` · ${labelize(e.method)}` : ''}</AppText>
              <AppText v="bodyBold" style={{ color: col }}>{sign < 0 ? '−' : e.kind === 'deposit_refund' ? '−' : '+'}{money(e.amount)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText v="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>{e.note || '—'} · {formatDateTime(e.at)}</AppText>
              <AppText v="caption" color="textMuted">Bal {money(bal.get(e.id) ?? 0)}</AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
};

export const BottlesTab = ({ db, customerId }: { db: DbState; customerId: string }) => {
  const c = useTheme();
  const rows = db.products.map((p) => ({ p, held: bottleBalance(db.bottleLedger, customerId, p.id), dep: depositedBottles(db.bottleLedger, customerId, p.id) })).filter((r) => r.held !== 0 || r.dep !== 0);
  const entries = db.bottleLedger.filter((b) => b.customerId === customerId && b.delta !== 0);
  return (
    <>
      <Card style={{ gap: 10 }}>
        <AppText v="h3">Bottles with customer</AppText>
        {rows.length === 0 ? <AppText color="textMuted">This customer holds no returnable bottles.</AppText> : rows.map(({ p, held, dep }) => (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><AppText v="bodyBold">{p.name}</AppText><AppText v="caption" color="textMuted">{dep} bottle deposit(s) held</AppText></View>
            <AppText v="h2" color={held > 0 ? 'secondary' : 'text'}>{held}</AppText>
          </View>
        ))}
      </Card>
      <Card pad={4}>
        <AppText v="h3" style={{ padding: 12 }}>Bottle ledger</AppText>
        {entries.length === 0 ? <AppText color="textMuted" style={{ padding: 12 }}>No bottle movements yet.</AppText> : entries.map((b, i) => (
          <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText v="bodyBold">{db.products.find((p) => p.id === b.productId)?.name}</AppText>
              <AppText v="caption" color="textMuted" numberOfLines={1}>{b.note} · {formatDateTime(b.at)}</AppText>
            </View>
            <AppText v="h3" color={b.delta > 0 ? 'secondary' : 'success'}>{b.delta > 0 ? '+' : ''}{b.delta}</AppText>
          </View>
        ))}
      </Card>
    </>
  );
};

export const SubscriptionsTab = ({ db, customerId }: { db: DbState; customerId: string }) => {
  const { money } = useFormat();
  const nav = useNav();
  const subs = db.subscriptions.filter((s) => s.customerId === customerId);
  if (!subs.length) return <Card><EmptyState title="No subscriptions" message="Set up recurring deliveries for this customer." actionLabel="Create subscription" onAction={() => nav.navigate('SubscriptionForm')} /></Card>;
  return (
    <>
      {subs.map((s) => {
        const st = subscriptionStats(db, s);
        return (
          <Card key={s.id} style={{ gap: 6 }} onPress={() => nav.navigate('SubscriptionForm', { id: s.id })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText v="h3">{FREQ_LABEL[s.frequency]}</AppText><Badge status={displayStatus(s)} /></View>
            <AppText color="textMuted" v="caption">{s.items.map((i) => `${i.qty}× ${db.products.find((p) => p.id === i.productId)?.name}`).join(', ')}</AppText>
            <Row label="Remaining deliveries" value={String(st.remaining)} />
            <Row label="Per delivery" value={money(st.perDelivery)} />
          </Card>
        );
      })}
    </>
  );
};
