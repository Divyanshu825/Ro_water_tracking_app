import { Ctx, DbState, ID, Product, Result } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';
import { emptyStock } from '../../inventory/services/inventoryService';

export type ProductInput = Omit<Product, 'id' | 'active'> & { id?: ID; active?: boolean };

export function saveProduct(db: DbState, _ctx: Ctx, i: ProductInput): Result<{ id: ID }> {
  if (!i.name.trim()) return fail('Product name is required');
  if (!(i.capacityMl > 0)) return fail('Capacity must be greater than 0');
  if (i.sellingPrice < 0 || i.purchaseCost < 0 || i.deposit < 0) return fail('Amounts cannot be negative');
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
