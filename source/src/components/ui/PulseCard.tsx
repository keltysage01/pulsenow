import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type PulseCardProps<T extends ElementType> = {
  children: ReactNode;
  className?: string;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export function PulseCard<T extends ElementType = 'section'>({ children, className = '', as, ...props }: PulseCardProps<T>) {
  const Component = as || 'section';
  return (
    <Component className={'pulse-glass-card ' + className} {...props}>
      {children}
    </Component>
  );
}

type PulsePillProps<T extends ElementType> = {
  children: ReactNode;
  active?: boolean;
  className?: string;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export function PulsePill<T extends ElementType = 'button'>({ children, active = false, className = '', as, ...props }: PulsePillProps<T>) {
  const Component = as || 'button';
  return (
    <Component className={'pulse-pill pulse-tap ' + (active ? 'pulse-pill-active ' : '') + className} {...props}>
      {children}
    </Component>
  );
}

export function PulseSectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'pulse-section-label ' + className}>{children}</div>;
}

export function PulsePageTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h1 className={'pulse-page-title ' + className}>{children}</h1>;
}

export function PulseCardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={'pulse-card-title ' + className}>{children}</h2>;
}
