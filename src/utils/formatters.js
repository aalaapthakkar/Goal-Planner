export function formatHours(hours) {
  if (hours === Infinity) return '∞';
  if (hours === -Infinity) return '-∞';
  if (!Number.isFinite(hours)) return '—';
  return `${hours.toFixed(1)}h`;
}

export function formatSignedHours(hours) {
  if (!Number.isFinite(hours)) return formatHours(hours);
  const sign = hours > 0 ? '+' : '';
  return `${sign}${hours.toFixed(1)}h`;
}

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

export function formatMinutesAsHours(minutes) {
  return formatHours(minutes / 60);
}

export function formatFocusDots(rating) {
  if (!rating) return '—';
  return '●'.repeat(rating) + '○'.repeat(5 - rating);
}
