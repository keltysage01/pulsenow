import { Plus } from 'lucide-react';

const dreams = [
  { title: 'New Home', pct: 36 },
  { title: 'Debt Free', pct: 52 },
  { title: 'Family Trip', pct: 74 },
];

export function VisionBoard() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-[var(--color-text)]">Vision Board</h2>
        <button type="button" className="text-sm font-bold text-[var(--color-primary)]">Edit</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {dreams.map((dream) => (
          <button key={dream.title} type="button" className="w-28 shrink-0 text-left">
            <div className="relative grid aspect-square place-items-center rounded-2xl border border-white/10 bg-white/5">
              <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/25 to-[var(--color-secondary)]/25" />
              <div className="relative grid h-16 w-16 place-items-center rounded-full border-4 border-[var(--color-primary)] bg-[var(--color-card)] text-sm font-bold">
                {dream.pct}%
              </div>
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-semibold text-[var(--color-text)]">{dream.title}</p>
          </button>
        ))}
        <button type="button" className="grid aspect-square w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-white/20 bg-white/5">
          <Plus className="h-6 w-6 text-[var(--color-primary)]" />
        </button>
      </div>
      <p className="px-1 text-sm italic text-[var(--color-sub)]">I make dreams possible by showing up every day.</p>
    </section>
  );
}
