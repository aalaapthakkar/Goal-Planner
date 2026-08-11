function cellState({ isBlackout, availableHours, loggedHours }) {
  if (isBlackout) return 'blackout';
  if (loggedHours > 0 && loggedHours >= availableHours && availableHours > 0) return 'met';
  if (loggedHours > 0) return 'partial';
  return 'none';
}

const FILL_COLOR = {
  met: 'var(--color-accent-500)',
  partial: 'var(--color-accent-800)',
  blackout: 'var(--color-neutral-800)',
  none: 'transparent'
};

export default function DayCell({ day, isCurrentMonth, availableHours, loggedHours, isBlackout, isToday, isFuture, onClick }) {
  const dayNum = Number(day.slice(8, 10));
  const state = cellState({ isBlackout, availableHours, loggedHours });
  const fillPct = isFuture ? 0 : Math.min(100, Math.round((loggedHours / Math.max(availableHours, 0.1)) * 100));

  let valueText = '';
  if (isCurrentMonth) {
    if (isBlackout) valueText = 'blackout';
    else if (isFuture) valueText = availableHours > 0 ? `${availableHours.toFixed(1)}h free` : '';
    else valueText = `${loggedHours.toFixed(1)} / ${availableHours.toFixed(1)}h`;
  }

  return (
    <button
      onClick={onClick}
      className={`nx-cell${isToday ? ' is-today' : ''}`}
      style={{ opacity: isCurrentMonth ? 1 : 0.28 }}
    >
      <div className="flex items-baseline justify-between">
        <span className={`nx-mono text-[13px] ${isToday ? 'text-accent' : isCurrentMonth ? 'text-text' : 'text-neutral-700'}`}>
          {dayNum}
        </span>
        {isToday && <span className="nx-mono text-[9.5px] text-neutral-600">TODAY</span>}
      </div>
      {isCurrentMonth && (
        <div>
          <div className={`nx-mono mb-1.5 text-[11px] ${isFuture ? 'text-neutral-600' : state === 'met' || state === 'partial' ? 'text-accent-300' : 'text-neutral-400'}`}>
            {valueText}
          </div>
          <div className="h-[3px] overflow-hidden rounded-sm bg-neutral-900">
            <div className="h-full" style={{ width: `${fillPct}%`, background: FILL_COLOR[state] }} />
          </div>
        </div>
      )}
    </button>
  );
}
