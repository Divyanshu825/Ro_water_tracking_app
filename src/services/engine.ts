import { Ctx, DbState, ID, Result } from '../types/domain';
import { CustomerInput, deleteCustomer, saveCustomer, setCustomerActive } from '../modules/customers/services/customerService';
import { ProductInput, saveProduct, setProductActive } from '../modules/products/services/productService';
import { CapacityInput, deleteCapacity, saveCapacity } from '../modules/products/services/capacityService';
import { StaffInput, saveStaff, setStaffActive } from '../modules/delivery/services/staffService';
import { OrderInput, StatusInput, DeliverInput, changeStatus, createOrder, deliverOrder } from '../modules/orders/services/orderService';
import { DepositRefundInput, PaymentInput, recordPayment, refundDeposit } from '../modules/payments/services/paymentService';
import { InventoryEntryInput, inventoryEntry } from '../modules/inventory/services/inventoryService';
import {
  SubscriptionInput, generateSubscriptionOrders, refreshAlerts, renewSubscription, saveSubscription, setSubscriptionStatus,
} from '../modules/subscriptions/services/subscriptionService';
import { ExpenseInput, deleteExpense, saveExpenseInternal } from '../modules/expenses/services/expenseService';
import { balancesByCustomer } from '../modules/payments/services/ledger';
import { pushNotification } from './common';
import { isoToDateStr } from '../utils/date';

export type Op =
  | { t: 'customer.save'; v: CustomerInput }
  | { t: 'customer.active'; id: ID; active: boolean }
  | { t: 'customer.delete'; id: ID }
  | { t: 'product.save'; v: ProductInput }
  | { t: 'product.active'; id: ID; active: boolean }
  | { t: 'capacity.save'; v: CapacityInput }
  | { t: 'capacity.delete'; id: ID }
  | { t: 'staff.save'; v: StaffInput }
  | { t: 'staff.active'; id: ID; active: boolean }
  | { t: 'order.create'; v: OrderInput }
  | { t: 'order.status'; v: StatusInput }
  | { t: 'order.deliver'; v: DeliverInput }
  | { t: 'payment.record'; v: PaymentInput }
  | { t: 'payment.refund'; v: DepositRefundInput }
  | { t: 'inventory.entry'; v: InventoryEntryInput }
  | { t: 'sub.save'; v: SubscriptionInput }
  | { t: 'sub.status'; id: ID; status: 'active' | 'paused' | 'cancelled' }
  | { t: 'sub.renew'; id: ID }
  | { t: 'sub.generate'; from: string; to: string }
  | { t: 'expense.save'; v: ExpenseInput }
  | { t: 'expense.delete'; id: ID }
  | { t: 'notif.read'; id: ID }
  | { t: 'notif.readAll' }
  | { t: 'notif.clear' }
  | { t: 'alerts.refresh' };

/** Applies one business operation to a (draft) db. Returns a Result; never throws for business errors. */
export function applyOp(db: DbState, op: Op, ctx: Ctx): Result<Record<string, unknown>> {
  switch (op.t) {
    case 'customer.save': return saveCustomer(db, ctx, op.v);
    case 'customer.active': return setCustomerActive(db, op.id, op.active);
    case 'customer.delete': return deleteCustomer(db, op.id);
    case 'product.save': return saveProduct(db, ctx, op.v);
    case 'product.active': return setProductActive(db, op.id, op.active);
    case 'capacity.save': return saveCapacity(db, ctx, op.v);
    case 'capacity.delete': return deleteCapacity(db, op.id);
    case 'staff.save': return saveStaff(db, ctx, op.v);
    case 'staff.active': return setStaffActive(db, op.id, op.active);
    case 'order.create': return createOrder(db, ctx, op.v);
    case 'order.status': return changeStatus(db, ctx, op.v);
    case 'order.deliver': return deliverOrder(db, ctx, op.v);
    case 'payment.record': return recordPayment(db, ctx, op.v);
    case 'payment.refund': return refundDeposit(db, ctx, op.v);
    case 'inventory.entry': return inventoryEntry(db, ctx, op.v);
    case 'sub.save': return saveSubscription(db, ctx, op.v);
    case 'sub.status': return setSubscriptionStatus(db, op.id, op.status);
    case 'sub.renew': return renewSubscription(db, op.id);
    case 'sub.generate': return generateSubscriptionOrders(db, ctx, op.from, op.to);
    case 'expense.save': return saveExpenseInternal(db, ctx, op.v);
    case 'expense.delete': return deleteExpense(db, op.id);
    case 'notif.read': {
      const n = db.notifications.find((x) => x.id === op.id);
      if (n) n.read = true;
      return { ok: true };
    }
    case 'notif.readAll': db.notifications.forEach((n) => { n.read = true; }); return { ok: true };
    case 'notif.clear': db.notifications = []; return { ok: true };
    case 'alerts.refresh': {
      const today = isoToDateStr(ctx.now);
      refreshAlerts(db, ctx, today);
      const week = Math.floor(Date.parse(today) / (7 * 86400000));
      for (const [cid, bal] of balancesByCustomer(db.financialEntries)) {
        if (bal > 0) {
          const c = db.customers.find((x) => x.id === cid);
          if (c) pushNotification(db, ctx, {
            type: 'pending_payment', title: 'Outstanding balance', body: `${c.name} owes ${ctx.settings.currency.symbol}${bal}`,
            refType: 'customer', refId: cid, key: `owe:${cid}:${week}`,
          });
        }
      }
      return { ok: true };
    }
  }
}
