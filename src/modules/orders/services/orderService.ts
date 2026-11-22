import {
  Ctx, DbState, ID, Order, OrderItem, OrderStatus, PaymentMethod, Result, SettingsState,
} from '../../../types/domain';
import { fail, nextId, pushNotification } from '../../../services/common';
import { applyStockMove } from '../../inventory/services/inventoryService';
import {
  bottleBalance, customerBalance, depositedBottles, orderSubtotal,
} from '../../payments/services/ledger';
import { recordPayment } from '../../payments/services/paymentService';
import { round2 } from '../../../utils/format';

export interface OrderInput {
  customerId: ID;
  addressId: ID;
  items: { productId: ID; qty: number }[];
  deliveryDate: string;
  timeSlot: string;
  instructions: string;
  discount: number;
  deliveryCharge: number;
  staffId?: ID;
  subscriptionId?: ID;
  silent?: boolean;
  requestId?: string;
}

export const TIME_SLOTS = ['07:00 - 09:00', '09:00 - 11:00', '11:00 - 13:00', '13:00 - 15:00', '15:00 - 17:00', '17:00 - 19:00'];

export const defaultDeliveryCharge = (s: SettingsState, subtotal: number) =>
  s.delivery.freeAbove > 0 && subtotal >= s.delivery.freeAbove ? 0 : s.delivery.defaultCharge;

/** Pure price preview used by the order form and by createOrder. */
export function priceOrder(
  db: Pick<DbState, 'products' | 'bottleLedger'>,
  settings: SettingsState,
  customerId: ID,
  lines: { productId: ID; qty: number }[],
  discount: number,
  deliveryCharge: number,
) {
  const items: OrderItem[] = [];
  for (const l of lines) {
    const p = db.products.find((x) => x.id === l.productId);
    if (!p || l.qty <= 0) continue;
    items.push({
      productId: p.id, name: p.name, qty: l.qty, unitPrice: p.sellingPrice, unitCost: p.purchaseCost,
      unitDeposit: p.deposit, returnable: p.returnable,
    });
  }
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const tax = settings.tax.enabled ? round2((taxable * settings.tax.rate) / 100) : 0;
  let deposit = 0;
  if (settings.depositEnabled) {
    for (const i of items) {
      if (!i.returnable) continue;
      const held = bottleBalance(db.bottleLedger, customerId, i.productId);
      const dep = depositedBottles(db.bottleLedger, customerId, i.productId);
      deposit += Math.max(0, held + i.qty - dep) * i.unitDeposit;
    }
  }
  return { items, subtotal, tax, deposit, total: round2(taxable + deliveryCharge + tax + deposit) };
}

export function createOrder(db: DbState, ctx: Ctx, i: OrderInput): Result<{ id: ID; number: string }> {
  if (i.requestId) {
    const k = `order:req:${i.requestId}`;
    if (db.appliedKeys[k]) return fail('This order was already created');
    db.appliedKeys[k] = true;
  }
  const customer = db.customers.find((c) => c.id === i.customerId);
  if (!customer) return fail('Select a customer');
  if (!customer.active) return fail('This customer is inactive');
  if (!customer.addresses.some((a) => a.id === i.addressId)) return fail('Select a delivery address');
  if (!i.deliveryDate) return fail('Select a delivery date');
  const lines = i.items.filter((l) => l.qty > 0);
  if (lines.length === 0) return fail('Add at least one product');
  for (const l of lines) {
    if (!Number.isInteger(l.qty)) return fail('Quantities must be whole numbers');
    if (!db.products.find((p) => p.id === l.productId)) return fail('A selected product no longer exists');
  }
  if (i.discount < 0 || i.deliveryCharge < 0) return fail('Discount and delivery charge cannot be negative');
  const priced = priceOrder(db, ctx.settings, i.customerId, lines, i.discount, i.deliveryCharge);
  if (i.discount > priced.subtotal) return fail('Discount cannot exceed the order subtotal');
  const staff = i.staffId ? db.staff.find((s) => s.id === i.staffId) : undefined;
  if (i.staffId && (!staff || !staff.active)) return fail('Selected staff is not available');

  const id = nextId(db, 'o');
  const number = `BT-${1000 + ++db.counters.order}`;
  const status: OrderStatus = staff ? 'assigned' : 'pending';
  const order: Order = {
    id, number, customerId: i.customerId, addressId: i.addressId, items: priced.items,
    deliveryDate: i.deliveryDate, timeSlot: i.timeSlot, instructions: i.instructions,
    discount: i.discount, deliveryCharge: i.deliveryCharge, taxAmount: priced.tax, depositAmount: priced.deposit,
    status, staffId: staff?.id, createdAt: ctx.now,
    statusHistory: [{ status: 'pending', at: ctx.now }, ...(staff ? [{ status: 'assigned' as const, at: ctx.now, note: `Assigned to ${staff.name}` }] : [])],
    dispatchCycle: 0, dispatched: false, subscriptionId: i.subscriptionId,
  };
  db.orders.unshift(order);
  if (!i.silent) {
    pushNotification(db, ctx, {
      type: 'new_order', title: `New order ${number}`, body: `${customer.name} · ${lines.reduce((s, l) => s + l.qty, 0)} items`,
      refType: 'order', refId: id,
    });
    if (staff) {
      pushNotification(db, ctx, {
        type: 'delivery_assigned', title: 'Delivery assigned', body: `${number} assigned to ${staff.name}`, refType: 'order', refId: id,
      });
    }
  }
  return { ok: true, id, number };
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'assigned', 'cancelled'],
  confirmed: ['assigned', 'out_for_delivery', 'cancelled'],
  assigned: ['out_for_delivery', 'confirmed', 'cancelled'],
  out_for_delivery: ['failed', 'cancelled'],
  failed: ['pending', 'cancelled'],
  delivered: [],
  cancelled: [],
};
export const nextStatuses = (s: OrderStatus) => TRANSITIONS[s];
export const isOpen = (s: OrderStatus) => ['pending', 'confirmed', 'assigned', 'out_for_delivery'].includes(s);

function dispatchStock(db: DbState, ctx: Ctx, o: Order): Result {
  const cycle = o.dispatchCycle + 1;
  for (const it of o.items) {
    const r = applyStockMove(db, ctx, {
      productId: it.productId, type: 'dispatch', qty: it.qty, delta: { filled: -it.qty, withStaff: it.qty },
      refKey: `order:${o.id}:dispatch:${cycle}:${it.productId}`, orderId: o.id, staffId: o.staffId, note: `Loaded for ${o.number}`,
    });
    if (!r.ok) return r;
  }
  o.dispatchCycle = cycle;
  o.dispatched = true;
  return { ok: true };
}

function returnStock(db: DbState, ctx: Ctx, o: Order): Result {
  if (!o.dispatched) return { ok: true };
  for (const it of o.items) {
    const r = applyStockMove(db, ctx, {
      productId: it.productId, type: 'return_to_stock', qty: it.qty, delta: { withStaff: -it.qty, filled: it.qty },
      refKey: `order:${o.id}:return:${o.dispatchCycle}:${it.productId}`, orderId: o.id, staffId: o.staffId, note: `Returned from ${o.number}`,
    });
    if (!r.ok) return r;
  }
  o.dispatched = false;
  return { ok: true };
}

export interface StatusInput { orderId: ID; status: OrderStatus; staffId?: ID; reason?: string }

export function changeStatus(db: DbState, ctx: Ctx, i: StatusInput): Result {
  const o = db.orders.find((x) => x.id === i.orderId);
  if (!o) return fail('Order not found');
  if (i.status === 'delivered') return fail('Use the delivery form to complete an order');
  if (o.status === i.status && i.status !== 'assigned') return { ok: true };
  if (!TRANSITIONS[o.status].includes(i.status)) return fail(`Cannot move an order from ${o.status.replace(/_/g, ' ')} to ${i.status.replace(/_/g, ' ')}`);

  if (i.status === 'assigned') {
    const sid = i.staffId ?? o.staffId;
    const staff = db.staff.find((s) => s.id === sid);
    if (!staff || !staff.active) return fail('Select an active delivery staff');
    o.staffId = staff.id;
    pushNotification(db, ctx, {
      type: 'delivery_assigned', title: 'Delivery assigned', body: `${o.number} assigned to ${staff.name}`, refType: 'order', refId: o.id,
    });
    o.statusHistory.push({ status: 'assigned', at: ctx.now, note: `Assigned to ${staff.name}` });
    o.status = 'assigned';
    return { ok: true };
  }
  if (i.status === 'out_for_delivery') {
    if (!o.staffId) return fail('Assign a delivery staff before dispatching');
    const r = dispatchStock(db, ctx, o);
    if (!r.ok) return r;
  }
  if (i.status === 'cancelled' || i.status === 'failed') {
    const r = returnStock(db, ctx, o);
    if (!r.ok) return r;
    if (i.status === 'failed') {
      if (!i.reason?.trim()) return fail('Enter the reason for the failed delivery');
      o.failureReason = i.reason.trim();
      const c = db.customers.find((x) => x.id === o.customerId);
      pushNotification(db, ctx, {
        type: 'delivery_failed', title: 'Delivery failed', body: `${o.number} · ${c?.name ?? ''}: ${o.failureReason}`, refType: 'order', refId: o.id,
      });
    }
  }
  if (i.status === 'pending') o.staffId = undefined;
  o.status = i.status;
  o.statusHistory.push({ status: i.status, at: ctx.now, note: i.reason });
  return { ok: true };
}

export interface DeliverInput {
  orderId: ID;
  empties: Record<ID, number>;
  payment?: { amount: number; method: PaymentMethod };
  requestId?: string;
}

/** Completes a delivery: stock, bottle ledger and financial entries are each written exactly once. */
export function deliverOrder(db: DbState, ctx: Ctx, i: DeliverInput): Result {
  const o = db.orders.find((x) => x.id === i.orderId);
  if (!o) return fail('Order not found');
  if (o.status === 'delivered' || db.appliedKeys[`order:${o.id}:delivered`]) return fail('This order is already delivered');
  if (o.status === 'cancelled' || o.status === 'failed') return fail(`A ${o.status} order cannot be delivered`);
  const customer = db.customers.find((c) => c.id === o.customerId);
  if (!customer) return fail('Customer not found');

  if (!o.dispatched) {
    const r = dispatchStock(db, ctx, o);
    if (!r.ok) return r;
  }
  let deposit = 0;
  for (const it of o.items) {
    const held = bottleBalance(db.bottleLedger, o.customerId, it.productId);
    const empties = it.returnable ? Math.max(0, Math.floor(i.empties[it.productId] ?? 0)) : 0;
    if (empties > held) return fail(`${customer.name} only holds ${held} × ${it.name}; cannot collect ${empties}`);
    const dep = depositedBottles(db.bottleLedger, o.customerId, it.productId);
    const newHold = it.returnable ? held + it.qty - empties : 0;
    const depositQty = ctx.settings.depositEnabled && it.returnable ? Math.max(0, newHold - dep) : 0;
    deposit += depositQty * it.unitDeposit;

    const r = applyStockMove(db, ctx, {
      productId: it.productId, type: 'delivery', qty: it.qty,
      delta: it.returnable ? { withStaff: -it.qty, withCustomers: it.qty } : { withStaff: -it.qty },
      refKey: `order:${o.id}:deliver:${it.productId}`, orderId: o.id, customerId: o.customerId, staffId: o.staffId, note: `Delivered ${o.number}`,
    });
    if (!r.ok) return r;
    if (it.returnable) {
      db.bottleLedger.unshift({
        id: nextId(db, 'bl'), customerId: o.customerId, productId: it.productId, delta: it.qty, depositDelta: depositQty,
        orderId: o.id, note: `Delivered with ${o.number}`, at: ctx.now,
      });
    }
    if (empties > 0) {
      const r2 = applyStockMove(db, ctx, {
        productId: it.productId, type: 'collect_empty', qty: empties, delta: { withCustomers: -empties, empty: empties },
        refKey: `order:${o.id}:empties:${it.productId}`, orderId: o.id, customerId: o.customerId, staffId: o.staffId,
        note: `Empties collected on ${o.number}`,
      });
      if (!r2.ok) return r2;
      db.bottleLedger.unshift({
        id: nextId(db, 'bl'), customerId: o.customerId, productId: it.productId, delta: -empties, depositDelta: 0,
        orderId: o.id, note: `Empties collected on ${o.number}`, at: ctx.now,
      });
      o.emptiesCollected = { ...(o.emptiesCollected ?? {}), [it.productId]: empties };
    }
  }
  o.depositAmount = deposit;

  const push = (kind: 'product' | 'delivery' | 'tax' | 'deposit' | 'discount', amount: number, note: string) => {
    if (amount > 0) {
      db.financialEntries.unshift({ id: nextId(db, 'fe'), customerId: o.customerId, orderId: o.id, kind, amount, note, at: ctx.now });
    }
  };
  push('product', orderSubtotal(o), `Products · ${o.number}`);
  push('delivery', o.deliveryCharge, `Delivery charge · ${o.number}`);
  push('tax', o.taxAmount, `${ctx.settings.tax.label} · ${o.number}`);
  push('deposit', deposit, `Bottle deposit · ${o.number}`);
  push('discount', o.discount, `Discount · ${o.number}`);

  o.status = 'delivered';
  o.deliveredAt = ctx.now;
  o.statusHistory.push({ status: 'delivered', at: ctx.now });
  db.appliedKeys[`order:${o.id}:delivered`] = true;

  if (i.payment && i.payment.amount > 0) {
    const r = recordPayment(db, ctx, { customerId: o.customerId, amount: i.payment.amount, method: i.payment.method, orderId: o.id, note: `Collected on delivery · ${o.number}`, collectedBy: o.staffId });
    if (!r.ok) return r;
  }
  pushNotification(db, ctx, {
    type: 'delivery_completed', title: 'Delivery completed', body: `${o.number} delivered to ${customer.name}`, refType: 'order', refId: o.id,
  });
  const bal = customerBalance(db.financialEntries, o.customerId);
  if (bal > 0) {
    pushNotification(db, ctx, {
      type: 'pending_payment', title: 'Payment pending', body: `${customer.name} owes ${ctx.settings.currency.symbol}${bal}`,
      refType: 'customer', refId: customer.id, key: `pend:${o.id}`,
    });
  }
  return { ok: true };
}

/** Deposit the customer will be charged if `empties` are collected during delivery (UI preview). */
export function estimateDeposit(db: Pick<DbState, 'bottleLedger'>, settings: SettingsState, order: Order, empties: Record<ID, number>) {
  if (!settings.depositEnabled) return 0;
  let d = 0;
  for (const it of order.items) {
    if (!it.returnable) continue;
    const held = bottleBalance(db.bottleLedger, order.customerId, it.productId);
    const e = Math.min(held, Math.max(0, empties[it.productId] ?? 0));
    const dep = depositedBottles(db.bottleLedger, order.customerId, it.productId);
    d += Math.max(0, held + it.qty - e - dep) * it.unitDeposit;
  }
  return d;
}
