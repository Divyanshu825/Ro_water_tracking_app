import { Ctx, CustomerType, DbState, ID, PaymentMethod, SettingsState } from '../types/domain';
import { applyOp } from './engine';
import { defaultSettings } from '../constants/settingsDefaults';
import { addDays, dateAtHour, todayStr } from '../utils/date';
import { customerBalance, bottleBalance } from '../modules/payments/services/ledger';
import { getStock } from '../modules/inventory/services/inventoryService';
import { TIME_SLOTS } from '../modules/orders/services/orderService';

export const emptyDb = (): DbState => ({
  customers: [], products: [], staff: [], orders: [], stock: {}, inventoryTxns: [], financialEntries: [],
  bottleLedger: [], subscriptions: [], expenses: [], notifications: [],
  counters: { seq: 0, order: 0, receipt: 0 }, appliedKeys: {},
});

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS = [
  { name: '250ml Bottle', capacityMl: 250, sellingPrice: 6, purchaseCost: 3.5, deposit: 0, returnable: false, lowStockThreshold: 150, f: 900 },
  { name: '500ml Bottle', capacityMl: 500, sellingPrice: 10, purchaseCost: 6, deposit: 0, returnable: false, lowStockThreshold: 150, f: 1200 },
  { name: '1L Bottle', capacityMl: 1000, sellingPrice: 18, purchaseCost: 11, deposit: 0, returnable: false, lowStockThreshold: 120, f: 800 },
  { name: '2L Bottle', capacityMl: 2000, sellingPrice: 32, purchaseCost: 20, deposit: 0, returnable: false, lowStockThreshold: 80, f: 400 },
  { name: '5L Can', capacityMl: 5000, sellingPrice: 55, purchaseCost: 34, deposit: 80, returnable: true, lowStockThreshold: 40, f: 140 },
  { name: '10L Can', capacityMl: 10000, sellingPrice: 85, purchaseCost: 52, deposit: 150, returnable: true, lowStockThreshold: 30, f: 90 },
  { name: '20L Jar', capacityMl: 20000, sellingPrice: 70, purchaseCost: 38, deposit: 250, returnable: true, lowStockThreshold: 60, f: 220 },
  { name: '25L Jar', capacityMl: 25000, sellingPrice: 90, purchaseCost: 50, deposit: 300, returnable: true, lowStockThreshold: 25, f: 70 },
  { name: 'Alkaline 1L (Custom)', capacityMl: 1000, sellingPrice: 35, purchaseCost: 22, deposit: 0, returnable: false, lowStockThreshold: 60, f: 200 },
];

/** Standard catalogue every new business starts with (same sizes the demo data uses; owners can edit or add more). */
export const DEFAULT_PRODUCTS = PRODUCTS.filter((p) => !p.name.includes('(Custom)')).map(({ f: _f, ...p }) => p);

/** Empty workspace pre-loaded with the default product catalogue. Only called once, when an account is created. */
export function freshWorkspaceDb(): DbState {
  const db = emptyDb();
  const ctx: Ctx = { now: new Date().toISOString(), settings: defaultSettings() };
  DEFAULT_PRODUCTS.forEach((p) => applyOp(db, { t: 'product.save', v: { ...p, active: true } as never }, ctx));
  return db;
}

const CUSTOMERS: { name: string; phone: string; type: CustomerType; area: string; pin: string; notes: string }[] = [
  { name: 'Rohan Deshmukh', phone: '9822011101', type: 'Home', area: 'Baner Road', pin: '411045', notes: 'Call before arriving. Dog at the gate.' },
  { name: 'Priya Kulkarni', phone: '9822011102', type: 'Home', area: 'Kothrud', pin: '411038', notes: '' },
  { name: 'Infosoft Technologies', phone: '9822011103', type: 'Corporate', area: 'Hinjewadi Phase 1', pin: '411057', notes: 'Deliver to reception, 3rd floor pantry.' },
  { name: 'Hotel Sai Palace', phone: '9822011104', type: 'Hotel', area: 'Shivajinagar', pin: '411005', notes: 'Bulk orders on weekends.' },
  { name: 'Spice Garden Restaurant', phone: '9822011105', type: 'Restaurant', area: 'FC Road', pin: '411004', notes: 'Back entrance only.' },
  { name: 'Amit Joshi', phone: '9822011106', type: 'Home', area: 'Aundh', pin: '411007', notes: '' },
  { name: 'Sharma General Store', phone: '9822011107', type: 'Shop', area: 'Karve Nagar', pin: '411052', notes: 'Pays on weekly basis.' },
  { name: 'Neha Patil', phone: '9822011108', type: 'Home', area: 'Wakad', pin: '411057', notes: '' },
  { name: 'Orbit Consulting', phone: '9822011109', type: 'Office', area: 'Viman Nagar', pin: '411014', notes: '' },
  { name: 'Cafe Brewtale', phone: '9822011110', type: 'Restaurant', area: 'Koregaon Park', pin: '411001', notes: 'Prefers morning slots.' },
  { name: 'Vikram Singh', phone: '9822011111', type: 'Home', area: 'Pashan', pin: '411021', notes: '' },
  { name: 'GreenLeaf Pharma', phone: '9822011112', type: 'Corporate', area: 'Hadapsar', pin: '411028', notes: 'Invoice needed every delivery.' },
  { name: 'Sunita Bhosale', phone: '9822011113', type: 'Home', area: 'Bavdhan', pin: '411021', notes: '' },
  { name: 'Royal Banquet Hall', phone: '9822011114', type: 'Hotel', area: 'Kondhwa', pin: '411048', notes: 'Event based, advance booking.' },
];

const STAFF = [
  { name: 'Ramesh Yadav', phone: '9890011101', vehicle: 'MH12 AB 4521 · Tata Ace' },
  { name: 'Suresh Pawar', phone: '9890011102', vehicle: 'MH12 CD 7788 · Mahindra Jeeto' },
  { name: 'Imran Shaikh', phone: '9890011103', vehicle: 'MH14 EF 1090 · E-Rickshaw' },
  { name: 'Ganesh More', phone: '9890011104', vehicle: 'MH12 GH 3345 · Tata Ace' },
];

export const SEED_DAYS = 62;

export function buildSeed(settingsOverride?: SettingsState): DbState {
  const db = emptyDb();
  const settings = settingsOverride ?? defaultSettings();
  const R = rng(20260611);
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const today = todayStr();
  const mk = (day: string, h = 8, m = 0): Ctx => ({ now: dateAtHour(day, h, m), settings });
  const start = addDays(today, -SEED_DAYS);

  for (const p of PRODUCTS) {
    const { f, ...rest } = p;
    const r = applyOp(db, { t: 'product.save', v: rest }, mk(start)) as { ok: true; id: ID };
    const total = f + Math.round(f * 0.45);
    db.stock[r.id] = { productId: r.id, filled: f, empty: Math.round(f * 0.45), withCustomers: 0, withStaff: 0, damaged: 0, lost: 0 };
    db.inventoryTxns.unshift({ id: `it_open_${r.id}`, productId: r.id, type: 'opening', qty: total, delta: { filled: f, empty: Math.round(f * 0.45) }, note: 'Opening stock', at: mk(start).now });
  }
  const pid = (name: string) => db.products.find((p) => p.name === name)!.id;
  const returnableIds = db.products.filter((p) => p.returnable).map((p) => p.id);
  const fiveL = pid('5L Can');

  for (const c of CUSTOMERS) {
    const addr = [{ label: 'Primary', line: `${Math.floor(R() * 90 + 10)}, ${c.area}`, city: 'Pune', pincode: c.pin }];
    if (c.type === 'Corporate' || c.type === 'Hotel') addr.push({ label: 'Branch', line: `Plot ${Math.floor(R() * 40 + 1)}, ${pick(['Magarpatta', 'Kharadi', 'Baner'])}`, city: 'Pune', pincode: '411014' });
    applyOp(db, { t: 'customer.save', v: { name: c.name, phone: c.phone, type: c.type, notes: c.notes, addresses: addr } }, mk(start));
  }
  for (const s of STAFF) applyOp(db, { t: 'staff.save', v: s }, mk(start));
  const customers = db.customers.slice().reverse();
  const cust = (n: string) => db.customers.find((c) => c.name === n)!;

  // recurring customers
  const subs = [
    { c: 'Infosoft Technologies', items: [{ productId: pid('20L Jar'), qty: 6 }], frequency: 'daily' as const, offset: -40, span: 130, slot: TIME_SLOTS[1] },
    { c: 'Orbit Consulting', items: [{ productId: pid('20L Jar'), qty: 3 }], frequency: 'alternate' as const, offset: -30, span: 90, slot: TIME_SLOTS[2] },
    { c: 'Cafe Brewtale', items: [{ productId: pid('1L Bottle'), qty: 24 }, { productId: pid('20L Jar'), qty: 2 }], frequency: 'weekly' as const, offset: -28, span: 120, slot: TIME_SLOTS[0] },
    { c: 'Rohan Deshmukh', items: [{ productId: pid('20L Jar'), qty: 2 }], frequency: 'custom' as const, offset: -60, span: 62, slot: TIME_SLOTS[3] },
    { c: 'Sunita Bhosale', items: [{ productId: pid('10L Can'), qty: 2 }], frequency: 'monthly' as const, offset: -10, span: 180, slot: TIME_SLOTS[4] },
  ];
  for (const s of subs) {
    const c = cust(s.c);
    applyOp(db, { t: 'sub.save', v: { customerId: c.id, addressId: c.addresses[0].id, items: s.items, frequency: s.frequency, intervalDays: 4, startDate: addDays(today, s.offset), endDate: addDays(today, s.offset + s.span), timeSlot: s.slot } }, mk(start));
  }
  // one paused and one upcoming/expiring variants
  applyOp(db, { t: 'sub.status', id: db.subscriptions.find((x) => x.frequency === 'custom')!.id, status: 'paused' }, mk(start));
  const g = cust('Hotel Sai Palace');
  applyOp(db, { t: 'sub.save', v: { customerId: g.id, addressId: g.addresses[0].id, items: [{ productId: pid('20L Jar'), qty: 8 }], frequency: 'daily', intervalDays: 1, startDate: addDays(today, 5), endDate: addDays(today, 35), timeSlot: TIME_SLOTS[0] } }, mk(start));
  const ex = cust('GreenLeaf Pharma');
  applyOp(db, { t: 'sub.save', v: { customerId: ex.id, addressId: ex.addresses[0].id, items: [{ productId: pid('500ml Bottle'), qty: 48 }], frequency: 'weekly', intervalDays: 1, startDate: addDays(today, -50), endDate: addDays(today, 2), timeSlot: TIME_SLOTS[1] } }, mk(start));
  // reset generated for the seeded subs (they started "in the past" but weren't tracked); the loop below generates per-day
  const typeBasket = (t: CustomerType) => {
    switch (t) {
      case 'Home': return [{ productId: pid('20L Jar'), qty: 1 + Math.floor(R() * 2) }, ...(R() < 0.25 ? [{ productId: pid('2L Bottle'), qty: 6 }] : [])];
      case 'Office': case 'Corporate': return [{ productId: pid('20L Jar'), qty: 3 + Math.floor(R() * 4) }, ...(R() < 0.4 ? [{ productId: pid('500ml Bottle'), qty: 24 }] : [])];
      case 'Hotel': return [{ productId: pid('20L Jar'), qty: 5 + Math.floor(R() * 6) }, { productId: pid('1L Bottle'), qty: 24 }];
      case 'Restaurant': return [{ productId: pid(R() < 0.5 ? '10L Can' : '20L Jar'), qty: 2 + Math.floor(R() * 3) }, ...(R() < 0.5 ? [{ productId: pid('1L Bottle'), qty: 12 }] : [])];
      default: return [{ productId: pid(R() < 0.5 ? '5L Can' : '10L Can'), qty: 2 + Math.floor(R() * 3) }, { productId: pid('250ml Bottle'), qty: 24 }];
    }
  };
  const methods: PaymentMethod[] = ['cash', 'upi', 'upi', 'online', 'bank_transfer'];

  const resolve = (orderId: ID, day: string, k: number, idx: number, final: boolean) => {
    const o = db.orders.find((x) => x.id === orderId)!;
    const h = 8 + Math.min(9, idx);
    const c0 = mk(day, h, 5);
    const staff = db.staff[idx % db.staff.length];
    const roll = R();
    if (roll < 0.04) { applyOp(db, { t: 'order.status', v: { orderId, status: 'cancelled', reason: 'Customer cancelled' } }, c0); return; }
    applyOp(db, { t: 'order.status', v: { orderId, status: 'assigned', staffId: staff.id } }, mk(day, h, 10));
    if (!final && o.deliveryDate > day) return;
    applyOp(db, { t: 'order.status', v: { orderId, status: 'out_for_delivery' } }, mk(day, h + 1, 0));
    if (final && roll > 0.9) return; // still out for delivery today
    if (roll < 0.09) { applyOp(db, { t: 'order.status', v: { orderId, status: 'failed', reason: pick(['Customer not available', 'Wrong address', 'Premises locked']) } }, mk(day, h + 2, 0)); return; }
    const empties: Record<ID, number> = {};
    for (const it of o.items) if (it.returnable) {
      const held = bottleBalance(db.bottleLedger, o.customerId, it.productId);
      empties[it.productId] = Math.min(held, R() < 0.85 ? it.qty : Math.floor(it.qty / 2));
    }
    const prod = o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) + o.deliveryCharge;
    const pr = R();
    const amount = pr < 0.62 ? prod + o.depositAmount : pr < 0.8 ? Math.round((prod * 0.5) / 10) * 10 : 0;
    applyOp(db, { t: 'order.deliver', v: { orderId, empties, payment: amount > 0 ? { amount, method: pick(methods) } : undefined } }, mk(day, h + 2, 30));
    void k;
  };

  for (let k = SEED_DAYS; k >= 0; k--) {
    const day = addDays(today, -k);
    const c0 = mk(day, 7, 0);
    // replenishment: refill empties, then new filled stock
    for (const p of db.products) {
      if (p.id === fiveL && k < 5) continue; // let 5L run low for a realistic alert
      const st = getStock(db, p.id);
      const target = p.lowStockThreshold * 4;
      if (st.filled < target) {
        const refill = Math.min(st.empty, target - st.filled);
        if (refill > 0) applyOp(db, { t: 'inventory.entry', v: { productId: p.id, kind: 'refill', qty: refill, note: 'Plant refill' } }, c0);
        const left = target - st.filled - refill;
        if (left > 0) applyOp(db, { t: 'inventory.entry', v: { productId: p.id, kind: 'new_stock', qty: left, note: 'Production batch' } }, c0);
      }
    }
    applyOp(db, { t: 'sub.generate', from: day, to: day }, c0);
    const n = k === 0 ? 5 : 2 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const c = pick(customers.filter((x) => x.active));
      const r = applyOp(db, { t: 'order.create', v: { customerId: c.id, addressId: pick(c.addresses).id, items: typeBasket(c.type), deliveryDate: day, timeSlot: pick(TIME_SLOTS), instructions: '', discount: R() < 0.1 ? 10 : 0, deliveryCharge: 20 } }, mk(day, 6, i));
      void r;
    }
    const todays = db.orders.filter((o) => o.deliveryDate === day && o.status === 'pending').reverse();
    todays.forEach((o, i) => {
      if (k === 0 && i === todays.length - 3) {
        applyOp(db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: db.staff[1].id } }, mk(day, 9));
        applyOp(db, { t: 'order.status', v: { orderId: o.id, status: 'out_for_delivery' } }, mk(day, 9, 30));
        return;
      }
      if (k === 0 && i >= todays.length - 2) {
        // leave the last two for today still open
        if (i === todays.length - 1) { applyOp(db, { t: 'order.status', v: { orderId: o.id, status: 'confirmed' } }, mk(day, 9)); return; }
        applyOp(db, { t: 'order.status', v: { orderId: o.id, status: 'assigned', staffId: db.staff[i % 3].id } }, mk(day, 9));
        return;
      }
      resolve(o.id, day, k, i, k === 0);
    });
    // collections from customers who owe
    for (const c of db.customers) {
      const bal = customerBalance(db.financialEntries, c.id);
      if (bal > 150 && R() < 0.12) {
        const amount = R() < 0.6 ? bal : Math.round(bal / 2 / 10) * 10;
        applyOp(db, { t: 'payment.record', v: { customerId: c.id, amount, method: pick(methods), note: 'Account settlement' } }, mk(day, 17, 0));
      }
    }
    const d = new Date(`${day}T00:00:00`);
    const exp = (category: 'Fuel' | 'Staff Salary' | 'Electricity' | 'Vehicle Maintenance' | 'Other', amount: number, description: string) =>
      applyOp(db, { t: 'expense.save', v: { category, amount, date: day, method: pick(methods), description } }, mk(day, 19, 0));
    if (k % 2 === 0) exp('Fuel', 300 + Math.floor(R() * 5) * 50, 'Diesel for delivery vehicles');
    if (d.getDate() === 1) { for (const s of db.staff) exp('Staff Salary', 6500, `Salary · ${s.name}`); }
    if (d.getDate() === 5) exp('Electricity', 3800 + Math.floor(R() * 8) * 100, 'Plant electricity bill');
    if (d.getDate() === 12) exp('Vehicle Maintenance', 1800 + Math.floor(R() * 10) * 100, 'Service & tyre check');
    if (k === 3) exp('Other', 650, 'Bottle caps and seals');
  }

  // tomorrow's orders + scheduled subscription orders
  applyOp(db, { t: 'sub.generate', from: today, to: addDays(today, 1) }, mk(today, 9));
  for (let i = 0; i < 3; i++) {
    const c = customers[i * 3 + 1];
    applyOp(db, { t: 'order.create', v: { customerId: c.id, addressId: c.addresses[0].id, items: typeBasket(c.type), deliveryDate: addDays(today, 1), timeSlot: TIME_SLOTS[i], instructions: 'Please ring the bell', discount: 0, deliveryCharge: 20 } }, mk(today, 10, i));
  }
  const entry = (name: string, kind: 'adjust' | 'damaged' | 'lost', qty: number, field: 'filled' | 'empty', note: string, direction?: 1 | -1) =>
    applyOp(db, { t: 'inventory.entry', v: { productId: pid(name), kind, qty, field, direction, note } }, mk(addDays(today, -1), 18));
  entry('20L Jar', 'damaged', 6, 'empty', 'Cracked during washing');
  entry('5L Can', 'damaged', 2, 'filled', 'Leaking caps');
  entry('20L Jar', 'lost', 3, 'empty', 'Missing after plant audit');
  const f5 = getStock(db, fiveL).filled;
  entry('5L Can', 'adjust', f5 - 34, 'filled', 'Walk-in counter sales', -1);
  const f25 = getStock(db, pid('25L Jar')).filled;
  entry('25L Jar', 'adjust', f25 - 18, 'filled', 'Event supply (cash sale)', -1);
  // clear the demo run's notification noise: keep newest few unread
  db.notifications.forEach((n, i) => { n.read = i >= 8; });
  applyOp(db, { t: 'alerts.refresh' }, mk(today, 10));
  void returnableIds;
  return db;
}
