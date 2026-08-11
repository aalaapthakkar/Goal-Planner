import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useSubjects(goalId) {
  const [subjects, setSubjects] = useState([]);
  const [weightSum, setWeightSum] = useState(0);
  const [weightSumOk, setWeightSumOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!goalId) {
      setSubjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/subjects?goal_id=${goalId}`);
      setSubjects(data.subjects);
      setWeightSum(data.weightSum);
      setWeightSumOk(data.weightSumOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateSubject = useCallback(
    async (id, patch) => {
      await api.put(`/subjects/${id}`, patch);
      await refetch();
    },
    [refetch]
  );

  const createSubject = useCallback(
    async (fields) => {
      await api.post('/subjects', { goal_id: goalId, ...fields });
      await refetch();
    },
    [refetch, goalId]
  );

  const deleteSubject = useCallback(
    async (id) => {
      await api.del(`/subjects/${id}`);
      await refetch();
    },
    [refetch]
  );

  return { subjects, weightSum, weightSumOk, loading, error, refetch, updateSubject, createSubject, deleteSubject };
}
