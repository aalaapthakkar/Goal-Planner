import { useState } from 'react';

export default function BlackoutDateManager({ blackoutDates, onAdd, onRemove }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!date) return;
    await onAdd(date, reason || null);
    setDate('');
    setReason('');
  }

  return (
    <div className="flex flex-col">
      {blackoutDates.length === 0 && <p className="text-muted-55 m-0 pb-2 text-[12.5px]">None yet.</p>}
      {blackoutDates.map((b) => (
        <div key={b.date} className="flex items-center gap-3 border-b border-divider py-2">
          <span className="nx-mono text-[12.5px]">{b.date}</span>
          {b.reason && <span className="text-muted-55 text-[12.5px]">{b.reason}</span>}
          <button onClick={() => onRemove(b.date)} className="btn btn-danger-ghost ml-auto text-[12px]">
            Remove
          </button>
        </div>
      ))}
      <form onSubmit={handleAdd} className="mt-3.5 flex gap-2.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input nx-mono" style={{ width: 150 }} />
        <input
          type="text"
          placeholder="reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input flex-1"
        />
        <button type="submit" className="btn btn-secondary">
          Add
        </button>
      </form>
    </div>
  );
}
