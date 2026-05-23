type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  let color = 'bg-slate-400';
  if (pct >= 80) color = 'bg-[var(--color-primary)]';
  if (pct >= 50 && pct < 80) color = 'bg-[var(--color-gold)]';
  if (pct >= 100) color = 'bg-[var(--color-gold)] animate-pulse';

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={'h-full rounded-full transition-all ' + color} style={{ width: pct + '%' }} />
    </div>
  );
}
