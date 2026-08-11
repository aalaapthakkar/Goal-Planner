import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { addDaysISO, compareISODates } from '../../../server/lib/dateUtils.js';

const WEEKS_SHOWN = 8;
const TICK_STYLE = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fill: 'var(--color-neutral-600)' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="nx-mono rounded-md border border-divider bg-surface px-3 py-2 text-[11px] shadow-lg">
      <div className="mb-1 text-neutral-500">week of {label}</div>
      <div className="text-accent-300">{payload[0].value}h</div>
    </div>
  );
}

export function useWeeklyHoursData(sessions, today) {
  return useMemo(() => {
    const weeks = [];
    for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
      const weekEnd = addDaysISO(today, -7 * i);
      const weekStart = addDaysISO(weekEnd, -6);
      weeks.push({ weekStart, weekEnd });
    }
    return weeks.map(({ weekStart, weekEnd }) => {
      const minutes = sessions
        .filter(
          (s) => compareISODates(s.session_date, weekStart) >= 0 && compareISODates(s.session_date, weekEnd) <= 0
        )
        .reduce((sum, s) => sum + s.minutes, 0);
      return { week: weekStart, hours: Number((minutes / 60).toFixed(2)) };
    });
  }, [sessions, today]);
}

export default function WeeklyHoursChart({ sessions, today }) {
  const data = useWeeklyHoursData(sessions, today);
  const avg = data.length ? data.reduce((sum, d) => sum + d.hours, 0) / data.length : 0;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-divider)" vertical={false} />
        <XAxis dataKey="week" tick={TICK_STYLE} axisLine={{ stroke: 'var(--color-divider)' }} tickLine={false} />
        <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'color-mix(in srgb, var(--color-text) 6%, transparent)' }} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="var(--color-accent-600)"
            strokeDasharray="3 3"
            label={{ value: `AVG ${avg.toFixed(1)}H`, position: 'insideTopRight', fill: 'var(--color-accent-600)', fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace" }}
          />
        )}
        <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.week} fill={i === data.length - 1 ? 'var(--color-accent)' : 'var(--color-accent-700)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
