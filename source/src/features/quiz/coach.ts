import type { CoachFeedCard, FourTendenciesResult, WorkingGeniusResult } from './types';

export function buildQuizTodayCard(workingGenius: WorkingGeniusResult | null, fourTendencies: FourTendenciesResult | null): CoachFeedCard | null {
  if (!workingGenius || !fourTendencies) return null;
  const title = 'Use your ' + label(workingGenius.workingGenius[0]) + ' today';
  const body =
    'Your strongest lane is ' +
    workingGenius.workingGenius.map(label).join(' + ') +
    ', and your tendency is ' +
    label(fourTendencies.primaryTendency) +
    '. Set one action that fits that style, then protect against: ' +
    workingGenius.watchOut;
  return {
    id: 'quiz-card-' + Date.now(),
    cardType: 'quiz_profile',
    title,
    body,
    payload: { workingGenius, fourTendencies },
  };
}

export function buildAnthropicWeeklyInsightPrompt(workingGenius: WorkingGeniusResult, fourTendencies: FourTendenciesResult, recentActivity: Record<string, unknown>) {
  return {
    system: 'You are Pulsenow, a direct insurance sales coach. Return concise JSON with title, insight, and next_action.',
    user: JSON.stringify({ workingGenius, fourTendencies, recentActivity }),
    maxTokens: 500,
  };
}

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
