import { Ctx, DbState, ID, Result, Staff } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';

export type StaffInput = Omit<Staff, 'id' | 'active' | 'joinedAt'> & { id?: ID };

export function saveStaff(db: DbState, ctx: Ctx, i: StaffInput): Result<{ id: ID }> {
  if (!i.name.trim()) return fail('Name is required');
  if (!/^[+\d][\d\s-]{6,15}$/.test(i.phone.trim())) return fail('Enter a valid mobile number');
  if (i.id) {
    const s = db.staff.find((x) => x.id === i.id);
    if (!s) return fail('Staff not found');
    Object.assign(s, { name: i.name.trim(), phone: i.phone.trim(), vehicle: i.vehicle });
    return { ok: true, id: s.id };
  }
  const id = nextId(db, 's');
  db.staff.push({ id, name: i.name.trim(), phone: i.phone.trim(), vehicle: i.vehicle, active: true, joinedAt: ctx.now });
  return { ok: true, id };
}

export function setStaffActive(db: DbState, id: ID, active: boolean): Result {
  const s = db.staff.find((x) => x.id === id);
  if (!s) return fail('Staff not found');
  if (!active && db.orders.some((o) => o.staffId === id && ['assigned', 'out_for_delivery'].includes(o.status))) {
    return fail('This staff member still has open deliveries. Reassign them first.');
  }
  s.active = active;
  return { ok: true };
}
