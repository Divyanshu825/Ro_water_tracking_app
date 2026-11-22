import { SettingsState } from '../types/domain';

export const formatMoney = (n: number, c: SettingsState['currency'], compact = false) => {
  const neg = n < 0;
  const abs = Math.abs(n);
  let body: string;
  if (compact && abs >= 1000) {
    body = abs >= 100000 && c.code === 'INR'
      ? `${(abs / 100000).toFixed(abs >= 1000000 ? 1 : 2).replace(/\.?0+$/, '')}L`
      : `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  } else {
    try {
      body = abs.toLocaleString(c.locale, { minimumFractionDigits: abs % 1 ? 2 : 0, maximumFractionDigits: 2 });
    } catch {
      body = abs.toFixed(abs % 1 ? 2 : 0);
    }
  }
  return `${neg ? '-' : ''}${c.symbol}${body}`;
};

export const formatCapacity = (ml: number) => (ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`);
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const labelize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
export const toNum = (s: string | number | undefined) => {
  const n = typeof s === 'number' ? s : Number((s ?? '').toString().trim());
  return Number.isFinite(n) ? n : 0;
};
