import { formatHours, formatSignedHours } from '../../utils/formatters.js';

function buildNote(goalPacing) {
  const { offTrack, requiredDailyRateHours, backlogHours, backlogStatus, exam_date, max_daily_hours } = goalPacing;
  const rate = formatHours(requiredDailyRateHours);
  const max = formatHours(max_daily_hours);

  if (offTrack) {
    return `You need ${rate}/day to finish by ${exam_date}, above your ${max} ceiling. Three levers below.`;
  }
  if (backlogStatus === 'behind') {
    return `You are ${formatHours(backlogHours)} behind the hour-weighted plan, but ${rate}/day clears the target — well under your ${max} ceiling.`;
  }
  if (backlogStatus === 'ahead') {
    return `You are ${formatHours(Math.abs(backlogHours))} ahead of the hour-weighted plan. ${rate}/day clears the rest, under your ${max} ceiling.`;
  }
  return `Right on the hour-weighted plan. ${rate}/day clears the rest, under your ${max} ceiling.`;
}

export default function PaceVerdict({ goalPacing }) {
  const total = goalPacing.total_target_hours;
  const actualPct = total > 0 ? Math.min(100, (goalPacing.actualToDateHours / total) * 100) : 0;
  const plannedPct = total > 0 ? Math.min(100, (goalPacing.plannedToDateHours / total) * 100) : 0;

  if (goalPacing.isDegenerate) {
    return (
      <div className="grid grid-cols-[1fr_300px] items-start gap-8">
        <div />
        <div className="border-l border-divider pl-6">
          <div className="nx-mlbl mb-2">Pace verdict</div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_4px_rgba(145,132,217,0.28)]" />
            <span className="font-heading text-[19px] text-accent">Fix the dates</span>
          </div>
          <p className="m-0 text-[12.5px] leading-relaxed text-muted-65">
            This goal's start date is after its exam date. Fix the dates in Settings before pacing numbers mean anything.
          </p>
        </div>
      </div>
    );
  }

  const verdict = goalPacing.offTrack ? 'Off pace' : 'On pace';
  const verdictColor = goalPacing.offTrack ? 'text-accent' : 'text-text';

  return (
    <div className="grid grid-cols-[1fr_300px] items-start gap-8">
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="nx-mlbl">Target progress</span>
          <span className="nx-mono text-[11px] text-neutral-500">
            {formatHours(goalPacing.actualToDateHours)} / {formatHours(total)}
          </span>
        </div>
        <div className="relative h-[34px] overflow-hidden rounded-sm bg-neutral-900">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${actualPct}%`, background: 'linear-gradient(90deg,var(--color-accent-700),var(--color-accent-500))' }}
          />
          <div className="absolute inset-y-0 w-px bg-accent-200" style={{ left: `${plannedPct}%` }} />
        </div>
        <div className="relative mt-1.5 h-5">
          <span className="nx-mono absolute left-0 text-[10.5px] text-neutral-500">0h</span>
          <span
            className="nx-mono absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] text-accent-300"
            style={{ left: `${plannedPct}%` }}
          >
            plan {formatHours(goalPacing.plannedToDateHours)}
          </span>
          <span className="nx-mono absolute right-0 text-[10.5px] text-neutral-500">{formatHours(total)}</span>
        </div>
      </div>
      <div className="border-l border-divider pl-6">
        <div className="nx-mlbl mb-2">Pace verdict</div>
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className={`h-[7px] w-[7px] rounded-full ${goalPacing.offTrack ? 'bg-accent' : 'bg-text'}`}
            style={{ boxShadow: `0 0 0 4px ${goalPacing.offTrack ? 'color-mix(in srgb, var(--color-accent) 28%, transparent)' : 'color-mix(in srgb, var(--color-text) 14%, transparent)'}` }}
          />
          <span className={`font-heading text-[19px] ${verdictColor}`}>{verdict}</span>
        </div>
        <p className="m-0 text-[12.5px] leading-relaxed text-muted-65">{buildNote(goalPacing)}</p>
      </div>
    </div>
  );
}
