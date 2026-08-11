import { formatHours } from '../../utils/formatters.js';

export default function TopicBacklogTable({ subjects }) {
  const sorted = [...subjects].sort((a, b) => b.remainingHoursNeeded - a.remainingHoursNeeded);
  const maxOwed = Math.max(1, ...sorted.map((s) => s.remainingHoursNeeded));
  const totalOwed = sorted.reduce((sum, s) => sum + s.remainingHoursNeeded, 0);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="nx-mlbl">Topics, ranked by hours still owed</span>
        <span className="nx-mono text-[10px] text-neutral-600">
          {sorted.length} TOPICS · {formatHours(totalOwed).toUpperCase()} OUTSTANDING
        </span>
      </div>
      <table className="table" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: 38, paddingLeft: 0 }}></th>
            <th>Topic</th>
            <th style={{ width: 74, textAlign: 'right' }}>Weight</th>
            <th style={{ width: 74, textAlign: 'right' }}>Target</th>
            <th style={{ width: 74, textAlign: 'right' }}>Logged</th>
            <th style={{ width: 190 }}>Owed</th>
            <th style={{ width: 74, textAlign: 'right', paddingRight: 0 }}>Rate</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((subject, i) => (
            <tr key={subject.id}>
              <td className="nx-mono text-[10.5px] text-neutral-600" style={{ paddingLeft: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className={`text-[13.5px] ${subject.offTrack ? 'text-accent-300' : ''}`}>{subject.name}</td>
              <td className="nx-mono text-[12px] text-neutral-500" style={{ textAlign: 'right' }}>
                {subject.weight_pct.toFixed(1)}%
              </td>
              <td className="nx-mono text-[12px] text-neutral-400" style={{ textAlign: 'right' }}>
                {formatHours(subject.targetHours)}
              </td>
              <td className="nx-mono text-[12px]" style={{ textAlign: 'right' }}>
                {formatHours(subject.actualToDateHours)}
              </td>
              <td>
                <div className="flex items-center gap-2.5">
                  <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-neutral-900">
                    <div
                      className="h-full bg-accent-600"
                      style={{ width: `${Math.round((subject.remainingHoursNeeded / maxOwed) * 100)}%` }}
                    />
                  </div>
                  <span className="nx-mono w-12 text-right text-[12px] text-accent-300">
                    +{subject.remainingHoursNeeded.toFixed(1)}
                  </span>
                </div>
              </td>
              <td className="nx-mono text-[12px] text-neutral-500" style={{ textAlign: 'right', paddingRight: 0 }}>
                {Number.isFinite(subject.requiredDailyRateHours) ? subject.requiredDailyRateHours.toFixed(2) : '∞'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
