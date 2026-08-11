import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function usePacingSummary(goalId) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!goalId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/pacing/summary?goal_id=${goalId}`);
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summary, loading, error, refetch };
}
