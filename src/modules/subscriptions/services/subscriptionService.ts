import { Ctx, DbState, Frequency, ID, Result, Subscription } from '../../../types/domain';
import { fail, nextId, pushNotification } from '../../../services/common';
import { addDays, addMonths, diffDays, todayStr } from '../../../utils/date';
import { createOrder } from '../../orders/services/orderService';

export interface SubscriptionInput {
  id?: ID;
  customerId: ID;
  addressId: ID;
  items: { productId: ID; qty: number }[];
  frequency: Frequency;
  intervalDays: number;
  startDate: string;
  endDate: string;
  timeSlot: string;
}

export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Daily', alternate: 'Alternate Day', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom',
};

export function scheduleDates(s: Pick<Subscription, 'frequency' | 'intervalDays' | 'startDate' | 'endDate'>): string[] {
  const out: string[] = [];
  let d = s.startDate;
  let n = 0;
  while (d <= s.endDate && out.length < 800) {
    out.push(d);
    n++;
    switch (s.frequency) {
      case 'daily': d = addDays(s.startDate, n); break;
      case 'alternate': d = addDays(s.startDate, n * 2); break;
      case 'weekly': d = addDays(s.startDate, n * 7); break;
      case 'monthly': d = addMonths(s.startDate, n); break;
      default: d = addDays(s.startDate, n * Math.max(1, s.intervalDays));
    }
  }
  return out;
}

export type SubDisplayStatus = 'active' | 'paused' | 'expired' | 'upcoming' | 'cancelled';
export function displayStatus(s: Subscription, today = todayStr()): SubDisplayStatus {
  if (s.status === 'cancelled') return 'cancelled';
  if (s.status === 'paused') return 'paused';
  if (s.endDate < today) return 'expired';
  if (s.startDate > today) return 'upcoming';
  return 'active';
}

export function subscriptionStats(db: Pick<DbState, 'orders' | 'products'>, s: Subscription, today = todayStr()) {
  const dates = scheduleDates(s);
  const perDelivery = s.items.reduce((sum, i) => sum + i.qty * (db.products.find((p) => p.id === i.productId)?.sellingPrice ?? 0), 0);
  const delivered = dates.filter((d) => {
    const oid = s.generated[d];
    return oid && db.orders.find((o) => o.id === oid)?.status === 'delivered';
  }).length;
  const remaining = dates.filter((d) => {
    if (d < today) return false;
    const oid = s.generated[d];
    const st = oid ? db.orders.find((o) => o.id === oid)?.status : undefined;
    return st !== 'delivered' && st !== 'cancelled';
  }).length;
  return { dates, total: dates.length, perDelivery, totalAmount: perDelivery * dates.length, delivered, remaining };
}

export function saveSubscription(db: DbState, ctx: Ctx, i: SubscriptionInput): Result<{ id: ID }> {
  const customer = db.customers.find((c) => c.id === i.customerId);
  if (!customer) return fail('Select a customer');
  if (!customer.addresses.some((a) => a.id === i.addressId)) return fail('Select a delivery address');
  const items = i.items.filter((x) => x.qty > 0);
  if (items.length === 0) return fail('Add at least one product');
  if (!i.startDate || !i.endDate) return fail('Select start and end dates');
  if (i.endDate < i.startDate) return fail('End date must be after the start date');
  if (i.frequency === 'custom' && !(i.intervalDays >= 1)) return fail('Enter the number of days between deliveries');
  if (i.id) {
    const s = db.subscriptions.find((x) => x.id === i.id);
    if (!s) return fail('Subscription not found');
    Object.assign(s, { ...i, items });
    return { ok: true, id: s.id };
  }
  const id = nextId(db, 'sub');
  db.subscriptions.unshift({ ...i, items, id, status: 'active', generated: {}, createdAt: ctx.now });
  return { ok: true, id };
}

export function setSubscriptionStatus(db: DbState, id: ID, status: 'active' | 'paused' | 'cancelled'): Result {
  const s = db.subscriptions.find((x) => x.id === id);
  if (!s) return fail('Subscription not found');
  if (s.status === 'cancelled') return fail('A cancelled subscription cannot be changed. Create a new one.');
  s.status = status;
  return { ok: true };
}

export function renewSubscription(db: DbState, id: ID): Result {
  const s = db.subscriptions.find((x) => x.id === id);
  if (!s) return fail('Subscription not found');
  const span = Math.max(1, diffDays(s.endDate, s.startDate) + 1);
  const base = s.endDate < todayStr() ? todayStr() : addDays(s.endDate, 1);
  if (s.endDate < todayStr()) s.startDate = base;
  s.endDate = addDays(base, span - 1);
  s.status = 'active';
  return { ok: true };
}

/**
 * Creates the orders for scheduled dates in [from, to]. Safe to call repeatedly:
 * every (subscription, date) maps to at most one order via `generated`.
 */
export function generateSubscriptionOrders(db: DbState, ctx: Ctx, from: string, to: string): Result<{ created: number }> {
  let created = 0;
  for (const s of db.subscriptions) {
    if (s.status !== 'active') continue;
    const customer = db.customers.find((c) => c.id === s.customerId);
    if (!customer?.active) continue;
    for (const d of scheduleDates(s)) {
      if (d < from || d > to || s.generated[d]) continue;
      const r = createOrder(db, ctx, {
        customerId: s.customerId, addressId: s.addressId, items: s.items, deliveryDate: d, timeSlot: s.timeSlot,
        instructions: 'Subscription delivery', discount: 0, deliveryCharge: 0, subscriptionId: s.id, silent: true,
      });
      if (r.ok) {
        s.generated[d] = r.id;
        created++;
      }
    }
  }
  if (created > 0) {
    pushNotification(db, ctx, {
      type: 'new_order', title: 'Subscription orders created', body: `${created} recurring order(s) generated`, key: `subgen:${from}:${to}:${created}`,
    });
  }
  return { ok: true, created };
}

export function refreshAlerts(db: DbState, ctx: Ctx, today: string) {
  for (const s of db.subscriptions) {
    if (s.status !== 'active') continue;
    const left = diffDays(s.endDate, today);
    if (left >= 0 && left <= 3) {
      const c = db.customers.find((x) => x.id === s.customerId);
      pushNotification(db, ctx, {
        type: 'subscription_expiry', title: 'Subscription expiring',
        body: `${c?.name ?? 'Customer'}'s subscription ends ${left === 0 ? 'today' : `in ${left} day(s)`}`,
        refType: 'subscription', refId: s.id, key: `subexp:${s.id}:${s.endDate}`,
      });
    }
  }
}
