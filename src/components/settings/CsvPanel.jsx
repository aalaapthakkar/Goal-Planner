import { useState } from 'react';
import { DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { api } from '../../api/client.js';

function CsvColumn({ label, cols, exportHref, importPath, onDone, edge }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const response = await api.postCsv(importPath, text);
      setResult(response);
      onDone?.();
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className={`p-3.5${edge ? ' border-l border-divider' : ''}`}>
      <div className="mb-1 text-[13px]">{label}</div>
      <div className="nx-mono mb-2.5 text-[10px] text-neutral-600">{cols}</div>
      <div className="flex gap-2">
        <a href={exportHref} className="btn btn-secondary text-[12px]" style={{ padding: '4px 9px' }}>
          <DownloadSimple size={13} />
          Export
        </a>
        <label className="btn btn-ghost cursor-pointer text-[12px]" style={{ padding: '4px 6px' }}>
          <UploadSimple size={13} />
          {busy ? 'Importing…' : 'Import'}
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" disabled={busy} />
        </label>
      </div>
      {result && !result.error && (
        <p className="text-muted-55 m-0 mt-2 text-[11px]">
          Imported {result.imported ?? 0}, updated {result.updated ?? 0}
          {result.skipped?.length ? `, skipped ${result.skipped.length} (see console)` : ''}.
        </p>
      )}
      {result?.skipped?.length > 0 && console.warn(`${label} import skipped rows:`, result.skipped)}
      {result?.error && <p className="m-0 mt-2 text-[11px] text-accent-300">{result.error}</p>}
    </div>
  );
}

export default function CsvPanel({ goalId, onImported }) {
  const datasets = [
    {
      label: 'Sessions',
      cols: 'ID · TOPIC · DATE · MIN · FOCUS',
      exportHref: `/api/export/sessions.csv?goal_id=${goalId}`,
      importPath: `/import/sessions?goal_id=${goalId}`
    },
    {
      label: 'Subjects (weights)',
      cols: 'NAME · WEIGHT% · OVERRIDE',
      exportHref: `/api/export/subjects.csv?goal_id=${goalId}`,
      importPath: `/import/subjects?goal_id=${goalId}`
    },
    {
      label: 'Goal settings',
      cols: 'NAME · DATES · TARGET · MAX',
      exportHref: `/api/export/goal.csv?goal_id=${goalId}`,
      importPath: `/import/goal?goal_id=${goalId}`
    },
    {
      label: 'Availability',
      cols: 'WEEKDAY · HOURS',
      exportHref: '/api/export/availability.csv',
      importPath: '/import/availability'
    },
    {
      label: 'Blackout dates',
      cols: 'DATE · REASON',
      exportHref: '/api/export/blackout-dates.csv',
      importPath: '/import/blackout-dates'
    }
  ];

  return (
    <div className="grid grid-cols-5 overflow-hidden rounded-md border border-divider">
      {datasets.map((d, i) => (
        <CsvColumn key={d.label} {...d} edge={i > 0} onDone={onImported} />
      ))}
    </div>
  );
}
