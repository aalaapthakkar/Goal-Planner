import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';

const COLOR_HEX = {
  yellow: '#d7b56d',
  pink: '#d98bb0',
  green: '#8fbf8a',
  blue: '#7ea6d9',
  orange: '#d99566',
  purple: '#9184d9'
};

const COLOR_KEYS = Object.keys(COLOR_HEX);

export default function StickyNote({ note, index, onUpdate, onDelete, onBringToFront, isJustCreated }) {
  const [draft, setDraft] = useState(note.content);
  const [isEditingText, setIsEditingText] = useState(false);
  const [dragOrigin, setDragOrigin] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isEditingText) setDraft(note.content);
  }, [note.content, isEditingText]);

  useEffect(() => {
    if (isJustCreated) textareaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePointerDown(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onBringToFront(note.id);
    setDragOrigin({ pointerX: e.clientX, pointerY: e.clientY, startX: note.pos_x, startY: note.pos_y });
  }

  function handlePointerMove(e) {
    if (!dragOrigin) return;
    setDragPos({
      pos_x: dragOrigin.startX + (e.clientX - dragOrigin.pointerX),
      pos_y: dragOrigin.startY + (e.clientY - dragOrigin.pointerY)
    });
  }

  async function handlePointerUp() {
    if (!dragOrigin) return;
    const final = dragPos ?? { pos_x: note.pos_x, pos_y: note.pos_y };
    setDragOrigin(null);
    setDragPos(null);
    await onUpdate(note.id, final);
  }

  async function handleBlur() {
    setIsEditingText(false);
    if (draft !== note.content) {
      await onUpdate(note.id, { content: draft });
    }
  }

  const displayX = dragPos ? dragPos.pos_x : note.pos_x;
  const displayY = dragPos ? dragPos.pos_y : note.pos_y;
  const color = COLOR_HEX[note.color] ?? COLOR_HEX.yellow;

  return (
    <div
      className="nx-note group"
      style={{
        left: displayX,
        top: displayY,
        zIndex: note.z_index,
        transform: `rotate(${note.rotation}deg)`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="mb-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <span className="nx-mono text-[9.5px] tracking-[0.14em]" style={{ color }}>
          N—{String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-[5px]">
            {COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onUpdate(note.id, { color: key })}
                className="h-[9px] w-[9px] rounded-full p-0"
                style={{
                  background: COLOR_HEX[key],
                  boxShadow: note.color === key ? '0 0 0 2px var(--color-neutral-700)' : 'none'
                }}
                aria-label={`Set color ${key}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => onDelete(note.id)} className="nx-ib h-[20px] w-[20px] border-0" aria-label="Delete note">
            <X size={11} />
          </button>
        </div>
      </div>
      <div className="mb-2.5 h-[2px]" style={{ background: color }} />
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setIsEditingText(true)}
        onBlur={handleBlur}
        placeholder="Write a note…"
        className="h-[104px] w-full resize-none border-none bg-transparent text-[13px] leading-relaxed text-text placeholder:text-neutral-600 focus:outline-none"
      />
      <div className="nx-mono mt-1 text-[9.5px] text-neutral-600">{note.created_at?.slice(0, 10)}</div>
    </div>
  );
}
