import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { balancesByCustomer, bottlesByCustomer } from '../modules/payments/services/ledger';

export const useDb = () => useAppSelector((s) => s.db);
export const useSettings = () => useAppSelector((s) => s.settings);

export const useBalances = () => {
  const entries = useAppSelector((s) => s.db.financialEntries);
  return useMemo(() => balancesByCustomer(entries), [entries]);
};
export const useBottleBalances = () => {
  const ledger = useAppSelector((s) => s.db.bottleLedger);
  return useMemo(() => bottlesByCustomer(ledger), [ledger]);
};
export const useCustomer = (id?: string) => useAppSelector((s) => s.db.customers.find((c) => c.id === id));
export const useProduct = (id?: string) => useAppSelector((s) => s.db.products.find((p) => p.id === id));
export const useOrder = (id?: string) => useAppSelector((s) => s.db.orders.find((o) => o.id === id));
export const useStaffMember = (id?: string) => useAppSelector((s) => s.db.staff.find((x) => x.id === id));

/** Stable client-side id used so a double tap can't submit the same form twice. */
import { useRef } from 'react';
export const useRequestId = () => {
  const r = useRef(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  return r.current;
};
