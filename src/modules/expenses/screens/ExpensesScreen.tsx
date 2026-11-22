import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Header, Screen } from '../../../components/common/Screen';
import { Card } from '../../../components/common/Card';
import { AppText } from '../../../components/common/Text';
import { Fab, CountUp } from '../../../components/common/Misc';
import { FilterChips } from '../../../components/common/Chips';
import { EmptyState } from '../../../components/common/EmptyState';
import { DonutChart, chartColors } from '../../../components/charts/DonutChart';
import { BarChart } from '../../../components/charts/BarChart';
import { Icon } from '../../../components/common/Icon';
import { useDb } from '../../../hooks/useData';
import { useFormat } from '../../../hooks/useFormat';
import { useNav } from '../../../navigation/hooks';
import { useTheme } from '../../../theme';
import { EXPENSE_CATEGORIES } from '../../../types/domain';
import { formatDate, monthKey, monthLabel, toDateStr } from '../../../utils/date';
import { labelize } from '../../../utils/format';

export default function ExpensesScreen() {
  const c = useTheme();
  const nav = useNav();
  const db = useDb();
  const { money } = useFormat();
  const [cat, setCat] = useState('all');
  const thisMonth = monthKey(toDateStr(new Date()));
  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => monthKey(toDateStr(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)))).map((k) => ({ label: monthLabel(k).split(' ')[0], value: db.expenses.filter((e) => monthKey(e.date) === k).reduce((t, e) => t + e.amount, 0) }));
  }, [db.expenses]);
  const cur = db.expenses.filter((e) => monthKey(e.date) === thisMonth);
  const total = cur.reduce((t, e) => t + e.amount, 0);
  const colors = chartColors(c);
  const segs = EXPENSE_CATEGORIES.map((k, i) => ({ label: k, value: cur.filter((e) => e.category === k).reduce((t, e) => t + e.amount, 0), color: colors[i] })).filter((s) => s.value > 0);
  const list = db.expenses.filter((e) => cat === 'all' || e.category === cat).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return (
    <Screen scroll bottomInset={70} header={<Header title="Expenses" subtitle="This month's spending" />}>
      <Card style={{ gap: 12 }}>
        <View><AppText v="caption" color="textMuted">Spent this month</AppText><CountUp value={total} format={(n) => money(n)} v="h1" /></View>
        {segs.length ? <DonutChart size={120} segments={segs} centerValue={String(segs.length)} centerLabel="categories" /> : <AppText color="textMuted">No expenses this month.</AppText>}
      </Card>
      <Card><BarChart data={monthly} format={(n) => money(n)} title="Monthly breakdown" color={c.warning} /></Card>
      <FilterChips pad={0} value={cat} onChange={setCat} options={[{ value: 'all', label: 'All' }, ...EXPENSE_CATEGORIES.map((k) => ({ value: k, label: k }))]} />
      <Card pad={4}>
        {list.length === 0 ? <EmptyState title="No expenses" message="Add fuel, salaries and other costs to track profit." actionLabel="Add expense" onAction={() => nav.navigate('ExpenseForm')} /> : list.map((e, i) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.warningSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="trending-down" size={16} color={c.warning} /></View>
            <View style={{ flex: 1 }} >
              <AppText v="bodyBold" onPress={() => nav.navigate('ExpenseForm', { id: e.id })}>{e.category}</AppText>
              <AppText v="caption" color="textMuted" numberOfLines={1}>{e.description || '—'} · {labelize(e.method)} · {formatDate(e.date)}</AppText>
            </View>
            <AppText v="h3">{money(e.amount)}</AppText>
          </View>
        ))}
      </Card>
      <Fab label="Add" onPress={() => nav.navigate('ExpenseForm')} />
    </Screen>
  );
}
