import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
// server/lib is plain, dependency-free JS (no Node builtins), so it's safe to import straight
// into the browser bundle -- the same tested pacing math drives both the API and this chart.
import { computeDailyAvailability, computePlannedToDate, computeActualToDate } from '../../../server/lib/pacing.js';
import { enumerateDatesISO, compareISODates } from '../../../server/lib/dateUtils.js';

const TICK_STYLE = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fill: 'var(--color-neutral-600)' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="nx-mono rounded-md border border-divider bg-surface px-3 py-2 text-[11px] shadow-lg">
      <div className="mb-1 text-neutral-500">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value === null || entry.value === undefined ? '—' : `${entry.value}h`}
        </div>
      ))}
    </div>
  );
}

export default function PlannedVsActualChart({ goal, sessions, availabilityMap, blackoutDates, today }) {
  const data = useMemo(() => {
    if (!goal || compareISODates(goal.start_date, goal.exam_date) > 0) return [];

    const dailyAvailability = computeDailyAvailability({
      startDate: goal.start_date,
      endDate: goal.exam_date,
      availabilityMap,
      blackoutDates
    });

    return enumerateDatesISO(goal.start_date, goal.exam_date).map((date) => {
      const { plannedToDateHours } = computePlannedToDate({
        totalTargetHours: goal.total_target_hours,
        startDate: goal.start_date,
        examDate: goal.exam_date,
        today: date,
        dailyAvailability
      });
      const isFuture = compareISODates(date, today) > 0;
      const actualToDateHours = isFuture ? null : computeActualToDate({ sessions, asOfDate: date });
      return {
        date,
        planned: Number(plannedToDateHours.toFixed(2)),
        actual: actualToDateHours === null ? null : Number(actualToDateHours.toFixed(2))
      };
    });
  }, [goal, sessions, availabilityMap, blackoutDates, today]);

  if (data.length === 0) {
    return <p className="text-muted-55 text-sm">Fix the goal's dates to see this chart.</p>;
  }

  const todayInRange = data.some((d) => d.date === today);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-divider)" vertical={false} />
        <XAxis dataKey="date" tick={TICK_STYLE} axisLine={{ stroke: 'var(--color-divider)' }} tickLine={false} minTickGap={50} />
        <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={34} />
        <Tooltip content={<ChartTooltip />} />
        {todayInRange && (
          <ReferenceLine x={today} stroke="var(--color-accent-800)" label={{ value: 'TODAY', position: 'insideTopLeft', fill: 'var(--color-accent-600)', fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace" }} />
        )}
        <Line type="monotone" dataKey="planned" stroke="var(--color-neutral-600)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="Planned" />
        <Line type="monotone" dataKey="actual" stroke="var(--color-accent)" dot={false} strokeWidth={2} name="Actual" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
