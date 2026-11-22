import { Address, Customer, CustomerType, Ctx, DbState, ID, Result } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';
import { customerBalance } from '../../payments/services/ledger';

export interface CustomerInput {
  id?: ID;
  name: string;
  phone: string;
  email?: string;
  type: CustomerType;
  notes: string;
  addresses: (Omit<Address, 'id'> & { id?: ID })[];
}

export function saveCustomer(db: DbState, ctx: Ctx, i: CustomerInput): Result<{ id: ID }> {
  if (!i.name.trim()) return fail('Name is required');
  if (!/^[+\d][\d\s-]{6,15}$/.test(i.phone.trim())) return fail('Enter a valid mobile number');
  if (i.addresses.length === 0) return fail('Add at least one delivery address');
  const dup = db.customers.find((c) => c.phone === i.phone.trim() && c.id !== i.id);
  if (dup) return fail(`${dup.name} already uses this mobile number`);
  const addresses: Address[] = i.addresses.map((a) => ({ ...a, id: a.id ?? nextId(db, 'ad') }));
  if (i.id) {
    const c = db.customers.find((x) => x.id === i.id);
    if (!c) return fail('Customer not found');
    Object.assign(c, { name: i.name.trim(), phone: i.phone.trim(), email: i.email, type: i.type, notes: i.notes, addresses });
    return { ok: true, id: c.id };
  }
  const id = nextId(db, 'c');
  db.customers.unshift({
    id, name: i.name.trim(), phone: i.phone.trim(), email: i.email, type: i.type, notes: i.notes, addresses,
    active: true, createdAt: ctx.now,
  } as Customer);
  return { ok: true, id };
}

export function setCustomerActive(db: DbState, id: ID, active: boolean): Result {
  const c = db.customers.find((x) => x.id === id);
  if (!c) return fail('Customer not found');
  c.active = active;
  return { ok: true };
}

/** Hard delete only when the customer has no history; otherwise deactivate. */
export function deleteCustomer(db: DbState, id: ID): Result<{ deactivated: boolean }> {
  const hasHistory =
    db.orders.some((o) => o.customerId === id) ||
    db.financialEntries.some((e) => e.customerId === id) ||
    db.bottleLedger.some((b) => b.customerId === id);
  if (hasHistory) {
    const c = db.customers.find((x) => x.id === id);
    if (c) c.active = false;
    return { ok: true, deactivated: true };
  }
  db.customers = db.customers.filter((c) => c.id !== id);
  return { ok: true, deactivated: false };
}

export const canDeactivate = (db: DbState, id: ID) => customerBalance(db.financialEntries, id) <= 0;
