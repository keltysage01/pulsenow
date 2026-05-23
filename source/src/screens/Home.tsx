import { Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import { PowerListPreview } from '../components/home/PowerListPreview';
import { TodaysChallenge } from '../components/home/TodaysChallenge';
import { TodaysStandings } from '../components/home/TodaysStandings';
import { VisionBoard } from '../components/home/VisionBoard';
import { WeeklyGoals } from '../components/home/WeeklyGoals';
import { HamburgerMenu } from '../components/nav/HamburgerMenu';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { dayOfYear } from '../lib/dates';

const quotes = [
  { q: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { q: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', a: 'Winston Churchill' },
  { q: "Opportunities don't happen. You create them.", a: 'Chris Grosser' },
  { q: 'Money is usually attracted, not pursued.', a: 'Jim Rohn' },
  { q: "You don't get paid for the hour. You get paid for the value you bring to the hour.", a: 'Jim Rohn' },
  { q: 'The way to get started is to quit talking and begin doing.', a: 'Walt Disney' },
  { q: 'Success usually comes to those who are too busy to be looking for it.', a: 'Henry David Thoreau' },
  { q: 'If you really look closely, most overnight successes took a long time.', a: 'Steve Jobs' },
  { q: 'The successful warrior is the average man with laser-like focus.', a: 'Bruce Lee' },
  { q: "You miss 100% of the shots you don't take.", a: 'Wayne Gretzky' },
];

export function Home() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const quote = quotes[dayOfYear() % quotes.length];

  return (
    <>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[var(--color-gold)]/30 bg-[var(--color-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto grid h-11 max-w-xl grid-cols-[44px_1fr_44px] items-center px-3">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-center text-sm font-black uppercase tracking-[0.18em] text-[var(--color-text)]">{org.name}</div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 px-4 pb-24 pt-[calc(env(safe-area-inset-top)+4.25rem)]">
        <section className="flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-[var(--color-primary)] bg-[var(--color-card)] text-xl font-black">
            {user ? user.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-black text-[var(--color-text)]">{user ? user.name : 'Agent'}</h1>
              <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-1 text-xs font-black text-[var(--color-primary)]">{user ? user.level : 'TA'}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-sub)]">Streak: 0 · Contacts: 0 · Team: 0 licensed</p>
          </div>
        </section>

        <VisionBoard />
        <WeeklyGoals />

        <section className="rounded-2xl border border-white/10 bg-[var(--color-card)] p-4">
          <p className="text-base italic leading-7 text-[var(--color-text)]">&ldquo;{quote.q}&rdquo;</p>
          <p className="mt-3 text-right text-sm font-bold text-[var(--color-sub)]">{quote.a}</p>
        </section>

        <TodaysStandings />
        <TodaysChallenge />
        <PowerListPreview />
      </main>
    </>
  );
}
