import { useMemo, useState } from 'react';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { useActiveGoal } from '../context/ActiveGoalContext.jsx';
import { useSubjects } from '../hooks/useSubjects.js';
import { useSessions } from '../hooks/useSessions.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { useBlackoutDates } from '../hooks/useBlackoutDates.js';
import MonthGrid from '../components/calendar/MonthGrid.jsx';
import DaySessionsModal from '../components/calendar/DaySessionsModal.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { computeDailyAvailability, sumAvailableHours } from '../../server/lib/pacing.js';
import { todayLocalISO, diffDaysISO } from '../../server/lib/dateUtils.js';

export default function CalendarPage() {
  const { activeGoal, activeGoalId, loading: goalLoading } = useActiveGoal();
  const today = todayLocalISO();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [selectedDate, setSelectedDate] = useState(null);

  const { subjects } = useSubjects(activeGoalId);
  const { sessions, createSession, updateSession, deleteSession } = useSessions({ goalId: activeGoalId });
  const { availability } = useAvailability();
  const { blackoutDates } = useBlackoutDates();

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const availabilityMap = {};
  for (const row of availability) availabilityMap[row.weekday] = row.available_hours;
  const blackoutSet = new Set(blackoutDates.map((b) => b.date));

  const dailyAvailability = useMemo(
    () => computeDailyAvailability({ startDate: monthStart, endDate: monthEnd, availabilityMap, blackoutDates: blackoutSet }),
    [availability, blackoutDates, monthStart, monthEnd]
  );

  const sessionsByDate = useMemo(() => {
    const map = new Map();
    for (const session of sessions) {
      if (!map.has(session.session_date)) map.set(session.session_date, []);
      map.get(session.session_date).push(session);
    }
    return map;
  }, [sessions]);

  const monthMinutes = sessions
    .filter((s) => s.session_date >= monthStart && s.session_date <= monthEnd)
    .reduce((sum, s) => sum + s.minutes, 0);
  const monthLoggedHours = monthMinutes / 60;
  const monthCapacityHours = sumAvailableHours(dailyAvailability, monthStart, monthEnd);
  const daysMet = dailyAvailability.filter((d) => {
    const loggedMinutes = (sessionsByDate.get(d.date) ?? []).reduce((sum, s) => sum + s.minutes, 0);
    return d.availableHours > 0 && loggedMinutes / 60 >= d.availableHours;
  }).length;
  const studyDaysInMonth = dailyAvailability.filter((d) => d.availableHours > 0).length;

  function goToMonth(delta) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  if (goalLoading) return <p className="text-muted-55 px-8 py-6">Loading…</p>;
  if (!activeGoalId) return <p className="text-muted-55 px-8 py-6">Create a goal on the Dashboard first.</p>;

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const daysToExam = diffDaysISO(today, activeGoal.exam_date);

  return (
    <div>
      <PageHeader
        screenLabel="02 — Calendar"
        title={monthLabel}
        meta={`CAPACITY ${monthCapacityHours.toFixed(1)}H · LOGGED ${monthLoggedHours.toFixed(1)}H · ${blackoutDates.length} BLACKOUT DATES`}
        countdown={daysToExam}
      />
      <div className="px-8 pb-8 pt-5">
        <div className="mb-[18px] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button className="nx-ib" onClick={() => goToMonth(-1)} aria-label="Previous month">
              <CaretLeft size={14} />
            </button>
            <button className="nx-ib" onClick={() => goToMonth(1)} aria-label="Next month">
              <CaretRight size={14} />
            </button>
            <span className="nx-mono text-[12px] tracking-wide text-neutral-500">
              {year} / {String(month).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-[18px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent-500" />
              <span className="nx-mlbl">Met capacity</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent-800" />
              <span className="nx-mlbl">Partial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-neutral-800" />
              <span className="nx-mlbl">Blackout</span>
            </span>
          </div>
        </div>

        <MonthGrid
          year={year}
          month={month}
          today={today}
          dailyAvailability={dailyAvailability}
          sessionsByDate={sessionsByDate}
          onDayClick={setSelectedDate}
        />

        <div className="mt-[22px] flex gap-8 border-t border-divider pt-4">
          <div>
            <div className="nx-mlbl mb-1.5">Logged this month</div>
            <div className="nx-mono text-[19px]">{monthLoggedHours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="nx-mlbl mb-1.5">Capacity this month</div>
            <div className="nx-mono text-[19px]">{monthCapacityHours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="nx-mlbl mb-1.5">Days met</div>
            <div className="nx-mono text-[19px]">
              {daysMet} / {studyDaysInMonth}
            </div>
          </div>
          <div className="ml-auto self-center">
            <button className="btn btn-primary" onClick={() => setSelectedDate(today)} disabled={subjects.length === 0}>
              <Plus size={14} />
              Log a session
            </button>
          </div>
        </div>
      </div>

      {selectedDate && subjects.length > 0 && (
        <DaySessionsModal
          date={selectedDate}
          subjects={subjects}
          sessions={sessionsByDate.get(selectedDate) ?? []}
          onClose={() => setSelectedDate(null)}
          onCreate={createSession}
          onUpdate={updateSession}
          onDelete={deleteSession}
        />
      )}
    </div>
  );
}
