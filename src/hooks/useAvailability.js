import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useAvailability() {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/availability');
      setAvailability(data.availability);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const saveAvailability = useCallback(
    async (rows) => {
      await api.put('/availability', rows);
      await refetch();
    },
    [refetch]
  );

  return { availability, loading, error, refetch, saveAvailability };
}
