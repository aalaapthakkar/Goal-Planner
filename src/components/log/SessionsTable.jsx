import { useState } from 'react';
import FocusDots from './FocusDots.jsx';

const cellInputClass =
  'w-full rounded border border-transparent bg-transparent px-1 py-1 text-[13px] text-text hover:border-divider focus-visible:border-accent';

function SessionTableRow({ session, subjects, index, onUpdate, onDelete }) {
  const [form, setForm] = useState({
    subject_id: session.subject_id,
    session_date: session.session_date,
    minutes: session.minutes,
    focus_rating: session.focus_rating ?? null,
    notes: session.notes ?? ''
  });
  const [saving, setSaving] = useState(false);

  const dirty =
    form.subject_id !== session.subject_id ||
    form.session_date !== session.session_date ||
    Number(form.minutes) !== session.minutes ||
    form.focus_rating !== session.focus_rating ||
    (form.notes || null) !== session.notes;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await onUpdate(session.id, {
        subject_id: Number(form.subject_id),
        session_date: form.session_date,
        minutes: Number(form.minutes),
        focus_rating: form.focus_rating,
        notes: form.notes || null
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td className="nx-mono text-[10.5px] text-neutral-600" style={{ paddingLeft: 0 }}>
        {String(index).padStart(2, '0')}
      </td>
      <td>
        <input
          type="date"
          value={form.session_date}
          onChange={(e) => update('session_date', e.target.value)}
          className={`nx-mono ${cellInputClass}`}
        />
      </td>
      <td>
        <select value={form.subject_id} onChange={(e) => update('subject_id', e.target.value)} className={cellInputClass}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          min="1"
          value={form.minutes}
          onChange={(e) => update('minutes', e.target.value)}
          className={`nx-mono ${cellInputClass} text-right`}
          style={{ textAlign: 'right' }}
        />
      </td>
      <td>
        <FocusDots value={form.focus_rating} onChange={(v) => update('focus_rating', v)} size={9} />
      </td>
      <td>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className={cellInputClass}
        />
      </td>
      <td className="whitespace-nowrap text-right" style={{ paddingRight: 0 }}>
        {dirty && (
          <button onClick={save} disabled={saving} className="btn btn-ghost mr-2 text-[12px]">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        <button onClick={() => onDelete(session.id)} className="btn btn-danger-ghost text-[12px]">
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function SessionsTable({ sessions, subjects, onUpdate, onDelete }) {
  return (
    <table className="table" style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th style={{ width: 38, paddingLeft: 0 }}></th>
          <th style={{ width: 130 }}>Date</th>
          <th>Topic</th>
          <th style={{ width: 90, textAlign: 'right' }}>Minutes</th>
          <th style={{ width: 110 }}>Focus</th>
          <th>Note</th>
          <th style={{ width: 110, paddingRight: 0 }}></th>
        </tr>
      </thead>
      <tbody>
        {sessions.length === 0 && (
          <tr>
            <td colSpan={7} className="text-muted-55 py-4 text-center">
              No sessions logged yet.
            </td>
          </tr>
        )}
        {sessions.map((session, i) => (
          <SessionTableRow
            key={session.id}
            session={session}
            subjects={subjects}
            index={sessions.length - i}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
}
