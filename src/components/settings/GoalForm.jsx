import { useEffect, useState } from 'react';

const emptyGoal = {
  name: '',
  start_date: '',
  exam_date: '',
  total_target_hours: '',
  max_daily_hours: 6
};

export default function GoalForm({ initialGoal, onSubmit, onChange, submitLabel = 'Save', layout = 'stacked' }) {
  const [form, setForm] = useState(() => ({
    name: initialGoal?.name ?? emptyGoal.name,
    start_date: initialGoal?.start_date ?? emptyGoal.start_date,
    exam_date: initialGoal?.exam_date ?? emptyGoal.exam_date,
    total_target_hours: initialGoal?.total_target_hours ?? emptyGoal.total_target_hours,
    max_daily_hours: initialGoal?.max_daily_hours ?? emptyGoal.max_daily_hours
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    onChange?.(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name,
        start_date: form.start_date,
        exam_date: form.exam_date,
        total_target_hours: Number(form.total_target_hours),
        max_daily_hours: Number(form.max_daily_hours)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="field">
        <label>Goal name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          className="input"
          placeholder="CFA Level 1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="field">
          <label>Start date</label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            className="input nx-mono"
          />
        </div>
        <div className="field">
          <label>Exam date</label>
          <input
            type="date"
            required
            value={form.exam_date}
            onChange={(e) => update('exam_date', e.target.value)}
            className="input nx-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="field">
          <label>Total target hours</label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={form.total_target_hours}
            onChange={(e) => update('total_target_hours', e.target.value)}
            className="input nx-mono"
          />
        </div>
        <div className="field">
          <label>Max hours per day</label>
          <input
            type="number"
            required
            min="0.5"
            step="0.5"
            value={form.max_daily_hours}
            onChange={(e) => update('max_daily_hours', e.target.value)}
            className="input nx-mono"
          />
        </div>
      </div>
      {error && <p className="m-0 text-[12.5px] text-accent-300">{error}</p>}
      {layout === 'stacked' ? (
        <button type="submit" disabled={submitting} className="btn btn-primary btn-block mt-1">
          {submitting ? 'Saving…' : submitLabel}
        </button>
      ) : (
        <button type="submit" disabled={submitting} className="btn btn-primary mt-1 self-start">
          {submitting ? 'Saving…' : submitLabel}
        </button>
      )}
    </form>
  );
}
