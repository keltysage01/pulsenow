import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TodaysChallenge() {
  return (
    <section className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">Today&apos;s Challenge</p>
      <h2 className="mt-2 text-lg font-bold text-[var(--color-text)]">All-the-Timer is within reach.</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--color-sub)]">Log 13 more points this week to reach the top tier.</p>
      <Link to="/log" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-bold text-white">
        Finish strong
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
