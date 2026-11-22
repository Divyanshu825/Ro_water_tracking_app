import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { formatMoney } from '../utils/format';

export function useFormat() {
  const cur = useAppSelector((s) => s.settings.currency);
  return useMemo(() => ({
    cur,
    money: (n: number, compact = false) => formatMoney(n, cur, compact),
  }), [cur]);
}
