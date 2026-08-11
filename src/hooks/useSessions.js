import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useSessions({ goalId, subjectId, from, to } = {}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (goalId) params.set('goal_id', goalId);
      if (subjectId) params.set('subject_id', subjectId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString();
      const data = await api.get(`/sessions${query ? `?${query}` : ''}`);
      setSessions(data.sessions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [goalId, subjectId, from, to]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSession = useCallback(
    async (payload) => {
      await api.post('/sessions', payload);
      await refetch();
    },
    [refetch]
  );

  const updateSession = useCallback(
    async (id, patch) => {
      await api.put(`/sessions/${id}`, patch);
      await refetch();
    },
    [refetch]
  );

  const deleteSession = useCallback(
    async (id) => {
      await api.del(`/sessions/${id}`);
      await refetch();
    },
    [refetch]
  );

  return { sessions, loading, error, refetch, createSession, updateSession, deleteSession };
}
