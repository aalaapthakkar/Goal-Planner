import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/notes');
      setNotes(data.notes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createNote = useCallback(
    async (fields = {}) => {
      const data = await api.post('/notes', fields);
      await refetch();
      return data.note;
    },
    [refetch]
  );

  const updateNote = useCallback(
    async (id, patch) => {
      await api.put(`/notes/${id}`, patch);
      await refetch();
    },
    [refetch]
  );

  const deleteNote = useCallback(
    async (id) => {
      await api.del(`/notes/${id}`);
      await refetch();
    },
    [refetch]
  );

  return { notes, loading, error, refetch, createNote, updateNote, deleteNote };
}
