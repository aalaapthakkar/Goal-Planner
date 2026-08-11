import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useBlackoutDates() {
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/blackout-dates');
      setBlackoutDates(data.blackoutDates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addBlackoutDate = useCallback(
    async (date, reason) => {
      await api.post('/blackout-dates', { date, reason });
      await refetch();
    },
    [refetch]
  );

  const removeBlackoutDate = useCallback(
    async (date) => {
      await api.del(`/blackout-dates/${date}`);
      await refetch();
    },
    [refetch]
  );

  return { blackoutDates, loading, error, refetch, addBlackoutDate, removeBlackoutDate };
}
