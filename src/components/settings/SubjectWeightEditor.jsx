import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';

const cellInputClass =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] text-text hover:border-divider focus-visible:border-accent';

function SubjectRow({ subject, index, onUpdate, onDelete }) {
  const [name, setName] = useState(subject.name);
  const [weightPct, setWeightPct] = useState(subject.weight_pct);
  const [override, setOverride] = useState(subject.target_hours_override ?? '');
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== subject.name ||
    Number(weightPct) !== subject.weight_pct ||
    (override === '' ? null : Number(override)) !== subject.target_hours_override;

  async function save() {
    setSaving(true);
    try {
      await onUpdate(subject.id, {
        name,
        weight_pct: Number(weightPct),
        target_hours_override: override === '' ? null : Number(override)
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!confirm(`Delete "${subject.name}" and all its logged sessions? This can't be undone.`)) return;
    onDelete(subject.id);
  }

  return (
    <tr>
      <td className="nx-mono text-[10.5px] text-neutral-600" style={{ paddingLeft: 0 }}>
        {String(index + 1).padStart(2, '0')}
      </td>
      <td>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={cellInputClass} />
      </td>
      <td style={{ textAlign: 'right' }}>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={weightPct}
          onChange={(e) => setWeightPct(e.target.value)}
          className={`nx-mono ${cellInputClass}`}
          style={{ textAlign: 'right' }}
        />
      </td>
      <td style={{ textAlign: 'right' }}>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="auto"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          className={`nx-mono ${cellInputClass}`}
          style={{ textAlign: 'right' }}
        />
      </td>
      <td className="nx-mono text-[12.5px] text-neutral-400" style={{ textAlign: 'right' }}>
        {subject.effective_target_hours?.toFixed(1)}h
      </td>
      <td className="whitespace-nowrap text-right" style={{ paddingRight: 0 }}>
        {dirty && (
          <button onClick={save} disabled={saving} className="btn btn-ghost mr-2 text-[12px]">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        <button onClick={handleDelete} className="btn btn-danger-ghost text-[12px]">
          Delete
        </button>
      </td>
    </tr>
  );
}

function AddSubjectForm({ onCreate }) {
  const [name, setName] = useState('');
  const [weightPct, setWeightPct] = useState('');
  const [override, setOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({
        name,
        weight_pct: weightPct === '' ? 0 : Number(weightPct),
        target_hours_override: override === '' ? null : Number(override)
      });
      setName('');
      setWeightPct('');
      setOverride('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3.5 flex flex-wrap items-end gap-2.5 border-t border-divider pt-3.5">
      <div className="field">
        <label>New topic</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" className="input" style={{ minWidth: '10rem' }} />
      </div>
      <div className="field">
        <label>Weight %</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={weightPct}
          onChange={(e) => setWeightPct(e.target.value)}
          className="input nx-mono"
          style={{ width: 90 }}
        />
      </div>
      <div className="field">
        <label>Override hours</label>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="auto"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          className="input nx-mono"
          style={{ width: 100 }}
        />
      </div>
      <button type="submit" disabled={submitting} className="btn btn-primary">
        <Plus size={14} />
        {submitting ? 'Adding…' : 'Add topic'}
      </button>
    </form>
  );
}

export default function SubjectWeightEditor({ subjects, weightSum, weightSumOk, onUpdate, onCreate, onDelete }) {
  return (
    <section>
      {subjects.length > 0 && (
        <table className="table" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: 38, paddingLeft: 0 }}></th>
              <th>Topic</th>
              <th style={{ width: 110, textAlign: 'right' }}>Weight %</th>
              <th style={{ width: 130, textAlign: 'right' }}>Override hours</th>
              <th style={{ width: 120, textAlign: 'right' }}>Effective target</th>
              <th style={{ width: 130, paddingRight: 0 }}></th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, i) => (
              <SubjectRow key={subject.id} subject={subject} index={i} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      )}
      {subjects.length === 0 && <p className="text-muted-55 text-[13px]">No topics yet for this goal.</p>}
      <AddSubjectForm onCreate={onCreate} />
    </section>
  );
}
