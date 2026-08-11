import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { api } from '../../api/client.js';

export default function FirstRunBanner() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    api.get('/meta').then(setMeta).catch(() => {});
  }, []);

  if (!meta || meta.weightsBannerDismissed) return null;

  async function dismiss() {
    await api.post('/meta/dismiss-weights-banner', {});
    setMeta((m) => ({ ...m, weightsBannerDismissed: true }));
  }

  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-sm border-l-2 border-accent-600 bg-[color-mix(in_srgb,var(--color-accent)_9%,transparent)] px-3 py-1.5">
      <span className="nx-mlbl text-accent-300">Check</span>
      <span className="text-muted-80 text-[12.5px]">Seeded CFA topic weights are a default — verify against the current curriculum.</span>
      <Link to="/settings" className="ml-auto text-[12px] no-underline">
        Verify
      </Link>
      <button type="button" onClick={dismiss} className="nx-ib h-[22px] w-[22px] border-0" aria-label="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
}
