// Date/time helpers. Dates are local 'YYYY-MM-DD' strings, times are 'HH:MM' (24h).

export const SLOT_MINUTES = 30;
export const WORK_START = '09:00';
export const WORK_END = '17:00'; // last slot starts at 16:30
export const BOOKING_HORIZON_DAYS = 30;
export const CANCEL_CUTOFF_HOURS = 2;
export const MAX_UPCOMING_PER_PATIENT = 3;

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now = new Date()) {
  return toISODate(now);
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export function parseDateTime(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function isValidISODate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '');
}

export function minutesOf(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isWeekend(iso) {
  const day = parseDateTime(iso, '00:00').getDay();
  return day === 0 || day === 6;
}

/** All slot start times in the working day: 09:00, 09:30 ... 16:30 */
export function workingSlots() {
  const out = [];
  for (let t = minutesOf(WORK_START); t < minutesOf(WORK_END); t += SLOT_MINUTES) {
    out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  }
  return out;
}

export function hoursUntil(date, time, now = new Date()) {
  return (parseDateTime(date, time) - now) / 36e5;
}

export function isPast(date, time, now = new Date()) {
  return parseDateTime(date, time) <= now;
}

export function formatDate(iso, opts = {}) {
  return parseDateTime(iso, '00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: opts.year === false ? undefined : 'numeric',
  });
}

export function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)}${suffix}`;
}

/** nth working day relative to today (n=0 today or next weekday, n>0 future, n<0 past). */
export function workday(n, now = new Date()) {
  let d = todayISO(now);
  if (n === 0) {
    while (isWeekend(d)) d = addDays(d, 1);
    return d;
  }
  const step = n > 0 ? 1 : -1;
  let count = 0;
  while (count < Math.abs(n)) {
    d = addDays(d, step);
    if (!isWeekend(d)) count++;
  }
  return d;
}
