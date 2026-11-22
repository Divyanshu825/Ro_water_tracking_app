import { Ctx, DbState, ID, PaymentMethod, Result } from '../../../types/domain';
import { fail, nextId, pushNotification } from '../../../services/common';
import { bottleBalance, customerBalance, depositedBottles } from './ledger';

export interface PaymentInput {
  customerId: ID;
  amount: number;
  method: PaymentMethod;
  orderId?: ID;
  note?: string;
  collectedBy?: ID;
  requestId?: string;
}

export function recordPayment(db: DbState, ctx: Ctx, i: PaymentInput): Result<{ id: ID; receiptNo: string; advance: boolean }> {
  if (!(i.amount > 0)) return fail('Enter an amount greater than 0');
  const customer = db.customers.find((c) => c.id === i.customerId);
  if (!customer) return fail('Select a customer');
  if (!ctx.settings.paymentMethods[i.method]) return fail('This payment method is disabled in settings');
  if (i.requestId) {
    const k = `pay:${i.requestId}`;
    if (db.appliedKeys[k]) return fail('This payment was already recorded');
    db.appliedKeys[k] = true;
  }
  const before = customerBalance(db.financialEntries, i.customerId);
  const receiptNo = `RC-${1000 + ++db.counters.receipt}`;
  const id = nextId(db, 'fe');
  db.financialEntries.unshift({
    id, customerId: i.customerId, orderId: i.orderId, kind: 'payment', amount: i.amount, method: i.method,
    collectedBy: i.collectedBy, receiptNo, note: i.note ?? '', at: ctx.now,
  });
  pushNotification(db, ctx, {
    type: 'payment_received', title: 'Payment received',
    body: `${customer.name} paid ${ctx.settings.currency.symbol}${i.amount} via ${i.method.replace('_', ' ')}`,
    refType: 'customer', refId: customer.id,
  });
  return { ok: true, id, receiptNo, advance: i.amount > Math.max(before, 0) };
}

export interface DepositRefundInput { customerId: ID; productId: ID; qty: number; method?: PaymentMethod; requestId?: string }

/** Refund is only allowed for bottles that have been returned (deposit held > bottles still held). */
export const refundableBottles = (db: DbState, customerId: ID, productId: ID) =>
  Math.max(0, depositedBottles(db.bottleLedger, customerId, productId) - Math.max(0, bottleBalance(db.bottleLedger, customerId, productId)));

export function refundDeposit(db: DbState, ctx: Ctx, i: DepositRefundInput): Result<{ amount: number }> {
  const product = db.products.find((p) => p.id === i.productId);
  if (!product) return fail('Select a product');
  if (!Number.isInteger(i.qty) || i.qty <= 0) return fail('Enter a valid bottle count');
  if (i.requestId) {
    const k = `refund:${i.requestId}`;
    if (db.appliedKeys[k]) return fail('This refund was already recorded');
    db.appliedKeys[k] = true;
  }
  const max = refundableBottles(db, i.customerId, i.productId);
  if (i.qty > max) return fail(max === 0 ? 'No returned bottles with a deposit to refund' : `Only ${max} bottle deposit(s) can be refunded`);
  const amount = i.qty * product.deposit;
  db.bottleLedger.unshift({
    id: nextId(db, 'bl'), customerId: i.customerId, productId: i.productId, delta: 0, depositDelta: -i.qty,
    note: `Deposit refunded for ${i.qty} × ${product.name}`, at: ctx.now,
  });
  db.financialEntries.unshift({
    id: nextId(db, 'fe'), customerId: i.customerId, kind: 'deposit_refund', amount, method: i.method ?? 'cash',
    note: `Deposit refund · ${i.qty} × ${product.name}`, at: ctx.now,
  });
  return { ok: true, amount };
}
