import { useNavigate } from 'react-router-dom';
import { useActiveGoal } from '../../context/ActiveGoalContext.jsx';

export default function GoalSwitcher() {
  const { goals, activeGoalId, switchGoal } = useActiveGoal();
  const navigate = useNavigate();

  function handleChange(e) {
    const value = e.target.value;
    if (value === '__new__') {
      navigate('/?newGoal=1');
      return;
    }
    switchGoal(Number(value));
  }

  return (
    <select
      value={activeGoalId ?? ''}
      onChange={handleChange}
      className="nx-mono w-full cursor-pointer border-0 bg-transparent p-0 text-[11px] text-neutral-500"
    >
      {goals.length === 0 && <option value="">No goals yet</option>}
      {goals.map((goal) => (
        <option key={goal.id} value={goal.id}>
          {goal.name}
        </option>
      ))}
      <option value="__new__">+ New goal…</option>
    </select>
  );
}
