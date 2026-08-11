import { NavLink } from 'react-router-dom';
import GoalSwitcher from './GoalSwitcher.jsx';
import { useActiveGoal } from '../../context/ActiveGoalContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', num: '01', end: true },
  { to: '/calendar', label: 'Calendar', num: '02', end: false },
  { to: '/log', label: 'Log', num: '03', end: false },
  { to: '/notes', label: 'Notes', num: '04', end: false },
  { to: '/settings', label: 'Settings', num: '05', end: false }
];

export default function NavBar() {
  const { activeGoal } = useActiveGoal();

  return (
    <aside className="flex w-[186px] flex-none flex-col border-r border-divider py-5">
      <div className="px-4 pb-[22px]">
        <div className="nx-mlbl mb-1.5">Study planner</div>
        <div className="font-heading text-[17px] font-medium leading-tight">CFA Level 1</div>
      </div>
      <nav className="flex flex-col">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nx-nav${isActive ? ' active' : ''}`}
          >
            <span className="nx-mono text-[10px] opacity-55">{link.num}</span>
            <span className="text-[13.5px]">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-4">
        <div className="nx-rule mb-3.5" />
        <div className="nx-mlbl mb-1.5">Active goal</div>
        <div className="mb-1 truncate text-[13px] leading-snug" title={activeGoal?.name}>
          {activeGoal?.name ?? 'No goal yet'}
        </div>
        <GoalSwitcher />
      </div>
    </aside>
  );
}
