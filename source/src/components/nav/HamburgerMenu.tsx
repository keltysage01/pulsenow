import { Bot, CalendarDays, ChartPie, Megaphone, Settings, UsersRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type HamburgerMenuProps = {
  open: boolean;
  onClose: () => void;
};

const menuItems = [
  { to: '/contacts', label: 'Contacts', icon: UsersRound },
  { to: '/coach', label: 'AI Coach', icon: Bot },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/history', label: 'History', icon: CalendarDays },
  { to: '/breakdown', label: 'Contact Breakdown', icon: ChartPie },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const { user, signOut } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/60" type="button" aria-label="Close menu" onClick={onClose} />
      <aside className="relative h-full w-[82vw] max-w-sm border-r border-white/10 bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-sub)]">Pulsenow</p>
            <p className="mt-1 text-lg font-bold text-[var(--color-text)]">{user ? user.name : 'Agent'}</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white/10" type="button" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-white/10">
                <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                {item.label}
              </Link>
            );
          })}
          {user && user.is_manager ? (
            <Link to="/manager" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--color-text)] hover:bg-white/10">
              <UsersRound className="h-5 w-5 text-[var(--color-primary)]" />
              Manager View
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          className="absolute inset-x-5 bottom-6 min-h-12 rounded-xl border border-white/10 text-sm font-bold text-[var(--color-text)]"
          onClick={() => {
            signOut();
            onClose();
          }}
        >
          Sign Out
        </button>
      </aside>
    </div>
  );
}
