import { BottleEntry, DbState, EntryKind, FinancialEntry, ID, Order } from '../../../types/domain';
import { round2 } from '../../../utils/format';

/** +1 increases what the customer owes, -1 reduces it, 0 doesn't touch the receivable. */
export const BALANCE_SIGN: Record<EntryKind, 1 | -1 | 0> = {
  product: 1, delivery: 1, tax: 1, deposit: 1, discount: -1, payment: -1, deposit_refund: 0,
};

export const REVENUE_SIGN: Partial<Record<EntryKind, 1 | -1>> = { product: 1, delivery: 1, discount: -1 };

export const entryBalance = (e: FinancialEntry) => BALANCE_SIGN[e.kind] * e.amount;

export const customerBalance = (entries: FinancialEntry[], customerId: ID) =>
  round2(entries.reduce((s, e) => (e.customerId === customerId ? s + entryBalance(e) : s), 0));

/** Map of customerId -> outstanding (positive = owes us, negative = advance credit). */
export function balancesByCustomer(entries: FinancialEntry[]) {
  const m = new Map<ID, number>();
  for (const e of entries) m.set(e.customerId, (m.get(e.customerId) ?? 0) + entryBalance(e));
  for (const [k, v] of m) m.set(k, round2(v));
  return m;
}

export const depositHeld = (entries: FinancialEntry[], customerId: ID) =>
  round2(entries.reduce((s, e) => {
    if (e.customerId !== customerId) return s;
    return e.kind === 'deposit' ? s + e.amount : e.kind === 'deposit_refund' ? s - e.amount : s;
  }, 0));

export const bottleBalance = (ledger: BottleEntry[], customerId: ID, productId?: ID) =>
  ledger.reduce((s, b) => (b.customerId === customerId && (!productId || b.productId === productId) ? s + b.delta : s), 0);

export const depositedBottles = (ledger: BottleEntry[], customerId: ID, productId: ID) =>
  ledger.reduce((s, b) => (b.customerId === customerId && b.productId === productId ? s + b.depositDelta : s), 0);

export const bottlesByCustomer = (ledger: BottleEntry[]) => {
  const m = new Map<ID, number>();
  for (const b of ledger) m.set(b.customerId, (m.get(b.customerId) ?? 0) + b.delta);
  return m;
};

export const orderSubtotal = (o: Order) => o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
export const orderTotal = (o: Order) =>
  round2(orderSubtotal(o) - o.discount + o.deliveryCharge + o.taxAmount + o.depositAmount);
export const orderPaid = (entries: FinancialEntry[], orderId: ID) =>
  round2(entries.reduce((s, e) => (e.orderId === orderId && e.kind === 'payment' ? s + e.amount : s), 0));
export const paymentStatus = (o: Order, paid: number): 'paid' | 'partial' | 'unpaid' => {
  const total = orderTotal(o);
  if (paid <= 0) return 'unpaid';
  return paid + 0.005 >= total ? 'paid' : 'partial';
};

export const totalOutstanding = (entries: FinancialEntry[]) => {
  let t = 0;
  for (const v of balancesByCustomer(entries).values()) if (v > 0) t += v;
  return round2(t);
};

export const dbOutstanding = (db: DbState, customerId: ID) => customerBalance(db.financialEntries, customerId);
