import type { ButtonHTMLAttributes, ReactNode } from 'react';

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
};

export function AppButton({ variant = 'primary', children, className = '', ...props }: AppButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'bg-[var(--color-primary)] text-white shadow-lg shadow-green-900/20',
    secondary: 'border border-white/10 bg-white/10 text-[var(--color-text)]',
    ghost: 'text-[var(--color-text)] hover:bg-white/10',
  };
  return (
    <button className={base + ' ' + variants[variant] + ' ' + className} {...props}>
      {children}
    </button>
  );
}
