import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, Screen, SectionTitle } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Button } from '../../../components/common/Button';
import { CountUp, Row } from '../../../components/common/Misc';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { Icon } from '../../../components/common/Icon';
import { DonutChart } from '../../../components/charts/DonutChart';
import { useFeedback } from '../../../components/common/Feedback';
import { useBalances, useDb, useSettings } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { depositHeld, totalOutstanding } from '../services/ledger';
import { receiptHtml } from '../services/invoice';
import { sharePdf } from '../../../services/export';
import { PAYMENT_METHODS } from '../../../types/domain';
import { formatDateTime, isoToDateStr, todayStr, addDays } from '../../../utils/date';
import { labelize } from '../../../utils/format';

export default function PaymentsScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const settings = useSettings();
  const fb = useFeedback();
  const balances = useBalances();
  const { money } = useFormat();
  const [f, setF] = useState<'all' | 'payment' | 'deposit_refund'>('all');

  const s = useMemo(() => {
    const today = todayStr(), from = addDays(today, -29);
    const pays = db.financialEntries.filter((e) => e.kind === 'payment');
    const sum = (a: typeof pays) => a.reduce((t, e) => t + e.amount, 0);
    const byMethod = PAYMENT_METHODS.map((m) => ({ m, v: sum(pays.filter((e) => e.method === m && isoToDateStr(e.at) >= from)) }));
    return {
      today: sum(pays.filter((e) => isoToDateStr(e.at) === today)), month: sum(pays.filter((e) => isoToDateStr(e.at) >= from)), byMethod,
      deposits: db.customers.reduce((t, cu) => t + depositHeld(db.financialEntries, cu.id), 0),
      credit: [...balances.values()].filter((v) => v < 0).reduce((t, v) => t - v, 0),
    };
  }, [db, balances]);
  const dues = useMemo(() => [...balances.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5), [balances]);
  const history = db.financialEntries.filter((e) => (f === 'all' ? e.kind === 'payment' || e.kind === 'deposit_refund' : e.kind === f)).slice(0, 40);
  const colors = [c.success, c.secondary, '#7C5CFC', c.warning];

  return (
    <Screen scroll header={<Header title="Payments" subtitle="Collections, dues and deposits" />}>
      <LinearGradient colors={c.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 14 }}>
        <View><AppText v="overline" color="rgba(255,255,255,0.7)">Outstanding receivable</AppText><CountUp value={totalOutstanding(db.financialEntries)} format={(n) => money(n)} v="display" color="#fff" /></View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[{ l: 'Collected today', v: s.today }, { l: 'Last 30 days', v: s.month }, { l: 'Deposits held', v: s.deposits }].map((x) => (
            <View key={x.l} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 10 }}><AppText v="caption" color="rgba(255,255,255,0.75)">{x.l}</AppText><AppText v="h3" color="#fff">{money(x.v, true)}</AppText></View>
          ))}
        </View>
      </LinearGradient>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button title="Record payment" icon="plus" textVariant="label" onPress={() => nav.navigate('RecordPayment')} /></View>
        <View style={{ flex: 1 }}><Button title="Refund deposit" icon="rotate-ccw" variant="soft" textVariant="label" onPress={() => nav.navigate('DepositRefund')} /></View>
      </View>
      <Card style={{ gap: 10 }}>
        <AppText v="h3">Collections by method (30d)</AppText>
        <DonutChart size={120} centerValue={money(s.month, true)} segments={s.byMethod.map((x, i) => ({ label: labelize(x.m), value: x.v, color: colors[i] }))} />
        {s.credit > 0 ? <Row label="Advance credit held" value={money(s.credit)} /> : null}
      </Card>
      <SectionTitle title="Top outstanding" />
      <Card pad={4}>
        {dues.length === 0 ? <EmptyState title="All settled" message="No customer has an outstanding balance." /> : dues.map(([id, v], i) => (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <AppText v="bodyBold" style={{ flex: 1 }} onPress={() => nav.navigate('CustomerDetail', { id })}>{db.customers.find((x) => x.id === id)?.name}</AppText>
            <AppText v="h3" color="error">{money(v)}</AppText>
            <Button title="Collect" size="sm" variant="soft" full={false} onPress={() => nav.navigate('RecordPayment', { customerId: id })} />
          </View>
        ))}
      </Card>
      <SectionTitle title="Payment history" />
      <FilterChips pad={0} value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'payment', label: 'Payments' }, { value: 'deposit_refund', label: 'Refunds' }]} />
      <Card pad={4}>
        {history.length === 0 ? <EmptyState title="No payments yet" message="Recorded payments will be listed here." /> : history.map((e, i) => {
          const refund = e.kind === 'deposit_refund';
          return (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: refund ? c.warningSoft : c.successSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={refund ? 'arrow-up-right' : 'arrow-down-left'} size={16} color={refund ? c.warning : c.success} /></View>
              <View style={{ flex: 1 }}>
                <AppText v="bodyBold" numberOfLines={1}>{db.customers.find((x) => x.id === e.customerId)?.name}</AppText>
                <AppText v="caption" color="textMuted">{refund ? 'Deposit refund' : `${labelize(e.method ?? 'cash')} · ${e.receiptNo}`} · {formatDateTime(e.at)}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText v="h3" color={refund ? 'warning' : 'success'}>{refund ? '−' : '+'}{money(e.amount)}</AppText>
                {!refund ? <AppText v="caption" color="secondary" accessibilityRole="button" onPress={async () => { try { await sharePdf(receiptHtml(db, settings, e), `Receipt ${e.receiptNo}`); } catch { fb.error('Could not generate the receipt.'); } }}>Receipt PDF</AppText> : null}
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
