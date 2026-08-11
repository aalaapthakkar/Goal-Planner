export default function PageHeader({ screenLabel, title, meta, countdown, countdownLabel = 'Days to exam', countdownAccent = false }) {
  return (
    <header className="px-8 pt-[22px]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="nx-mlbl mb-2">{screenLabel}</div>
          <h1 className="text-[27px] leading-tight tracking-tight">{title}</h1>
          {meta && <div className="nx-mono mt-2 text-[11px] tracking-wide text-neutral-500">{meta}</div>}
        </div>
        {countdown !== undefined && countdown !== null && (
          <div className="flex-none text-right">
            <div className={`nx-mono text-[36px] leading-none tracking-tight ${countdownAccent ? 'text-accent' : 'text-text'}`}>
              {countdown}
            </div>
            <div className="nx-mlbl mt-1.5">{countdownLabel}</div>
          </div>
        )}
      </div>
      <div className="nx-rule -mx-8 mt-5" />
    </header>
  );
}
