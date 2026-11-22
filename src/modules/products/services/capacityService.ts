import { Capacity, Ctx, DbState, ID, Result } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';
import { formatCapacity } from '../../../utils/format';

/** Standard bottle sizes (ml) every business workspace starts with. */
export const DEFAULT_CAPACITIES_ML = [250, 500, 1000, 2000, 5000, 10000, 20000, 25000] as const;

const defaultKey = (ml: number) => `capacity:default:${ml}`;
const byMl = (db: DbState, ml: number) => db.capacities.find((c) => c.ml === ml);
export const productsUsing = (db: DbState, ml: number) => db.products.filter((p) => p.capacityMl === ml).length;
export const capacityLabel = (c: Pick<Capacity, 'ml' | 'label'>) => c.label.trim() || formatCapacity(c.ml);
export const sortedCapacities = (db: DbState) => db.capacities.slice().sort((a, b) => a.ml - b.ml);

/**
 * Idempotent. Creates each standard size this workspace has never had. A default is created at most once
 * (tracked in appliedKeys), so an owner's later edit or delete of it is never undone, and a size the owner
 * already has is never duplicated.
 */
export function ensureDefaultCapacities(db: DbState, now: string): void {
  for (const ml of DEFAULT_CAPACITIES_ML) {
    const k = defaultKey(ml);
    if (db.appliedKeys[k]) continue;
    db.appliedKeys[k] = true;
    if (!byMl(db, ml)) db.capacities.push({ id: `cap_d${ml}`, ml, label: '', isDefault: true, createdAt: now, updatedAt: now });
  }
}

/** Returns the record for this size, creating a custom one if the business has never used it. */
export function ensureCapacity(db: DbState, ml: number, now: string): ID {
  const found = byMl(db, ml);
  if (found) return found.id;
  const id = nextId(db, 'cap');
  db.capacities.push({ id, ml, label: '', isDefault: false, createdAt: now, updatedAt: now });
  return id;
}

/**
 * Brings a workspace saved by an older app version up to date: adds the capacities list, the standard
 * sizes, and a record for every custom size already used by a product. Safe to run any number of times.
 */
export function upgradeWorkspace(db: DbState, now: string): void {
  if (!Array.isArray(db.capacities)) db.capacities = [];
  if (!db.appliedKeys) db.appliedKeys = {};
  ensureDefaultCapacities(db, now);
  for (const p of db.products) if (p.capacityMl > 0) ensureCapacity(db, p.capacityMl, now);
}

export interface CapacityInput { id?: ID; ml: number; label?: string }

export function saveCapacity(db: DbState, ctx: Ctx, i: CapacityInput): Result<{ id: ID }> {
  if (!Number.isInteger(i.ml) || i.ml <= 0) return fail('Capacity must be a whole number of ml greater than 0');
  const label = (i.label ?? '').trim();
  if (label.length > 30) return fail('Name must be 30 characters or fewer');
  const clash = byMl(db, i.ml);
  if (clash && clash.id !== i.id) return fail(`A ${formatCapacity(i.ml)} size already exists`);
  if (i.id) {
    const c = db.capacities.find((x) => x.id === i.id);
    if (!c) return fail('Size not found');
    if (c.ml !== i.ml) {
      // Products store their own capacity; changing it here would silently rewrite product records.
      const n = productsUsing(db, c.ml);
      if (n > 0) return fail(`${n} product${n > 1 ? 's use' : ' uses'} ${formatCapacity(c.ml)}. Change ${n > 1 ? 'their' : 'its'} capacity first, or only rename this size.`);
    }
    Object.assign(c, { ml: i.ml, label, updatedAt: ctx.now });
    return { ok: true, id: c.id };
  }
  const id = nextId(db, 'cap');
  db.capacities.push({ id, ml: i.ml, label, isDefault: false, createdAt: ctx.now, updatedAt: ctx.now });
  return { ok: true, id };
}

export function deleteCapacity(db: DbState, id: ID): Result {
  const c = db.capacities.find((x) => x.id === id);
  if (!c) return fail('Size not found');
  const n = productsUsing(db, c.ml);
  if (n > 0) return fail(`${n} product${n > 1 ? 's use' : ' uses'} this size, so it can't be deleted.`);
  db.capacities = db.capacities.filter((x) => x.id !== id);
  return { ok: true };
}
