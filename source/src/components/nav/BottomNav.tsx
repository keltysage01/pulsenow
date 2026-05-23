import { ClipboardList, Grid2X2, Trophy, UserRound, Workflow } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/home', label: 'Home', icon: Grid2X2 },
  { to: '/log', label: 'Log', icon: ClipboardList },
  { to: '/board', label: 'Board', icon: Trophy },
  { to: '/pipeline/sales', label: 'Pipeline', icon: Workflow },
  { to: '/me', label: 'Me', icon: UserRound },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                'flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ' +
                (isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-sub)]')
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
