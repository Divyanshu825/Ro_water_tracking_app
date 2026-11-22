/* Run: npx tsx scripts/test-workflows.ts  — verifies core business rules against the domain engine. */
import { createNextState } from '@reduxjs/toolkit';
import { applyOp, Op } from '../src/services/engine';
import { emptyDb, buildSeed } from '../src/services/seed';
import { defaultSettings } from '../src/constants/settingsDefaults';
import { DbState, Ctx } from '../src/types/domain';
import { customerBalance, bottleBalance, depositHeld, totalOutstanding } from '../src/modules/payments/services/ledger';
import { getStock, totalBottles } from '../src/modules/inventory/services/inventoryService';
import { scheduleDates } from '../src/modules/subscriptions/services/subscriptionService';
import { todayStr, addDays } from '../src/utils/date';

let pass = 0, failed = 0;
const ok = (c: boolean, name: string) => { c ? pass++ : failed++; console.log(`${c ? '  ✓' : '  ✗ FAIL'} ${name}`); };
const settings = defaultSettings();
const ctx = (): Ctx => ({ now: new Date().toISOString(), settings });
const run = (db: DbState, op: Op) => applyOp(db, op, ctx()) as any;

function world() {
  const db = emptyDb();
  const p = run(db, { t: 'product.save', v: { name: '20L Jar', capacityMl: 20000, sellingPrice: 70, purchaseCost: 40, deposit: 250, returnable: true, lowStockThreshold: 10 } });
  const p2 = run(db, { t: 'product.save', v: { name: '1L Bottle', capacityMl: 1000, sellingPrice: 20, purchaseCost: 10, deposit: 0, returnable: false, lowStockThreshold: 10 } });
  const c = run(db, { t: 'customer.save', v: { name: 'Test Cust', phone: '9999999999', type: 'Home', notes: '', addresses: [{ label: 'Home', line: '1 Main', city: 'Pune', pincode: '411001' }] } });
  const s = run(db, { t: 'staff.save', v: { name: 'Raj', phone: '8888888888', vehicle: 'Ace' } });
  run(db, { t: 'inventory.entry', v: { productId: p.id, kind: 'new_stock', qty: 50 } });
  run(db, { t: 'inventory.entry', v: { productId: p2.id, kind: 'new_stock', qty: 100 } });
  const cust = db.customers[0];
  return { db, p: p.id, p2: p2.id, c: c.id, s: s.id, addr: cust.addresses[0].id };
}
const newOrder = (w: ReturnType<typeof world>, qty = 3, extra: any = {}) =>
  run(w.db, { t: 'order.create', v: { customerId: w.c, addressId: w.addr, items: [{ productId: w.p, qty }, { productId: w.p2, qty: 6 }], deliveryDate: todayStr(), timeSlot: '09:00 - 11:00', instructions: '', discount: 10, deliveryCharge: 20, ...extra } });

console.log('Orders & inventory');
{
  const w = world();
  const o = newOrder(w);
  ok(o.ok, 'create order');
  ok(getStock(w.db, w.p).filled === 50, 'creating an order does not move stock');
  ok(run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } }).ok === false, 'cannot dispatch without staff');
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: w.s } });
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } });
  ok(getStock(w.db, w.p).filled === 47 && getStock(w.db, w.p).withStaff === 3, 'dispatch moves filled -> with staff');
  const d1 = run(w.db, { t: 'order.deliver', v: { orderId: o.id, empties: {}, payment: { amount: 100, method: 'cash' } } });
  ok(d1.ok, 'deliver');
  const st = getStock(w.db, w.p);
  ok(st.withStaff === 0 && st.withCustomers === 3 && st.filled === 47, 'delivery moves with-staff -> with-customer');
  ok(bottleBalance(w.db.bottleLedger, w.c, w.p) === 3, 'customer bottle balance = 3');
  const snap = JSON.stringify(w.db.inventoryTxns.length) + JSON.stringify(w.db.financialEntries.length);
  const d2 = run(w.db, { t: 'order.deliver', v: { orderId: o.id, empties: {} } });
  ok(!d2.ok, 'second delivery rejected');
  ok(snap === JSON.stringify(w.db.inventoryTxns.length) + JSON.stringify(w.db.financialEntries.length), 'no duplicate ledger rows after double delivery');
  const prod = 3 * 70 + 6 * 20, deposit = 3 * 250;
  ok(customerBalance(w.db.financialEntries, w.c) === prod + 20 - 10 + deposit - 100, `balance = products+delivery-discount+deposit-payment (${customerBalance(w.db.financialEntries, w.c)})`);
  ok(depositHeld(w.db.financialEntries, w.c) === deposit, 'deposit held tracked separately');
  const rev = w.db.financialEntries.filter((e) => ['product', 'delivery'].includes(e.kind)).reduce((s, e) => s + e.amount, 0) - 10;
  ok(rev === prod + 20 - 10, 'revenue excludes deposit');
  ok(getStock(w.db, w.p2).filled === 94 && totalBottles(getStock(w.db, w.p2)) === 94, 'non-returnable bottles leave the system when sold');
}
console.log('Empties, deposit & refund');
{
  const w = world();
  const o1 = newOrder(w, 3); run(w.db, { t: 'order.status', v: { orderId: o1.id, status: 'assigned', staffId: w.s } });
  run(w.db, { t: 'order.deliver', v: { orderId: o1.id, empties: {} } });
  const o2 = newOrder(w, 3); run(w.db, { t: 'order.status', v: { orderId: o2.id, status: 'assigned', staffId: w.s } });
  const tooMany = run(w.db, { t: 'order.deliver', v: { orderId: o2.id, empties: { [w.p]: 9 } } });
  ok(!tooMany.ok, 'cannot collect more empties than customer holds');
  const before = depositHeld(w.db.financialEntries, w.c);
  const d = run(w.db, { t: 'order.deliver', v: { orderId: o2.id, empties: { [w.p]: 3 } } });
  ok(d.ok, 'exchange delivery ok');
  ok(depositHeld(w.db.financialEntries, w.c) === before, 'exchange (3 in, 3 out) charges no new deposit');
  ok(getStock(w.db, w.p).empty === 3 && getStock(w.db, w.p).withCustomers === 3, 'empties returned to stock');
  ok(!run(w.db, { t: 'payment.refund', v: { customerId: w.c, productId: w.p, qty: 1 } }).ok, 'cannot refund deposit for bottles still held');
  run(w.db, { t: 'inventory.entry', v: { productId: w.p, kind: 'collect_empty', customerId: w.c, qty: 3 } });
  const bal = customerBalance(w.db.financialEntries, w.c);
  const rf = run(w.db, { t: 'payment.refund', v: { customerId: w.c, productId: w.p, qty: 3 } });
  ok(rf.ok && rf.amount === 750, 'refund 3 returned bottles = 750');
  ok(customerBalance(w.db.financialEntries, w.c) === bal, 'refund does not change receivable');
  ok(depositHeld(w.db.financialEntries, w.c) === 0, 'deposit held back to 0');
}
console.log('Cancel / failed / negative stock');
{
  const w = world();
  const o = newOrder(w); run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: w.s } });
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } });
  ok(!run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'failed' } }).ok, 'failed requires a reason');
  ok(run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'failed', reason: 'Not home' } }).ok, 'mark failed');
  ok(getStock(w.db, w.p).filled === 50 && getStock(w.db, w.p).withStaff === 0, 'failed delivery returns stock');
  ok(w.db.financialEntries.length === 0, 'failed delivery creates no revenue');
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'pending' } });
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: w.s } });
  ok(run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } }).ok, 're-dispatch after reschedule works');
  ok(getStock(w.db, w.p).filled === 47, 're-dispatch deducts again exactly once');
  run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'cancelled' } });
  ok(getStock(w.db, w.p).filled === 50 && w.db.financialEntries.length === 0, 'cancel returns stock, no sale');
  const big = newOrder(w, 500); run(w.db, { t: 'order.status', v: { orderId: big.id, status: 'assigned', staffId: w.s } });
  ok(!run(w.db, { t: 'order.status', v: { orderId: big.id, status: 'out_for_delivery' } }).ok, 'negative stock blocked');
}
console.log('Payments');
{
  const w = world();
  const o = newOrder(w, 1); run(w.db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: w.s } });
  run(w.db, { t: 'order.deliver', v: { orderId: o.id, empties: {} } });
  const owed = customerBalance(w.db.financialEntries, w.c);
  run(w.db, { t: 'payment.record', v: { customerId: w.c, amount: 100, method: 'upi', requestId: 'a' } });
  ok(customerBalance(w.db.financialEntries, w.c) === owed - 100, 'partial payment reduces balance');
  ok(!run(w.db, { t: 'payment.record', v: { customerId: w.c, amount: 100, method: 'upi', requestId: 'a' } }).ok, 'duplicate request id rejected');
  const adv = run(w.db, { t: 'payment.record', v: { customerId: w.c, amount: owed + 500, method: 'cash' } });
  ok(adv.advance && customerBalance(w.db.financialEntries, w.c) < 0, 'advance payment creates credit balance');
  ok(totalOutstanding(w.db.financialEntries) === 0, 'credit balances are not counted as outstanding');
}
console.log('Subscriptions');
{
  const w = world();
  const sub = run(w.db, { t: 'sub.save', v: { customerId: w.c, addressId: w.addr, items: [{ productId: w.p, qty: 2 }], frequency: 'alternate', intervalDays: 1, startDate: todayStr(), endDate: addDays(todayStr(), 8), timeSlot: '09:00 - 11:00' } });
  ok(scheduleDates(w.db.subscriptions[0]).length === 5, 'alternate-day schedule = 5 dates over 9 days');
  const g1 = run(w.db, { t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 4) });
  const g2 = run(w.db, { t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 4) });
  ok(g1.created === 3 && g2.created === 0, 'generation is idempotent (3 then 0)');
  ok(w.db.orders.length === 3, 'exactly 3 orders exist');
  run(w.db, { t: 'sub.status', id: sub.id, status: 'paused' });
  ok(run(w.db, { t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 8) }).created === 0, 'paused subscription generates nothing');
  run(w.db, { t: 'sub.status', id: sub.id, status: 'active' });
  ok(run(w.db, { t: 'sub.generate', from: todayStr(), to: addDays(todayStr(), 8) }).created === 2, 'resume generates only missing dates');
}
console.log('Dry-run determinism (store thunk pattern)');
{
  const w = world();
  const op: Op = { t: 'order.create', v: { customerId: w.c, addressId: w.addr, items: [{ productId: w.p, qty: 1 }], deliveryDate: todayStr(), timeSlot: 'x', instructions: '', discount: 0, deliveryCharge: 0 } };
  let dry: any;
  createNextState(w.db, (d) => { dry = applyOp(d as DbState, op, ctx()); });
  const real = applyOp(w.db, op, ctx()) as any;
  ok(dry.id === real.id && dry.number === real.number, 'dry-run and real run produce identical ids');
}
console.log('Seed data');
{
  const db = buildSeed();
  let bad = 0;
  for (const s of Object.values(db.stock)) for (const v of Object.values(s)) if (typeof v === 'number' && v < 0) bad++;
  ok(bad === 0, 'no negative stock in seed');
  const delivered = db.orders.filter((o) => o.status === 'delivered').length;
  ok(delivered > 100, `seed has ${delivered} delivered orders`);
  const ids = db.orders.filter((o) => o.status === 'delivered').map((o) => o.id);
  ok(db.financialEntries.filter((e) => e.kind === 'product').length === ids.length, 'one product revenue entry per delivered order');
}
console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
