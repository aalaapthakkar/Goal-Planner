import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { todayLocalISO } from '../../../server/lib/dateUtils.js';
import FocusDots from './FocusDots.jsx';

export default function SessionForm({ subjects, onSubmit }) {
  const [form, setForm] = useState({
    subject_id: subjects[0]?.id ?? '',
    session_date: todayLocalISO(),
    minutes: 60,
    focus_rating: null,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        subject_id: Number(form.subject_id),
        session_date: form.session_date,
        minutes: Number(form.minutes),
        focus_rating: form.focus_rating,
        notes: form.notes || null
      });
      setForm((f) => ({ ...f, minutes: 60, focus_rating: null, notes: '' }));
    } finally {
      setSubmitting(false);
    }
  }

  const cellClass = 'p-3 border-l border-divider';

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid overflow-hidden rounded-md border border-divider"
      style={{ gridTemplateColumns: '1.6fr 1fr 0.8fr 0.9fr 2fr auto' }}
    >
      <div className="p-3">
        <label className="nx-mlbl mb-1.5 block">Topic</label>
        <select
          value={form.subject_id}
          onChange={(e) => update('subject_id', e.target.value)}
          className="w-full border-0 bg-transparent p-0 text-[14px] text-text"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={cellClass}>
        <label className="nx-mlbl mb-1.5 block">Date</label>
        <input
          type="date"
          value={form.session_date}
          onChange={(e) => update('session_date', e.target.value)}
          className="nx-mono w-full border-0 bg-transparent p-0 text-[13px] text-text"
        />
      </div>
      <div className={cellClass}>
        <label className="nx-mlbl mb-1.5 block">Minutes</label>
        <input
          type="number"
          min="1"
          value={form.minutes}
          onChange={(e) => update('minutes', e.target.value)}
          className="nx-mono w-full border-0 bg-transparent p-0 text-[14px] text-text"
        />
      </div>
      <div className={cellClass}>
        <label className="nx-mlbl mb-1.5 block">Focus</label>
        <div className="flex h-[22px] items-center">
          <FocusDots value={form.focus_rating} onChange={(v) => update('focus_rating', v)} />
        </div>
      </div>
      <div className={cellClass}>
        <label className="nx-mlbl mb-1.5 block">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="w-full border-0 bg-transparent p-0 text-[14px] text-text"
          placeholder="optional"
        />
      </div>
      <div className={`${cellClass} flex items-end`}>
        <button type="submit" disabled={submitting || !form.subject_id} className="btn btn-primary">
          <Plus size={14} />
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}
