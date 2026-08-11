import DayCell from './DayCell.jsx';
import { addDaysISO, getWeekdayISO, compareISODates } from '../../../server/lib/dateUtils.js';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthGrid({ year, month, today, dailyAvailability, sessionsByDate, onDayClick }) {
  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const leadingBlanks = getWeekdayISO(firstOfMonth);
  const gridStart = addDaysISO(firstOfMonth, -leadingBlanks);

  const cells = Array.from({ length: 42 }, (_, i) => addDaysISO(gridStart, i));
  const availabilityByDate = new Map(dailyAvailability.map((d) => [d.date, d]));

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="nx-mlbl">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date) => {
          const isCurrentMonth = date.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`;
          const avail = availabilityByDate.get(date);
          const loggedMinutes = (sessionsByDate.get(date) ?? []).reduce((sum, s) => sum + s.minutes, 0);
          return (
            <DayCell
              key={date}
              day={date}
              isCurrentMonth={isCurrentMonth}
              availableHours={avail?.availableHours ?? 0}
              loggedHours={loggedMinutes / 60}
              isBlackout={avail?.isBlackout ?? false}
              isToday={date === today}
              isFuture={compareISODates(date, today) > 0}
              onClick={() => onDayClick(date)}
            />
          );
        })}
      </div>
    </div>
  );
}
