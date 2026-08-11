import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import FocusDots from '../log/FocusDots.jsx';

function SessionRow({ session, subjects, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    subject_id: session.subject_id,
    minutes: session.minutes,
    focus_rating: session.focus_rating ?? null,
    notes: session.notes ?? ''
  });

  const subjectName = subjects.find((s) => s.id === session.subject_id)?.name ?? 'Unknown subject';

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-md border border-divider px-3 py-2 text-[13px]">
        <div>
          <p className="m-0 text-text">{subjectName}</p>
          <p className="text-muted-55 nx-mono m-0 mt-0.5 text-[11.5px]">
            {(session.minutes / 60).toFixed(1)}h
            {session.focus_rating ? ` · focus ${session.focus_rating}/5` : ''}
            {session.notes ? ` · ${session.notes}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setEditing(true)} className="btn btn-ghost text-[12px]">
            Edit
          </button>
          <button onClick={() => onDelete(session.id)} className="btn btn-danger-ghost text-[12px]">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-accent-700 bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] p-3 text-[13px]">
      <select
        value={form.subject_id}
        onChange={(e) => setForm((f) => ({ ...f, subject_id: Number(e.target.value) }))}
        className="input"
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="1"
          value={form.minutes}
          onChange={(e) => setForm((f) => ({ ...f, minutes: Number(e.target.value) }))}
          className="input nx-mono w-24"
        />
        <FocusDots value={form.focus_rating} onChange={(v) => setForm((f) => ({ ...f, focus_rating: v }))} />
      </div>
      <input
        type="text"
        placeholder="notes"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        className="input"
      />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await onUpdate(session.id, {
              subject_id: form.subject_id,
              minutes: form.minutes,
              focus_rating: form.focus_rating,
              notes: form.notes || null
            });
            setEditing(false);
          }}
          className="btn btn-primary text-[12.5px]"
        >
          Save
        </button>
        <button onClick={() => setEditing(false)} className="btn btn-secondary text-[12.5px]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function DaySessionsModal({ date, subjects, sessions, onClose, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState({
    subject_id: subjects[0]?.id ?? '',
    minutes: 60,
    focus_rating: null,
    notes: ''
  });

  async function handleAdd(e) {
    e.preventDefault();
    await onCreate({
      subject_id: Number(form.subject_id),
      session_date: date,
      minutes: Number(form.minutes),
      focus_rating: form.focus_rating,
      notes: form.notes || null
    });
    setForm((f) => ({ ...f, minutes: 60, focus_rating: null, notes: '' }));
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="nx-mono text-[17px]">{date}</h2>
          <button onClick={onClose} className="nx-ib border-0" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {sessions.length === 0 && <p className="text-muted-55 text-[13px]">No sessions logged.</p>}
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} subjects={subjects} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex flex-col gap-2.5 border-t border-divider pt-4">
          <p className="nx-mlbl m-0">Add a session</p>
          <select
            value={form.subject_id}
            onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
            className="input"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={form.minutes}
              onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
              className="input nx-mono w-24"
              placeholder="minutes"
            />
            <FocusDots value={form.focus_rating} onChange={(v) => setForm((f) => ({ ...f, focus_rating: v }))} />
          </div>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="input"
            placeholder="notes (optional)"
          />
          <button type="submit" className="btn btn-primary self-start text-[13px]">
            Add session
          </button>
        </form>
      </div>
    </div>
  );
}
