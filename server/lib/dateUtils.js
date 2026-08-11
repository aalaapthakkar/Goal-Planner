// Pure, dependency-free date-string utilities. No Node builtins beyond the global Date object,
// and Date is used ONLY via Date.UTC(...)/getUTC*() so local timezone never enters the picture --
// this file is safe to import from both server and browser code.
//
// Principle: never `new Date(dateString)` on a 'YYYY-MM-DD' string. That parses as UTC midnight,
// which can render as the previous calendar day when read back with local getters in a
// timezone west of UTC. Instead, split the string into {y, m, d} by hand and only ever construct
// dates via Date.UTC(y, m-1, d), reading back with getUTC*() accessors. Two 'YYYY-MM-DD' strings
// also compare correctly with plain string `<`/`>` -- no Date object needed for ordering at all.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseISO(dateStr) {
  const match = ISO_RE.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return { year, month, day };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function epochFromParts({ year, month, day }) {
  return Date.UTC(year, month - 1, day);
}

function isoFromEpoch(epochMs) {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Regex + real calendar-validity check (rejects e.g. 2026-02-30). */
export function isValidISODate(s) {
  const parts = parseISO(s);
  if (!parts) return false;
  const { year, month, day } = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const epoch = epochFromParts(parts);
  const d = new Date(epoch);
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

/** Local wall-clock "today" as 'YYYY-MM-DD'. The one place local time intentionally matters. */
export function todayLocalISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** -1 if a<b, 0 if equal, 1 if a>b. Plain string comparison is valid for 'YYYY-MM-DD'. */
export function compareISODates(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** 0 (Sun) - 6 (Sat), computed via UTC component math -- never local Date#getDay(). */
export function getWeekdayISO(dateStr) {
  const parts = parseISO(dateStr);
  if (!parts) throw new Error(`Invalid ISO date: ${dateStr}`);
  return new Date(epochFromParts(parts)).getUTCDay();
}

/** Add n days (n may be negative) to a 'YYYY-MM-DD' string, returning a new 'YYYY-MM-DD' string. */
export function addDaysISO(dateStr, n) {
  const parts = parseISO(dateStr);
  if (!parts) throw new Error(`Invalid ISO date: ${dateStr}`);
  return isoFromEpoch(epochFromParts(parts) + n * 86400000);
}

/** Integer number of days from `fromStr` to `toStr` (toStr - fromStr). */
export function diffDaysISO(fromStr, toStr) {
  const fromParts = parseISO(fromStr);
  const toParts = parseISO(toStr);
  if (!fromParts || !toParts) throw new Error('Invalid ISO date passed to diffDaysISO');
  return Math.round((epochFromParts(toParts) - epochFromParts(fromParts)) / 86400000);
}

/** Inclusive array of 'YYYY-MM-DD' strings from fromStr to toStr. [] if fromStr > toStr. */
export function enumerateDatesISO(fromStr, toStr) {
  if (compareISODates(fromStr, toStr) > 0) return [];
  const fromParts = parseISO(fromStr);
  const toParts = parseISO(toStr);
  if (!fromParts || !toParts) throw new Error('Invalid ISO date passed to enumerateDatesISO');
  const fromEpoch = epochFromParts(fromParts);
  const toEpoch = epochFromParts(toParts);
  const dayCount = Math.round((toEpoch - fromEpoch) / 86400000) + 1;
  const dates = new Array(dayCount);
  for (let i = 0; i < dayCount; i++) {
    dates[i] = isoFromEpoch(fromEpoch + i * 86400000);
  }
  return dates;
}

/** Clamp dateStr into [minStr, maxStr] using string comparison. */
export function clampISO(dateStr, minStr, maxStr) {
  if (compareISODates(dateStr, minStr) < 0) return minStr;
  if (compareISODates(dateStr, maxStr) > 0) return maxStr;
  return dateStr;
}
