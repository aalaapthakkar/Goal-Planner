import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useActiveGoal } from '../context/ActiveGoalContext.jsx';
import { usePacingSummary } from '../hooks/usePacingSummary.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { useBlackoutDates } from '../hooks/useBlackoutDates.js';
import { useSessions } from '../hooks/useSessions.js';
import GoalForm from '../components/settings/GoalForm.jsx';
import FirstRunBanner from '../components/settings/FirstRunBanner.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import PaceVerdict from '../components/dashboard/PaceVerdict.jsx';
import RemediationLevers from '../components/dashboard/RemediationLevers.jsx';
import PlannedVsActualChart from '../components/dashboard/PlannedVsActualChart.jsx';
import WeeklyHoursChart, { useWeeklyHoursData } from '../components/dashboard/WeeklyHoursChart.jsx';
import TopicBacklogTable from '../components/dashboard/TopicBacklogTable.jsx';
import { formatHours, formatSignedHours } from '../utils/formatters.js';
import {
  todayLocalISO,
  diffDaysISO,
  compareISODates,
  addDaysISO
} from '../../server/lib/dateUtils.js';
import { computeDailyAvailability, sumAvailableHours, countAvailableDays } from '../../server/lib/pacing.js';

function FirstRunPreview({ form, availability }) {
  const today = todayLocalISO();
  const { start_date, exam_date, total_target_hours, max_daily_hours } = form;

  const stats = useMemo(() => {
    if (!start_date || !exam_date || compareISODates(start_date, exam_date) > 0) return null;
    const availabilityMap = {};
    for (const row of availability) availabilityMap[row.weekday] = row.available_hours;

    const daily = computeDailyAvailability({ startDate: start_date, endDate: exam_date, availabilityMap, blackoutDates: [] });
    const daysInWindow = diffDaysISO(start_date, exam_date) + 1;
    const totalAvailableHours = sumAvailableHours(daily, start_date, exam_date);
    const studyDays = countAvailableDays(daily, start_date, exam_date);
    const target = Number(total_target_hours) || 0;
    const requiredRate = studyDays > 0 ? target / studyDays : target > 0 ? Infinity : 0;
    const max = Number(max_daily_hours) || 0;
    const overCeiling = Number.isFinite(requiredRate) && max > 0 && requiredRate > max;

    return { daysInWindow, totalAvailableHours, requiredRate, overCeiling };
  }, [start_date, exam_date, total_target_hours, max_daily_hours, availability]);

  if (!stats) {
    return (
      <p className="text-muted-55 text-[12.5px] leading-relaxed">
        Fill in the dates to see what this goal implies for your daily pace.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="nx-mono text-[30px] leading-none tracking-tight">{stats.daysInWindow}</div>
        <div className="nx-mlbl mt-1.5">Days in the window</div>
      </div>
      <div className="nx-rule -mr-10" />
      <div>
        <div className="nx-mono text-[30px] leading-none tracking-tight">
          {stats.totalAvailableHours.toFixed(0)}
          <span className="text-[16px] opacity-50">h</span>
        </div>
        <div className="nx-mlbl mt-1.5">Available capacity, from your weekly template</div>
      </div>
      <div className="nx-rule -mr-10" />
      <div>
        <div className={`nx-mono text-[30px] leading-none tracking-tight ${stats.overCeiling ? 'text-accent-300' : ''}`}>
          {Number.isFinite(stats.requiredRate) ? stats.requiredRate.toFixed(1) : '∞'}
          <span className="text-[16px] opacity-60">h/day</span>
        </div>
        <div className="nx-mlbl mt-1.5">
          Required rate — {stats.overCeiling ? 'above your ceiling' : 'comfortably under your ceiling'}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { activeGoal, activeGoalId, loading: goalLoading, createGoal, updateGoal } = useActiveGoal();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const wantsNewGoal = searchParams.get('newGoal') === '1';
  const [previewForm, setPreviewForm] = useState(null);

  const { summary, loading: summaryLoading, refetch: refetchSummary } = usePacingSummary(activeGoalId);
  const { availability } = useAvailability();
  const { blackoutDates } = useBlackoutDates();
  const { sessions } = useSessions({ goalId: activeGoalId });

  const today = todayLocalISO();
  const weekStart = addDaysISO(today, -6);
  const weeklyData = useWeeklyHoursData(sessions, today);
  const weeklyAvg = weeklyData.length ? weeklyData.reduce((s, d) => s + d.hours, 0) / weeklyData.length : 0;

  if (goalLoading) return <p className="text-muted-55 px-8 py-6">Loading…</p>;

  if (!activeGoal || wantsNewGoal) {
    return (
      <div>
        <PageHeader screenLabel="00 — First run" title="Set the target" meta="NO GOAL YET · DEFAULTS SHOWN" countdown="—" />
        <div className="grid grid-cols-[minmax(0,470px)_1fr] items-start gap-14 px-8 pb-8 pt-9">
          <div>
            <GoalForm
              submitLabel="Create goal"
              layout="stacked"
              onChange={setPreviewForm}
              onSubmit={async (payload) => {
                await createGoal(payload);
                setSearchParams({});
              }}
            />
            <p className="text-muted-55 m-0 mt-2.5 text-[12px] leading-relaxed">
              The ten CFA Level 1 topic areas are seeded automatically with default weights. You can change them in Settings.
            </p>
            {activeGoal && (
              <button onClick={() => setSearchParams({})} className="btn btn-ghost mt-3 text-[12.5px]">
                Cancel
              </button>
            )}
          </div>
          <div className="border-l border-divider pl-10">
            <div className="nx-mlbl mb-4">What this implies</div>
            {previewForm && <FirstRunPreview form={previewForm} availability={availability} />}
          </div>
        </div>
      </div>
    );
  }

  if (summaryLoading || !summary) return <p className="text-muted-55 px-8 py-6">Loading pacing…</p>;

  const goalPacing = summary.goal;
  const daysToExam = diffDaysISO(today, goalPacing.exam_date);

  const hoursToday = sessions.filter((s) => s.session_date === today).reduce((sum, s) => sum + s.minutes, 0) / 60;
  const hoursThisWeek =
    sessions
      .filter((s) => compareISODates(s.session_date, weekStart) >= 0 && compareISODates(s.session_date, today) <= 0)
      .reduce((sum, s) => sum + s.minutes, 0) / 60;

  const availabilityMap = {};
  for (const row of availability) availabilityMap[row.weekday] = row.available_hours;
  const blackoutSet = new Set(blackoutDates.map((b) => b.date));

  const weekAvailability = computeDailyAvailability({
    startDate: weekStart,
    endDate: today,
    availabilityMap,
    blackoutDates: blackoutSet
  });
  const availableToday = weekAvailability.find((d) => d.date === today)?.availableHours ?? 0;
  const availableThisWeek = sumAvailableHours(weekAvailability, weekStart, today);

  async function handleExtendExamDate(newExamDate) {
    await updateGoal(activeGoal.id, { exam_date: newExamDate });
    await refetchSummary();
  }

  async function handleCutTarget(reducedTargetHours) {
    await updateGoal(activeGoal.id, { total_target_hours: Number(reducedTargetHours.toFixed(1)) });
    await refetchSummary();
  }

  const metaLine = `EXAM ${goalPacing.exam_date} · START ${goalPacing.start_date} · TARGET ${goalPacing.total_target_hours}H · CEILING ${formatHours(
    goalPacing.max_daily_hours
  ).toUpperCase()}/DAY`;

  return (
    <div>
      <PageHeader
        screenLabel="01 — Dashboard"
        title="Am I on pace?"
        meta={metaLine}
        countdown={daysToExam}
        countdownAccent={goalPacing.offTrack}
      />
      <div className="px-8 pb-8 pt-5">
        <FirstRunBanner />

        {summary.weightSumWarning && (
          <div className="mb-5 rounded-sm border-l-2 border-accent-600 bg-[color-mix(in_srgb,var(--color-accent)_9%,transparent)] px-3 py-1.5 text-[12.5px] text-muted-80">
            Subject weights sum to {summary.weightSum.toFixed(1)}%, not 100%. Fix this in Settings.
          </div>
        )}

        <PaceVerdict goalPacing={goalPacing} />

        <div className="mt-6 grid grid-cols-6 divide-x divide-divider border-y border-divider">
          <KpiCard label="Today" value={formatHours(hoursToday).replace('h', '')} unit="h" sublabel={`of ${availableToday.toFixed(1)} avail`} />
          <KpiCard label="This week" value={formatHours(hoursThisWeek).replace('h', '')} unit="h" sublabel={`of ${availableThisWeek.toFixed(1)} avail`} />
          <KpiCard
            label="Logged"
            value={formatHours(goalPacing.actualToDateHours).replace('h', '')}
            unit="h"
            sublabel={`${((goalPacing.actualToDateHours / goalPacing.total_target_hours) * 100).toFixed(0)}% of target`}
          />
          <KpiCard
            label="Backlog"
            value={formatSignedHours(goalPacing.backlogHours)}
            tone={goalPacing.backlogStatus === 'behind' ? 'accent' : 'default'}
            sublabel={goalPacing.backlogStatus}
          />
          <KpiCard
            label="Required rate"
            value={Number.isFinite(goalPacing.requiredDailyRateHours) ? goalPacing.requiredDailyRateHours.toFixed(1) : '∞'}
            unit="h"
            tone={goalPacing.offTrack ? 'accent' : 'default'}
            sublabel={`max ${formatHours(goalPacing.max_daily_hours)}/day`}
          />
          <KpiCard
            label="Remaining"
            value={formatHours(goalPacing.remainingHoursNeeded).replace('h', '')}
            unit="h"
            sublabel={`${goalPacing.remainingAvailableDays} study days`}
          />
        </div>

        {goalPacing.offTrack && (
          <RemediationLevers
            goalPacing={goalPacing}
            onExtendExamDate={handleExtendExamDate}
            onCutTarget={handleCutTarget}
            onEditAvailability={() => navigate('/settings')}
          />
        )}

        <div className="mt-7 grid grid-cols-2 gap-8">
          <div>
            <div className="mb-3.5 flex items-baseline justify-between">
              <span className="nx-mlbl">Fig. 01 — planned vs actual, cumulative</span>
              <span className="nx-mono text-[10px] text-neutral-600">HOURS</span>
            </div>
            <PlannedVsActualChart
              goal={goalPacing}
              sessions={sessions}
              availabilityMap={availabilityMap}
              blackoutDates={blackoutSet}
              today={today}
            />
          </div>
          <div>
            <div className="mb-3.5 flex items-baseline justify-between">
              <span className="nx-mlbl">Fig. 02 — weekly hours, last 8 weeks</span>
              <span className="nx-mono text-[10px] text-neutral-600">AVG {weeklyAvg.toFixed(1)}H</span>
            </div>
            <WeeklyHoursChart sessions={sessions} today={today} />
          </div>
        </div>

        <div className="mt-7">
          <TopicBacklogTable subjects={summary.subjects} />
        </div>
      </div>
    </div>
  );
}
