import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Plain React Context, not a state library -- holds which goal is "active" so every screen
// reads/writes the same goal without prop-drilling an id everywhere.
const ActiveGoalContext = createContext(null);

export function ActiveGoalProvider({ children }) {
  const [goals, setGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ goals: goalList }, { goal }] = await Promise.all([
        api.get('/goals'),
        api.get('/goals/active')
      ]);
      setGoals(goalList);
      setActiveGoal(goal);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchGoal = useCallback(
    async (goalId) => {
      const { goal } = await api.put('/goals/active', { goal_id: goalId });
      setActiveGoal(goal);
    },
    []
  );

  const createGoal = useCallback(
    async (payload) => {
      const { goal } = await api.post('/goals', payload);
      await api.put('/goals/active', { goal_id: goal.id });
      await refresh();
      return goal;
    },
    [refresh]
  );

  const deleteGoal = useCallback(
    async (goalId) => {
      await api.del(`/goals/${goalId}`);
      await refresh();
    },
    [refresh]
  );

  const updateGoal = useCallback(
    async (goalId, patch) => {
      await api.put(`/goals/${goalId}`, patch);
      await refresh();
    },
    [refresh]
  );

  const value = {
    goals,
    activeGoal,
    activeGoalId: activeGoal?.id ?? null,
    loading,
    error,
    refresh,
    switchGoal,
    createGoal,
    deleteGoal,
    updateGoal
  };

  return <ActiveGoalContext.Provider value={value}>{children}</ActiveGoalContext.Provider>;
}

export function useActiveGoal() {
  const ctx = useContext(ActiveGoalContext);
  if (!ctx) throw new Error('useActiveGoal must be used within ActiveGoalProvider');
  return ctx;
}
