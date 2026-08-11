import { formatHours } from '../../utils/formatters.js';
import { diffDaysISO } from '../../../server/lib/dateUtils.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RemediationLevers({ goalPacing, onExtendExamDate, onEditAvailability, onCutTarget }) {
  const { remediation } = goalPacing;
  if (!remediation) return null;

  const { extendExamDate, raiseAvailability, cutTarget } = remediation;
  const extendDays = extendExamDate ? diffDaysISO(goalPacing.exam_date, extendExamDate.newExamDate) : null;

  return (
    <div className="mt-6 rounded-md bg-surface p-5 shadow-sm">
      <div className="mb-3.5 flex items-baseline gap-3">
        <span className="nx-mlbl text-accent-300">What would it take</span>
        <span className="text-muted-65 text-[12.5px]">Three levers, each computed from your current calendar.</span>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="border-r border-divider pr-5">
          <div className="nx-mlbl mb-2">Lever 01 · move the date</div>
          {extendExamDate ? (
            <>
              <div className="nx-mono text-[20px] text-accent-300">{extendExamDate.newExamDate}</div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">
                Earliest exam date where the rate falls to {formatHours(extendExamDate.requiredDailyRateHours)}/day —{' '}
                {extendDays} day{extendDays === 1 ? '' : 's'} later.
              </p>
              <button type="button" className="btn btn-primary mt-3 text-[12.5px]" onClick={() => onExtendExamDate(extendExamDate.newExamDate)}>
                Extend exam date
              </button>
            </>
          ) : (
            <>
              <div className="nx-mono text-[20px] text-neutral-500">Not solvable</div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">
                No exam date within the search window brings the rate under your daily max.
              </p>
              <button type="button" className="btn btn-secondary mt-3 text-[12.5px]" disabled>
                Extend exam date
              </button>
            </>
          )}
        </div>

        <div className="border-r border-divider pr-5">
          <div className="nx-mlbl mb-2">Lever 02 · add capacity</div>
          {raiseAvailability?.feasible ? (
            <>
              <div className="nx-mono text-[20px] text-accent-300">
                {formatHours(raiseAvailability.resultingRequiredDailyRateHours)}/day
              </div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">
                {raiseAvailability.weekdaysToActivate.length === 0
                  ? 'Your current availability already covers enough study days.'
                  : `Activate ${raiseAvailability.weekdaysToActivate.map((w) => WEEKDAY_NAMES[w]).join(', ')} to gain ${raiseAvailability.daysGained} study day${raiseAvailability.daysGained === 1 ? '' : 's'}.`}
              </p>
              <button type="button" className="btn btn-primary mt-3 text-[12.5px]" onClick={onEditAvailability}>
                Edit availability
              </button>
            </>
          ) : (
            <>
              <div className="nx-mono text-[20px] text-neutral-500">Infeasible</div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">
                Every weekday already has hours, so no new study days can be activated.
              </p>
              <button type="button" className="btn btn-secondary mt-3 text-[12.5px]" disabled>
                Edit availability
              </button>
            </>
          )}
        </div>

        <div>
          <div className="nx-mlbl mb-2">Lever 03 · cut the target</div>
          {cutTarget && cutTarget.cutHours > 0 ? (
            <>
              <div className="nx-mono text-[20px] text-accent-300">-{formatHours(cutTarget.cutHours)}</div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">
                Drops the target to {formatHours(cutTarget.reducedTargetHours)}, which fits{' '}
                {formatHours(goalPacing.max_daily_hours)}/day exactly.
              </p>
              <button
                type="button"
                className="btn btn-primary mt-3 text-[12.5px]"
                onClick={() => onCutTarget(cutTarget.reducedTargetHours)}
              >
                Cut target
              </button>
            </>
          ) : (
            <>
              <div className="nx-mono text-[20px] text-neutral-500">No cut needed</div>
              <p className="text-muted-65 mt-2 text-[12px] leading-relaxed">The target is already achievable at your daily max.</p>
              <button type="button" className="btn btn-secondary mt-3 text-[12.5px]" disabled>
                Cut target
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
