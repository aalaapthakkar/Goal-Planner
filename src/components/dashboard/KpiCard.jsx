export default function KpiCard({ label, value, unit, sublabel, tone = 'default' }) {
  return (
    <div className="px-4 py-[15px] first:pl-0 last:pr-0">
      <div className="nx-mlbl mb-2">{label}</div>
      <div className={`nx-mono text-[27px] leading-none tracking-tight ${tone === 'accent' ? 'text-accent' : 'text-text'}`}>
        {value}
        {unit && <span className="text-[14px] opacity-50">{unit}</span>}
      </div>
      {sublabel && <div className="nx-mono mt-1.5 text-[10.5px] text-neutral-600">{sublabel}</div>}
    </div>
  );
}
