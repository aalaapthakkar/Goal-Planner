import { useEffect, useState } from 'react';
import { computeDailyAvailability, sumAvailableHours } from '../../../server/lib/pacing.js';
import { todayLocalISO, compareISODates } from '../../../server/lib/dateUtils.js';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AvailabilityEditor({ availability, onSave, goal }) {
  const [hours, setHours] = useState(() => Array(7).fill(0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (availability.length === 7) {
      const byWeekday = new Array(7);
      for (const row of availability) byWeekday[row.weekday] = row.available_hours;
      setHours(byWeekday);
    }
  }, [availability]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(hours.map((available_hours, weekday) => ({ weekday, available_hours: Number(available_hours) })));
    } finally {
      setSaving(false);
    }
  }

  const weeklyTotal = hours.reduce((sum, h) => sum + Number(h || 0), 0);
  let hoursToExam = null;
  if (goal?.exam_date) {
    const today = todayLocalISO();
    if (compareISODates(today, goal.exam_date) <= 0) {
      const availabilityMap = {};
      hours.forEach((h, weekday) => (availabilityMap[weekday] = Number(h || 0)));
      const daily = computeDailyAvailability({ startDate: today, endDate: goal.exam_date, availabilityMap, blackoutDates: [] });
      hoursToExam = sumAvailableHours(daily, today, goal.exam_date);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 overflow-hidden rounded-md border border-divider">
        {WEEKDAY_LABELS.map((label, weekday) => (
          <div key={label} className={`p-2.5 text-center${weekday === 0 ? '' : ' border-l border-divider'}`}>
            <div className="nx-mlbl mb-2">{label}</div>
            <input
              type="number"
              min="0"
              step="0.5"
              value={hours[weekday]}
              onChange={(e) => {
                const next = [...hours];
                next[weekday] = e.target.value;
                setHours(next);
              }}
              className="input nx-mono text-center"
              style={{ padding: 4, minHeight: 28, fontSize: 14 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="nx-mono text-[11px] text-neutral-500">
          {weeklyTotal.toFixed(1)}h / week{hoursToExam !== null ? ` · ${hoursToExam.toFixed(0)}h to the exam` : ''}
        </span>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving…' : 'Save availability'}
        </button>
      </div>
    </div>
  );
}
