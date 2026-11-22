const pad = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const addMonths = (s: string, n: number) => {
  const d = parseDate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateStr(d);
};
export const diffDays = (a: string, b: string) =>
  Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
export const isoToDateStr = (iso: string) => toDateStr(new Date(iso));
export const dateAtHour = (dateStr: string, hour = 10, minute = 0) => {
  const d = parseDate(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
export const monthKey = (s: string) => s.slice(0, 7);
export const inRange = (dateStr: string, from: string, to: string) => dateStr >= from && dateStr <= to;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const monthName = (i: number) => MONTHS[i];
export const formatDate = (s: string) => {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const formatShortDate = (s: string) => {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const weekdayShort = (s: string) => DAYS[parseDate(s).getDay()];
export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h % 12 || 12}:${pad(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const friendlyDate = (s: string) => {
  const t = todayStr();
  if (s === t) return 'Today';
  if (s === addDays(t, 1)) return 'Tomorrow';
  if (s === addDays(t, -1)) return 'Yesterday';
  return formatDate(s);
};
export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};
