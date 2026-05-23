const rows = [
  { name: 'Sam', contacts: 28, appts: 3 },
  { name: 'Kaden', contacts: 22, appts: 2 },
  { name: 'Mia', contacts: 18, appts: 2 },
  { name: 'You', contacts: 12, appts: 1 },
];

export function TodaysStandings() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--color-card)] p-4">
      <h2 className="text-base font-bold text-[var(--color-text)]">Today&apos;s Standings</h2>
      <div className="mt-3 grid grid-cols-[1fr_72px_72px] gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-sub)]">
        <span>Agent</span>
        <span className="text-right">Contacts</span>
        <span className="text-right">1st Set</span>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.name} className={'grid grid-cols-[1fr_72px_72px] gap-2 rounded-xl px-3 py-2 text-sm ' + (row.name === 'You' ? 'border-l-4 border-[var(--color-gold)] bg-white/10' : 'bg-white/5')}>
            <span className="font-semibold text-[var(--color-text)]">{row.name}</span>
            <span className="text-right text-[var(--color-text)]">{row.contacts}</span>
            <span className="text-right text-[var(--color-text)]">{row.appts}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--color-sub)]">Updates each time a teammate saves their log.</p>
    </section>
  );
}
