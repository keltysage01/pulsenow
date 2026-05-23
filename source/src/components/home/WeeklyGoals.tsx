import { ProgressBar } from '../ui/ProgressBar';

const goals = [
  { label: 'Contacts', actual: 42, target: 120 },
  { label: 'Appts Set', actual: 5, target: 12 },
  { label: 'Appts Done', actual: 3, target: 12 },
  { label: 'Prospects', actual: 1, target: 3 },
  { label: 'Points', actual: 8, target: 21 },
];

export function WeeklyGoals() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--color-card)] p-4 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--color-text)]">This Week&apos;s Goals</h2>
        <button type="button" className="text-sm font-bold text-[var(--color-primary)]">Edit</button>
      </div>
      <div className="space-y-4">
        {goals.map((goal) => (
          <div key={goal.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">{goal.label}</span>
              <span className="text-[var(--color-sub)]">{goal.actual} / {goal.target}</span>
            </div>
            <ProgressBar value={goal.actual} max={goal.target} />
          </div>
        ))}
      </div>
    </section>
  );
}
