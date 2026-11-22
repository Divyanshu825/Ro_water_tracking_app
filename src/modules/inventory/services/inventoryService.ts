import { Ctx, DbState, ID, InvTxnType, StockField, StockRecord, STOCK_FIELDS, Result } from '../../../types/domain';
import { fail, nextId, pushNotification } from '../../../services/common';
import { bottleBalance } from '../../payments/services/ledger';
import { saveExpenseInternal } from '../../expenses/services/expenseService';
import { todayStr, isoToDateStr } from '../../../utils/date';

export const emptyStock = (productId: ID): StockRecord => ({
  productId, filled: 0, empty: 0, withCustomers: 0, withStaff: 0, damaged: 0, lost: 0,
});
export const totalBottles = (r: StockRecord) => r.filled + r.empty + r.withCustomers + r.withStaff + r.damaged + r.lost;
export const getStock = (db: Pick<DbState, 'stock'>, productId: ID) => db.stock[productId] ?? emptyStock(productId);

export interface StockMove {
  productId: ID;
  type: InvTxnType;
  delta: Partial<Record<StockField, number>>;
  qty: number;
  note?: string;
  refKey?: string;
  orderId?: ID;
  customerId?: ID;
  staffId?: ID;
}

const LABEL: Record<StockField, string> = {
  filled: 'filled', empty: 'empty', withCustomers: 'with-customer', withStaff: 'with-staff', damaged: 'damaged', lost: 'lost',
};

/**
 * The single place where stock changes. Atomic (validates before mutating) and idempotent
 * per refKey, and always writes a transaction ledger row.
 */
export function applyStockMove(db: DbState, ctx: Ctx, m: StockMove): Result<{ duplicate?: boolean }> {
  if (m.refKey) {
    if (db.appliedKeys[`inv:${m.refKey}`]) return { ok: true, duplicate: true };
  }
  const product = db.products.find((p) => p.id === m.productId);
  if (!product) return fail('Product not found');
  const cur = getStock(db, m.productId);
  const next: StockRecord = { ...cur };
  for (const f of STOCK_FIELDS) next[f] = cur[f] + (m.delta[f] ?? 0);
  if (!ctx.settings.allowNegativeStock) {
    for (const f of STOCK_FIELDS) {
      if (next[f] < 0) {
        return fail(`Not enough ${LABEL[f]} stock for ${product.name} (have ${cur[f]}, need ${cur[f] - next[f]})`);
      }
    }
  }
  db.stock[m.productId] = next;
  db.inventoryTxns.unshift({
    id: nextId(db, 'it'), productId: m.productId, type: m.type, qty: m.qty, delta: m.delta, refKey: m.refKey,
    orderId: m.orderId, customerId: m.customerId, staffId: m.staffId, note: m.note ?? '', at: ctx.now,
  });
  if (m.refKey) db.appliedKeys[`inv:${m.refKey}`] = true;

  if (next.filled <= product.lowStockThreshold && next.filled < cur.filled) {
    pushNotification(db, ctx, {
      type: 'low_stock', title: 'Low stock alert',
      body: `${product.name}: only ${next.filled} filled bottles left`,
      refType: 'product', refId: product.id, key: `low:${product.id}:${isoToDateStr(ctx.now)}`,
    });
  }
  return { ok: true };
}

export type InventoryEntryKind = 'new_stock' | 'purchase' | 'refill' | 'adjust' | 'damaged' | 'lost' | 'collect_empty';
export interface InventoryEntryInput {
  productId: ID;
  kind: InventoryEntryKind;
  qty: number;
  /** adjust: field to alter; damaged: source (filled|empty); lost: source (empty|withCustomers) */
  field?: StockField;
  /** adjust only: 1 add / -1 remove */
  direction?: 1 | -1;
  customerId?: ID;
  unitCost?: number;
  note?: string;
  requestId?: string;
}

export function inventoryEntry(db: DbState, ctx: Ctx, i: InventoryEntryInput): Result {
  if (!Number.isInteger(i.qty) || i.qty <= 0) return fail('Quantity must be a whole number greater than 0');
  const product = db.products.find((p) => p.id === i.productId);
  if (!product) return fail('Select a product');
  const refKey = i.requestId ? `req:${i.requestId}` : undefined;
  const base = { productId: i.productId, qty: i.qty, note: i.note, refKey, customerId: i.customerId };
  let res: Result<{ duplicate?: boolean }>;

  switch (i.kind) {
    case 'new_stock':
      res = applyStockMove(db, ctx, { ...base, type: 'new_stock', delta: { filled: i.qty } });
      break;
    case 'purchase':
      res = applyStockMove(db, ctx, { ...base, type: 'purchase', delta: { empty: i.qty } });
      if (res.ok && !res.duplicate && (i.unitCost ?? 0) > 0) {
        saveExpenseInternal(db, ctx, {
          category: 'Bottle Purchase', amount: i.qty * (i.unitCost ?? 0), date: isoToDateStr(ctx.now),
          method: 'cash', description: `${i.qty} × ${product.name} bottles purchased`,
        });
      }
      break;
    case 'refill':
      res = applyStockMove(db, ctx, { ...base, type: 'refill', delta: { empty: -i.qty, filled: i.qty } });
      break;
    case 'adjust': {
      if (!i.field || !i.direction) return fail('Choose what to adjust');
      res = applyStockMove(db, ctx, { ...base, type: 'adjustment', delta: { [i.field]: i.direction * i.qty } });
      break;
    }
    case 'damaged': {
      const from = i.field === 'empty' ? 'empty' : 'filled';
      res = applyStockMove(db, ctx, { ...base, type: 'damaged', delta: { [from]: -i.qty, damaged: i.qty } });
      break;
    }
    case 'lost': {
      const from = i.field === 'withCustomers' ? 'withCustomers' : 'empty';
      if (from === 'withCustomers' && i.customerId) {
        const held = bottleBalance(db.bottleLedger, i.customerId, i.productId);
        if (i.qty > held) return fail(`Customer only holds ${held} of this product`);
        db.bottleLedger.unshift({
          id: nextId(db, 'bl'), customerId: i.customerId, productId: i.productId, delta: -i.qty, depositDelta: 0,
          note: i.note || 'Marked lost', at: ctx.now,
        });
      }
      res = applyStockMove(db, ctx, { ...base, type: 'lost', delta: { [from]: -i.qty, lost: i.qty } });
      break;
    }
    case 'collect_empty': {
      if (!i.customerId) return fail('Select a customer');
      const held = bottleBalance(db.bottleLedger, i.customerId, i.productId);
      if (i.qty > held) return fail(`Customer only holds ${held} of this product`);
      res = applyStockMove(db, ctx, { ...base, type: 'collect_empty', delta: { withCustomers: -i.qty, empty: i.qty } });
      if (res.ok && !res.duplicate) {
        db.bottleLedger.unshift({
          id: nextId(db, 'bl'), customerId: i.customerId, productId: i.productId, delta: -i.qty, depositDelta: 0,
          note: i.note || 'Empty bottles collected', at: ctx.now,
        });
      }
      break;
    }
    default:
      return fail('Unknown entry');
  }
  return res.ok ? { ok: true } : res;
}

export const stockHealth = (filled: number, threshold: number): 'ok' | 'low' | 'out' =>
  filled <= 0 ? 'out' : filled <= threshold ? 'low' : 'ok';

export const todayTxns = (db: DbState) => db.inventoryTxns.filter((t) => isoToDateStr(t.at) === todayStr());
