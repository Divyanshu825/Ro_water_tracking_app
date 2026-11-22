import { Ctx, DbState, Expense, ID, Result } from '../../../types/domain';
import { fail, nextId } from '../../../services/common';

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'> & { id?: ID };

export function saveExpenseInternal(db: DbState, ctx: Ctx, i: ExpenseInput): Result<{ id: ID }> {
  if (!(i.amount > 0)) return fail('Amount must be greater than 0');
  if (!i.date) return fail('Select a date');
  if (i.id) {
    const e = db.expenses.find((x) => x.id === i.id);
    if (!e) return fail('Expense not found');
    Object.assign(e, { ...i });
    return { ok: true, id: e.id };
  }
  const id = nextId(db, 'ex');
  db.expenses.unshift({ ...i, id, createdAt: ctx.now });
  return { ok: true, id };
}

export const deleteExpense = (db: DbState, id: ID): Result => {
  db.expenses = db.expenses.filter((e) => e.id !== id);
  return { ok: true };
};
