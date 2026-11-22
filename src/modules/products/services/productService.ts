import { Ctx, DbState, ID, Product, Result } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';
import { emptyStock } from '../../inventory/services/inventoryService';
import { ensureCapacity, upgradeWorkspace } from './capacityService';

export type ProductInput = Omit<Product, 'id' | 'active'> & { id?: ID; active?: boolean };

/** Standard catalogue: one product for each default bottle size. Owners edit prices, deactivate, or add more. */
export const DEFAULT_PRODUCTS: Omit<ProductInput, 'id'>[] = [
  { name: '250ml Bottle', capacityMl: 250, sellingPrice: 6, purchaseCost: 3.5, deposit: 0, returnable: false, lowStockThreshold: 150 },
  { name: '500ml Bottle', capacityMl: 500, sellingPrice: 10, purchaseCost: 6, deposit: 0, returnable: false, lowStockThreshold: 150 },
  { name: '1L Bottle', capacityMl: 1000, sellingPrice: 18, purchaseCost: 11, deposit: 0, returnable: false, lowStockThreshold: 120 },
  { name: '2L Bottle', capacityMl: 2000, sellingPrice: 32, purchaseCost: 20, deposit: 0, returnable: false, lowStockThreshold: 80 },
  { name: '5L Can', capacityMl: 5000, sellingPrice: 55, purchaseCost: 34, deposit: 80, returnable: true, lowStockThreshold: 40 },
  { name: '10L Can', capacityMl: 10000, sellingPrice: 85, purchaseCost: 52, deposit: 150, returnable: true, lowStockThreshold: 30 },
  { name: '20L Jar', capacityMl: 20000, sellingPrice: 70, purchaseCost: 38, deposit: 250, returnable: true, lowStockThreshold: 60 },
  { name: '25L Jar', capacityMl: 25000, sellingPrice: 90, purchaseCost: 50, deposit: 300, returnable: true, lowStockThreshold: 25 },
];

/**
 * Idempotent. Creates the standard product for each default size, at most once per workspace (tracked in
 * appliedKeys). Skipped for a size that already has any product (active or not), so nothing is duplicated
 * and existing products are never changed.
 */
export function ensureDefaultProducts(db: DbState, ctx: Ctx): void {
  for (const p of DEFAULT_PRODUCTS) {
    const k = `product:default:${p.capacityMl}`;
    if (db.appliedKeys[k]) continue;
    db.appliedKeys[k] = true;
    if (!db.products.some((x) => x.capacityMl === p.capacityMl)) saveProduct(db, ctx, { ...p, active: true });
  }
}

/** Everything a workspace must have: saved sizes (standard + any in use) and the standard product catalogue. Safe to repeat. */
export function ensureWorkspaceDefaults(db: DbState, ctx: Ctx): void {
  upgradeWorkspace(db, ctx.now);
  ensureDefaultProducts(db, ctx);
}

export function saveProduct(db: DbState, ctx: Ctx, i: ProductInput): Result<{ id: ID }> {
  if (!i.name.trim()) return fail('Product name is required');
  if (!(i.capacityMl > 0)) return fail('Capacity must be greater than 0');
  if (i.sellingPrice < 0 || i.purchaseCost < 0 || i.deposit < 0) return fail('Amounts cannot be negative');
  // A custom size typed on a product becomes a saved size of its own, so it gets a filter chip.
  ensureCapacity(db, i.capacityMl, ctx.now);
  if (i.id) {
    const p = db.products.find((x) => x.id === i.id);
    if (!p) return fail('Product not found');
    Object.assign(p, { ...i, active: i.active ?? p.active });
    return { ok: true, id: p.id };
  }
  const id = nextId(db, 'p');
  db.products.push({ ...i, id, active: i.active ?? true });
  db.stock[id] = emptyStock(id);
  return { ok: true, id };
}

export function setProductActive(db: DbState, id: ID, active: boolean): Result {
  const p = db.products.find((x) => x.id === id);
  if (!p) return fail('Product not found');
  p.active = active;
  return { ok: true };
}
