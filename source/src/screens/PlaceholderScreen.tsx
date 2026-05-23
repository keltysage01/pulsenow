import { Menu } from 'lucide-react';
import { useState } from 'react';
import { HamburgerMenu } from '../components/nav/HamburgerMenu';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[var(--color-gold)]/30 bg-[var(--color-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-11 max-w-xl items-center gap-3 px-3">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-[var(--color-text)]">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-24 pt-[calc(env(safe-area-inset-top)+4.25rem)]">
        <section className="rounded-2xl border border-white/10 bg-[var(--color-card)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-primary)]">Session 1 Shell</p>
          <h2 className="mt-3 text-2xl font-black text-[var(--color-text)]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-sub)]">{description}</p>
        </section>
      </main>
    </>
  );
}
