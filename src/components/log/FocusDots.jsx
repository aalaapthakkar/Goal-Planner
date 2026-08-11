export default function FocusDots({ value, onChange, size = 11 }) {
  return (
    <div className="flex items-center gap-[5px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(value === n ? null : n)}
          className="rounded-full p-0"
          style={{
            width: size,
            height: size,
            background: value >= n ? 'var(--color-accent-500)' : 'transparent',
            border: value >= n ? 'none' : '1px solid var(--color-neutral-700)',
            cursor: onChange ? 'pointer' : 'default'
          }}
          aria-label={`Set focus ${n}`}
        />
      ))}
    </div>
  );
}
