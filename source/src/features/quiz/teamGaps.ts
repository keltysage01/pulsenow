import type { TeamGap, TeamQuizSummary, TendencyType, WorkingGeniusType } from './types';

const geniusLabels: Record<WorkingGeniusType, string> = {
  wonder: 'Wonder',
  invention: 'Invention',
  discernment: 'Discernment',
  galvanizing: 'Galvanizing',
  enablement: 'Enablement',
  tenacity: 'Tenacity',
};

export function detectTeamGaps(summary: Omit<TeamQuizSummary, 'gaps'>): TeamGap[] {
  const gaps: TeamGap[] = [];
  (Object.keys(summary.workingGeniusCounts) as WorkingGeniusType[]).forEach((type) => {
    if (summary.workingGeniusCounts[type] === 0) {
      gaps.push({
        key: 'no_' + type,
        severity: 'warning',
        message: 'No ' + geniusLabels[type] + ' genius is currently visible on this team. Add an explicit owner for that part of the work.',
      });
    }
  });
  const tendencies = Object.keys(summary.tendencyCounts) as TendencyType[];
  if (tendencies.every((type) => summary.tendencyCounts[type] === 0)) {
    gaps.push({ key: 'no_tendencies', severity: 'info', message: 'No Four Tendencies results are complete yet.' });
  }
  return gaps;
}
