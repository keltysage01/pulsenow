import type { ReactNode } from 'react';
import { getPulseBackground } from '../../lib/backgrounds';

const routeCategoryMap: Record<string, string> = {
  home: 'dashboard',
  dashboard: 'dashboard',
  board: 'dashboard',
  log: 'dashboard',
  me: 'ambient',
  profile: 'ambient',
  coach: 'coach',
  aiCoach: 'coach',
  contacts: 'crm',
  pipeline: 'crm',
  powerlist: 'crm',
  achievements: 'achievements',
  badges: 'achievements',
};

type PulseBackgroundProps = {
  route?: string;
  index?: number;
  children: ReactNode;
  className?: string;
};

export function PulseBackground({ route = 'ambient', index = 0, children, className = '' }: PulseBackgroundProps) {
  const category = routeCategoryMap[route] || route;
  const backgroundPath = getPulseBackground(category, index);

  return (
    <div className={'pulse-page ' + className}>
      <div className="pulse-background" aria-hidden="true" style={{ backgroundImage: 'url(' + backgroundPath + ')' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
