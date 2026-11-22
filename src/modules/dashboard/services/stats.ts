import { DbState, ID } from '../../../types/domain';
import { REVENUE_SIGN, totalOutstanding, orderTotal } from '../../payments/services/ledger';
import { totalBottles, getStock } from '../../inventory/services/inventoryService';
import { addDays, inRange, isoToDateStr, monthKey, todayStr, parseDate, toDateStr } from '../../../utils/date';
import { round2 } from '../../../utils/format';
import { isOpen } from '../../orders/services/orderService';

export interface DateRange { from: string; to: string }
export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'all' | 'custom';

export const resolveRange = (key: RangeKey, custom?: string): DateRange => {
  const t = todayStr();
  switch (key) {
    case 'today': return { from: t, to: t };
    case 'yesterday': return { from: addDays(t, -1), to: addDays(t, -1) };
    case '7d': return { from: addDays(t, -6), to: t };
    case '30d': return { from: addDays(t, -29), to: t };
    case 'month': return { from: `${t.slice(0, 7)}-01`, to: t };
    case 'custom': return { from: custom ?? t, to: custom ?? t };
    default: return { from: '2000-01-01', to: '2999-12-31' };
  }
};
export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: 'yesterday', label: 'Yesterday' }, { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' }, { value: 'month', label: 'This month' }, { value: 'all', label: 'All time' }, { value: 'custom', label: 'Pick date' },
];

/** Net sales: product + delivery − discount. Deposits, tax and payments are deliberately excluded. */
export function revenueMap(db: Pick<DbState, 'financialEntries'>) {
  const m = new Map<string, number>();
  for (const e of db.financialEntries) {
    const s = REVENUE_SIGN[e.kind];
    if (!s) continue;
    const d = isoToDateStr(e.at);
    m.set(d, (m.get(d) ?? 0) + s * e.amount);
  }
  return m;
}
export const sumRevenue = (m: Map<string, number>, r: DateRange) => {
  let t = 0;
  for (const [d, v] of m) if (inRange(d, r.from, r.to)) t += v;
  return round2(t);
};
export const dailySeries = (m: Map<string, number>, from: string, to: string) => {
  const out: { date: string; value: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, value: round2(m.get(d) ?? 0) });
  return out;
};
export const monthlySeries = (m: Map<string, number>, months: number) => {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(monthKey(toDateStr(new Date(now.getFullYear(), now.getMonth() - i, 1))));
  const sums = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const [d, v] of m) { const k = monthKey(d); if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + v); }
  return keys.map((k) => ({ key: k, value: round2(sums.get(k) ?? 0) }));
};

export function dashboardStats(db: DbState, r: DateRange) {
  const rev = revenueMap(db);
  const inR = (d: string) => inRange(d, r.from, r.to);
  const orders = db.orders.filter((o) => inR(o.deliveryDate) && o.status !== 'cancelled');
  const delivered = db.orders.filter((o) => o.status === 'delivered' && o.deliveredAt && inR(isoToDateStr(o.deliveredAt)));
  const pending = db.orders.filter((o) => isOpen(o.status) && inR(o.deliveryDate));
  let total = 0, filled = 0, empty = 0, withCustomers = 0;
  for (const p of db.products) {
    const s = getStock(db, p.id);
    total += totalBottles(s); filled += s.filled; empty += s.empty; withCustomers += s.withCustomers;
  }
  return {
    orders: orders.length,
    revenue: sumRevenue(rev, r),
    completed: delivered.length,
    pending: pending.length,
    activeCustomers: db.customers.filter((c) => c.active).length,
    outstanding: totalOutstanding(db.financialEntries),
    totalBottles: total, filled, empty, withCustomers,
  };
}

export const lowStock = (db: DbState) =>
  db.products.filter((p) => p.active).map((p) => ({ product: p, stock: getStock(db, p.id) })).filter((x) => x.stock.filled <= x.product.lowStockThreshold)
    .sort((a, b) => a.stock.filled / (a.product.lowStockThreshold || 1) - b.stock.filled / (b.product.lowStockThreshold || 1));

export const upcomingDeliveries = (db: DbState, limit = 6) =>
  db.orders.filter((o) => isOpen(o.status) && o.deliveryDate >= todayStr())
    .sort((a, b) => (a.deliveryDate + a.timeSlot).localeCompare(b.deliveryDate + b.timeSlot)).slice(0, limit);

/* ---------- Reports ---------- */
export const deliveredIn = (db: DbState, r: DateRange) =>
  db.orders.filter((o) => o.status === 'delivered' && o.deliveredAt && inRange(isoToDateStr(o.deliveredAt), r.from, r.to));

export function productSales(db: DbState, r: DateRange) {
  const m = new Map<ID, { name: string; qty: number; revenue: number; cost: number }>();
  for (const o of deliveredIn(db, r)) for (const i of o.items) {
    const x = m.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0, cost: 0 };
    x.qty += i.qty; x.revenue += i.qty * i.unitPrice; x.cost += i.qty * i.unitCost;
    m.set(i.productId, x);
  }
  return [...m.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue);
}

export function customerSales(db: DbState, r: DateRange) {
  const m = new Map<ID, { orders: number; revenue: number }>();
  for (const o of deliveredIn(db, r)) {
    const x = m.get(o.customerId) ?? { orders: 0, revenue: 0 };
    x.orders += 1; x.revenue += o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) + o.deliveryCharge - o.discount;
    m.set(o.customerId, x);
  }
  return [...m.entries()].map(([id, v]) => ({ id, name: db.customers.find((c) => c.id === id)?.name ?? 'Unknown', ...v })).sort((a, b) => b.revenue - a.revenue);
}

export function deliveryPerformance(db: DbState, r: DateRange) {
  return db.staff.map((s) => {
    const mine = db.orders.filter((o) => o.staffId === s.id && inRange(o.deliveryDate, r.from, r.to));
    const delivered = mine.filter((o) => o.status === 'delivered').length;
    const failed = mine.filter((o) => o.status === 'failed').length;
    const cash = db.financialEntries.filter((e) => e.kind === 'payment' && e.collectedBy === s.id && inRange(isoToDateStr(e.at), r.from, r.to)).reduce((t, e) => t + e.amount, 0);
    const empties = db.inventoryTxns.filter((t) => t.type === 'collect_empty' && t.staffId === s.id && inRange(isoToDateStr(t.at), r.from, r.to)).reduce((t, x) => t + x.qty, 0);
    const attempted = delivered + failed;
    return { staff: s, assigned: mine.length, delivered, failed, rate: attempted ? delivered / attempted : 1, cash: round2(cash), empties };
  });
}

export function expenseByCategory(db: DbState, r: DateRange) {
  const m = new Map<string, number>();
  for (const e of db.expenses) if (inRange(e.date, r.from, r.to)) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value);
}

export function profitAndLoss(db: DbState, r: DateRange) {
  const revenue = sumRevenue(revenueMap(db), r);
  const sales = deliveredIn(db, r);
  const cogs = round2(sales.reduce((t, o) => t + o.items.reduce((s, i) => s + i.qty * i.unitCost, 0), 0));
  const expenses = round2(db.expenses.filter((e) => inRange(e.date, r.from, r.to)).reduce((t, e) => t + e.amount, 0));
  const gross = round2(revenue - cogs);
  return { revenue, cogs, gross, expenses, net: round2(gross - expenses) };
}

export function bottleReturns(db: DbState, r: DateRange) {
  const txns = db.inventoryTxns.filter((t) => t.type === 'collect_empty' && inRange(isoToDateStr(t.at), r.from, r.to));
  const m = new Map<ID, { collected: number; delivered: number }>();
  for (const t of txns) { const x = m.get(t.productId) ?? { collected: 0, delivered: 0 }; x.collected += t.qty; m.set(t.productId, x); }
  for (const o of deliveredIn(db, r)) for (const i of o.items) if (i.returnable) { const x = m.get(i.productId) ?? { collected: 0, delivered: 0 }; x.delivered += i.qty; m.set(i.productId, x); }
  return [...m.entries()].map(([id, v]) => ({ id, name: db.products.find((p) => p.id === id)?.name ?? '', ...v, rate: v.delivered ? Math.min(1, v.collected / v.delivered) : 0 })).sort((a, b) => b.delivered - a.delivered);
}

export const orderValue = orderTotal;
export const weekdayOf = (s: string) => parseDate(s).getDay();
