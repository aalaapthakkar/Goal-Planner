import { useActiveGoal } from '../context/ActiveGoalContext.jsx';
import { useSubjects } from '../hooks/useSubjects.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { useBlackoutDates } from '../hooks/useBlackoutDates.js';
import GoalForm from '../components/settings/GoalForm.jsx';
import AvailabilityEditor from '../components/settings/AvailabilityEditor.jsx';
import BlackoutDateManager from '../components/settings/BlackoutDateManager.jsx';
import SubjectWeightEditor from '../components/settings/SubjectWeightEditor.jsx';
import CsvPanel from '../components/settings/CsvPanel.jsx';
import FirstRunBanner from '../components/settings/FirstRunBanner.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { todayLocalISO, diffDaysISO } from '../../server/lib/dateUtils.js';

export default function SettingsPage() {
  const { activeGoal, activeGoalId, loading: goalLoading, updateGoal, deleteGoal } = useActiveGoal();
  const {
    subjects,
    weightSum,
    weightSumOk,
    updateSubject,
    createSubject,
    deleteSubject,
    refetch: refetchSubjects
  } = useSubjects(activeGoalId);
  const { availability, saveAvailability, refetch: refetchAvailability } = useAvailability();
  const { blackoutDates, addBlackoutDate, removeBlackoutDate, refetch: refetchBlackouts } = useBlackoutDates();

  if (goalLoading) return <p className="text-muted-55 px-8 py-6">Loading…</p>;
  if (!activeGoal) return <p className="text-muted-55 px-8 py-6">Create a goal on the Dashboard first.</p>;

  async function handleDeleteGoal() {
    if (!confirm(`Delete "${activeGoal.name}" and all its sessions? This can't be undone.`)) return;
    await deleteGoal(activeGoal.id);
  }

  const daysToExam = diffDaysISO(todayLocalISO(), activeGoal.exam_date);

  return (
    <div>
      <PageHeader
        screenLabel="05 — Settings"
        title="Settings"
        meta="GOAL · AVAILABILITY · BLACKOUTS · WEIGHTS · CSV"
        countdown={daysToExam}
      />
      <div className="px-8 pb-8 pt-5">
      <FirstRunBanner />
      <div className="grid grid-cols-2 items-start gap-10">
        <section>
          <div className="nx-mlbl mb-3.5">01 — Goal</div>
          <GoalForm initialGoal={activeGoal} onSubmit={(payload) => updateGoal(activeGoal.id, payload)} submitLabel="Save goal" layout="inline" />
          <button onClick={handleDeleteGoal} className="btn btn-danger-ghost mt-3">
            Delete this goal
          </button>
        </section>

        <section>
          <div className="nx-mlbl mb-3.5">02 — Weekly availability</div>
          <AvailabilityEditor availability={availability} onSave={saveAvailability} goal={activeGoal} />

          <div className="nx-mlbl mb-3.5 mt-6">03 — Blackout dates</div>
          <BlackoutDateManager blackoutDates={blackoutDates} onAdd={addBlackoutDate} onRemove={removeBlackoutDate} />
        </section>

        <section className="col-span-2">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="nx-mlbl">04 — Topic weights</span>
            <span className={`nx-mono text-[11px] ${weightSumOk ? 'text-accent-300' : 'text-neutral-500'}`}>
              SUM {weightSum.toFixed(1)}% {weightSumOk ? '' : '(should be 100%)'}
            </span>
          </div>
          <SubjectWeightEditor
            subjects={subjects}
            weightSum={weightSum}
            weightSumOk={weightSumOk}
            onUpdate={updateSubject}
            onCreate={createSubject}
            onDelete={deleteSubject}
          />
        </section>

        <section className="col-span-2">
          <div className="nx-mlbl mb-3">05 — Import / export</div>
          <CsvPanel
            goalId={activeGoal.id}
            onImported={() => {
              refetchSubjects();
              refetchAvailability();
              refetchBlackouts();
            }}
          />
        </section>
        </div>
      </div>
    </div>
  );
}
