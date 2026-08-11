import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useNotes } from '../hooks/useNotes.js';
import { useActiveGoal } from '../context/ActiveGoalContext.jsx';
import StickyNote from '../components/notes/StickyNote.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import { todayLocalISO, diffDaysISO } from '../../server/lib/dateUtils.js';

export default function NotesPage() {
  const { notes, createNote, updateNote, deleteNote } = useNotes();
  const { activeGoal } = useActiveGoal();
  const [justCreatedId, setJustCreatedId] = useState(null);

  async function handleAddNote() {
    const posX = 40 + (notes.length % 8) * 24;
    const posY = 40 + (notes.length % 8) * 24;
    const rotation = Math.random() * 10 - 5;
    const note = await createNote({ pos_x: posX, pos_y: posY, rotation, color: 'yellow' });
    setJustCreatedId(note.id);
  }

  function bringToFront(id) {
    const nextZ = Math.max(0, ...notes.map((n) => n.z_index)) + 1;
    return updateNote(id, { z_index: nextZ });
  }

  const lastEdited = notes.length
    ? notes.reduce((latest, n) => (n.updated_at > latest ? n.updated_at : latest), notes[0].updated_at)
    : null;
  const daysToExam = activeGoal ? diffDaysISO(todayLocalISO(), activeGoal.exam_date) : null;

  return (
    <div>
      <PageHeader
        screenLabel="04 — Notes"
        title="Notes"
        meta={`${notes.length} NOTE${notes.length === 1 ? '' : 'S'}${lastEdited ? ` · LAST EDITED ${lastEdited.slice(0, 10)}` : ''}`}
        countdown={daysToExam}
      />
      <div className="px-8 pb-8 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="nx-mlbl">
            {notes.length} note{notes.length === 1 ? '' : 's'} · drag to arrange
          </span>
          <button onClick={handleAddNote} className="btn btn-primary">
            <Plus size={14} />
            Add note
          </button>
        </div>

        <div
          className="relative h-[calc(100vh-260px)] min-h-[420px] overflow-auto rounded-md border border-divider"
          style={{
            background:
              'linear-gradient(var(--color-divider) 1px, transparent 1px) 0 0/100% 48px, linear-gradient(90deg, var(--color-divider) 1px, transparent 1px) 0 0/48px 100%, var(--color-neutral-900)'
          }}
        >
          <div className="relative" style={{ width: 2400, height: 1600 }}>
            {notes.map((note, i) => (
              <StickyNote
                key={note.id}
                note={note}
                index={i}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onBringToFront={bringToFront}
                isJustCreated={note.id === justCreatedId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
