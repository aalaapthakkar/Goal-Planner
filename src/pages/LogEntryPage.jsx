import { useActiveGoal } from '../context/ActiveGoalContext.jsx';
import { useSubjects } from '../hooks/useSubjects.js';
import { useSessions } from '../hooks/useSessions.js';
import SessionForm from '../components/log/SessionForm.jsx';
import SessionsTable from '../components/log/SessionsTable.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { todayLocalISO, diffDaysISO } from '../../server/lib/dateUtils.js';

export default function LogEntryPage() {
  const { activeGoal, activeGoalId, loading: goalLoading } = useActiveGoal();
  const { subjects } = useSubjects(activeGoalId);
  const { sessions, createSession, updateSession, deleteSession } = useSessions({ goalId: activeGoalId });

  if (goalLoading) return <p className="text-muted-55 px-8 py-6">Loading…</p>;
  if (!activeGoalId) return <p className="text-muted-55 px-8 py-6">Create a goal on the Dashboard first.</p>;

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalHours = totalMinutes / 60;
  const avgMinutes = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;
  const daysToExam = diffDaysISO(todayLocalISO(), activeGoal.exam_date);

  return (
    <div>
      <PageHeader
        screenLabel="03 — Log"
        title="Log a session"
        meta={`${sessions.length} SESSIONS · ${totalHours.toFixed(1)}H TOTAL · AVG ${avgMinutes} MIN`}
        countdown={daysToExam}
      />
      <div className="px-8 pb-8 pt-5">
        {subjects.length > 0 && <SessionForm subjects={subjects} onSubmit={createSession} />}

        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="nx-mlbl">History</span>
          <span className="nx-mono text-[10px] text-neutral-600">{sessions.length} SESSIONS</span>
        </div>
        <SessionsTable sessions={sessions} subjects={subjects} onUpdate={updateSession} onDelete={deleteSession} />
      </div>
    </div>
  );
}
