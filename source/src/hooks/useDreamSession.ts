import { useEffect, useState } from 'react';
import { type DreamBundle, getDreamSession } from '../lib/dreamApi';

const DONE_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function useDreamSession(sessionId: string | null, enabled: boolean) {
  const [bundle, setBundle] = useState<DreamBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function refresh() {
      if (!sessionId || !enabled) return;
      setLoading(true);
      try {
        const next = await getDreamSession(sessionId);
        if (cancelled) return;
        setBundle(next);
        setError('');
        if (next.session && !DONE_STATUSES.has(next.session.status)) {
          timer = window.setTimeout(refresh, 3500);
        }
      } catch (refreshError) {
        if (!cancelled) setError(refreshError instanceof Error ? refreshError.message : 'Could not load dream session.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, sessionId]);

  return { bundle, loading, error, setBundle };
}
