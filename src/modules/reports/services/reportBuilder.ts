import { DbState } from '../../../types/domain';
import { DateRange, bottleReturns, customerSales, dailySeries, deliveryPerformance, expenseByCategory, monthlySeries, productSales, profitAndLoss, revenueMap } from '../../dashboard/services/stats';
import { balancesByCustomer } from '../../payments/services/ledger';
import { FREQ_LABEL, displayStatus, subscriptionStats } from '../../subscriptions/services/subscriptionService';
import { getStock, totalBottles } from '../../inventory/services/inventoryService';
import { formatShortDate, monthLabel, weekdayShort, addDays, todayStr } from '../../../utils/date';

export type ReportKey = 'daily' | 'weekly' | 'monthly' | 'product' | 'customer' | 'delivery' | 'inventory' | 'returns' | 'outstanding' | 'subscriptions' | 'expenses' | 'pnl';
export const REPORTS: { value: ReportKey; label: string }[] = [
  { value: 'daily', label: 'Daily sales' }, { value: 'weekly', label: 'Weekly sales' }, { value: 'monthly', label: 'Monthly revenue' }, { value: 'product', label: 'Product-wise' },
  { value: 'customer', label: 'Customer-wise' }, { value: 'delivery', label: 'Delivery' }, { value: 'inventory', label: 'Inventory' }, { value: 'returns', label: 'Bottle returns' },
  { value: 'outstanding', label: 'Outstanding' }, { value: 'subscriptions', label: 'Subscriptions' }, { value: 'expenses', label: 'Expenses' }, { value: 'pnl', label: 'Profit & loss' },
];

export interface Report {
  head: string[];
  rows: (string | number)[][];
  series?: { label: string; value: number }[];
  chart?: 'bar' | 'area' | 'donut';
  segments?: { label: string; value: number }[];
  summary?: { label: string; value: string }[];
}

export function buildReport(key: ReportKey, db: DbState, r: DateRange, m: (n: number) => string): Report {
  const rev = revenueMap(db);
  const today = todayStr();
  switch (key) {
    case 'daily': {
      const from = r.from < addDays(today, -60) ? addDays(today, -60) : r.from;
      const d = dailySeries(rev, from, r.to > today ? today : r.to);
      return { head: ['Date', 'Net sales'], rows: d.map((x) => [x.date, m(x.value)]), series: d.map((x) => ({ label: formatShortDate(x.date), value: x.value })), chart: 'area', summary: [{ label: 'Total', value: m(d.reduce((t, x) => t + x.value, 0)) }] };
    }
    case 'weekly': {
      const d = dailySeries(rev, addDays(today, -6), today);
      return { head: ['Day', 'Net sales'], rows: d.map((x) => [`${weekdayShort(x.date)} ${formatShortDate(x.date)}`, m(x.value)]), series: d.map((x) => ({ label: weekdayShort(x.date), value: x.value })), chart: 'bar', summary: [{ label: 'Last 7 days', value: m(d.reduce((t, x) => t + x.value, 0)) }] };
    }
    case 'monthly': {
      const d = monthlySeries(rev, 6);
      return { head: ['Month', 'Net sales'], rows: d.map((x) => [monthLabel(x.key), m(x.value)]), series: d.map((x) => ({ label: monthLabel(x.key).split(' ')[0], value: x.value })), chart: 'bar', summary: [{ label: '6 months', value: m(d.reduce((t, x) => t + x.value, 0)) }] };
    }
    case 'product': {
      const d = productSales(db, r);
      return { head: ['Product', 'Qty', 'Revenue', 'Margin'], rows: d.map((x) => [x.name, x.qty, m(x.revenue), m(x.revenue - x.cost)]), chart: 'donut', segments: d.slice(0, 6).map((x) => ({ label: x.name, value: x.revenue })), summary: [{ label: 'Revenue', value: m(d.reduce((t, x) => t + x.revenue, 0)) }] };
    }
    case 'customer': {
      const d = customerSales(db, r);
      return { head: ['Customer', 'Orders', 'Sales'], rows: d.map((x) => [x.name, x.orders, m(x.revenue)]), chart: 'bar', series: d.slice(0, 6).map((x) => ({ label: x.name.split(' ')[0].slice(0, 7), value: x.revenue })), summary: [{ label: 'Customers', value: String(d.length) }] };
    }
    case 'delivery': {
      const d = deliveryPerformance(db, r);
      return { head: ['Staff', 'Assigned', 'Delivered', 'Failed', 'Success', 'Cash'], rows: d.map((x) => [x.staff.name, x.assigned, x.delivered, x.failed, `${Math.round(x.rate * 100)}%`, m(x.cash)]), chart: 'bar', series: d.map((x) => ({ label: x.staff.name.split(' ')[0], value: x.delivered })), summary: [{ label: 'Delivered', value: String(d.reduce((t, x) => t + x.delivered, 0)) }, { label: 'Failed', value: String(d.reduce((t, x) => t + x.failed, 0)) }] };
    }
    case 'inventory': {
      const rows = db.products.map((p) => { const s = getStock(db, p.id); return [p.name, s.filled, s.empty, s.withCustomers, s.withStaff, s.damaged, s.lost, totalBottles(s)]; });
      return { head: ['Product', 'Filled', 'Empty', 'Customers', 'Van', 'Damaged', 'Lost', 'Total'], rows, chart: 'bar', series: db.products.map((p) => ({ label: p.name.split(' ')[0].slice(0, 6), value: getStock(db, p.id).filled })), summary: [{ label: 'Total bottles', value: String(rows.reduce((t, x) => t + (x[7] as number), 0)) }] };
    }
    case 'returns': {
      const d = bottleReturns(db, r);
      return { head: ['Product', 'Delivered', 'Collected', 'Return rate'], rows: d.map((x) => [x.name, x.delivered, x.collected, `${Math.round(x.rate * 100)}%`]), chart: 'bar', series: d.map((x) => ({ label: x.name.split(' ')[0], value: Math.round(x.rate * 100) })), summary: [{ label: 'Collected', value: String(d.reduce((t, x) => t + x.collected, 0)) }] };
    }
    case 'outstanding': {
      const d = [...balancesByCustomer(db.financialEntries).entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      return { head: ['Customer', 'Outstanding'], rows: d.map(([id, v]) => [db.customers.find((c) => c.id === id)?.name ?? '', m(v)]), chart: 'bar', series: d.slice(0, 6).map(([id, v]) => ({ label: (db.customers.find((c) => c.id === id)?.name ?? '').split(' ')[0].slice(0, 7), value: v })), summary: [{ label: 'Total due', value: m(d.reduce((t, [, v]) => t + v, 0)) }] };
    }
    case 'subscriptions': {
      const rows = db.subscriptions.map((s) => { const st = subscriptionStats(db, s); return [db.customers.find((c) => c.id === s.customerId)?.name ?? '', FREQ_LABEL[s.frequency], displayStatus(s), st.remaining, m(st.totalAmount)]; });
      const counts = ['active', 'paused', 'upcoming', 'expired', 'cancelled'].map((k) => ({ label: k, value: db.subscriptions.filter((s) => displayStatus(s) === k).length }));
      return { head: ['Customer', 'Frequency', 'Status', 'Remaining', 'Value'], rows, chart: 'donut', segments: counts, summary: [{ label: 'Subscriptions', value: String(rows.length) }] };
    }
    case 'expenses': {
      const d = expenseByCategory(db, r);
      return { head: ['Category', 'Amount'], rows: d.map((x) => [x.category, m(x.value)]), chart: 'donut', segments: d.map((x) => ({ label: x.category, value: x.value })), summary: [{ label: 'Total', value: m(d.reduce((t, x) => t + x.value, 0)) }] };
    }
    case 'pnl': {
      const p = profitAndLoss(db, r);
      return { head: ['Line', 'Amount'], rows: [['Net sales (excl. deposits)', m(p.revenue)], ['Cost of goods sold', m(-p.cogs)], ['Gross profit', m(p.gross)], ['Expenses', m(-p.expenses)], ['Net profit', m(p.net)]], chart: 'bar', series: [{ label: 'Sales', value: p.revenue }, { label: 'COGS', value: p.cogs }, { label: 'Expenses', value: p.expenses }, { label: 'Profit', value: Math.max(0, p.net) }], summary: [{ label: 'Net profit', value: m(p.net) }] };
    }
  }
}
