import { fourTendenciesQuestions, workingGeniusQuestions } from './questionBank';
import type {
  CombinedQuizProfile,
  FourTendenciesAnswers,
  FourTendenciesResult,
  TendencyType,
  WorkingGeniusAnswers,
  WorkingGeniusResult,
  WorkingGeniusType,
} from './types';

const geniusOrder: WorkingGeniusType[] = ['wonder', 'invention', 'discernment', 'galvanizing', 'enablement', 'tenacity'];
const tendencyOrder: TendencyType[] = ['upholder', 'questioner', 'obliger', 'rebel'];

const geniusCopy: Record<WorkingGeniusType, { summary: string; contribution: string; watch: string }> = {
  wonder: {
    summary: 'You bring curiosity and strategic questions to the front of the work.',
    contribution: 'You help the team slow down enough to choose the right target.',
    watch: 'Do not stay in questioning so long that action loses momentum.',
  },
  invention: {
    summary: 'You create options when the current path is too small or too stale.',
    contribution: 'You turn constraints into practical plays, scripts, and systems.',
    watch: 'Make sure your ideas get tested and handed off instead of endlessly redesigned.',
  },
  discernment: {
    summary: 'You bring judgment, pattern recognition, and a strong read on what will work.',
    contribution: 'You protect the team from weak assumptions and expensive distractions.',
    watch: 'Explain your reasoning so your gut check becomes useful to others.',
  },
  galvanizing: {
    summary: 'You bring energy, urgency, and invitation after a direction is chosen.',
    contribution: 'You move people from agreement to action.',
    watch: 'Give quieter teammates room to process before you push for speed.',
  },
  enablement: {
    summary: 'You make progress easier for other people by offering timely support.',
    contribution: 'You keep teammates from getting stuck alone.',
    watch: 'Avoid becoming the default owner for work that needs clearer accountability.',
  },
  tenacity: {
    summary: 'You close loops, finish details, and make the promised outcome real.',
    contribution: 'You convert plans into completed work the team can trust.',
    watch: 'Do not carry unfinished work silently; ask for what you need early.',
  },
};

const tendencyCopy: Record<TendencyType, { summary: string; contribution: string; watch: string }> = {
  upholder: {
    summary: 'You respond well to clear inner and outer expectations.',
    contribution: 'You create reliability, rhythm, and standards the team can count on.',
    watch: 'Leave room for changing priorities so discipline does not become rigidity.',
  },
  questioner: {
    summary: 'You commit fastest when the reason is clear and the logic holds up.',
    contribution: 'You improve decisions by asking for evidence and purpose.',
    watch: 'Set a decision deadline so useful analysis does not become delay.',
  },
  obliger: {
    summary: 'You follow through strongest when someone else is counting on you.',
    contribution: 'You are highly responsive to teammates, clients, and leaders.',
    watch: 'Build visible accountability for your own goals, not only other people’s needs.',
  },
  rebel: {
    summary: 'You move best when the work connects to identity, freedom, and choice.',
    contribution: 'You challenge stale rules and bring independence to the team.',
    watch: 'Frame commitments as choices you own so resistance does not block progress.',
  },
};

export function scoreWorkingGenius(answers: WorkingGeniusAnswers): WorkingGeniusResult {
  validateWorkingGeniusAnswers(answers);
  const scores = Object.fromEntries(geniusOrder.map((type) => [type, 0])) as Record<WorkingGeniusType, number>;
  for (const question of workingGeniusQuestions) scores[question.genius] += answers[question.id];
  const ranked = geniusOrder.slice().sort((a, b) => scores[b] - scores[a] || geniusOrder.indexOf(a) - geniusOrder.indexOf(b));
  const top = ranked.slice(0, 2);
  const middle = ranked.slice(2, 4);
  const bottom = ranked.slice(4, 6);
  const tied = ranked.some((type, index) => index > 0 && scores[type] === scores[ranked[index - 1]]);
  return {
    quizType: 'working_genius',
    scores,
    workingGenius: top,
    workingCompetencies: middle,
    workingFrustrations: bottom,
    profileSummary: top.map((type) => geniusCopy[type].summary).join(' '),
    teamContribution: top.map((type) => geniusCopy[type].contribution).join(' '),
    watchOut: bottom.map((type) => geniusCopy[type].watch).join(' '),
    tiebreakerNote: tied ? 'Tied Working Genius scores use the stable type order for ranking; review close scores in coaching before labeling them permanently.' : undefined,
  };
}

export function scoreFourTendencies(answers: FourTendenciesAnswers): FourTendenciesResult {
  validateFourTendenciesAnswers(answers);
  const scores = Object.fromEntries(tendencyOrder.map((type) => [type, 0])) as Record<TendencyType, number>;
  for (const question of fourTendenciesQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (option) scores[option.tendency] += 1;
  }
  const ranked = tendencyOrder.slice().sort((a, b) => scores[b] - scores[a] || tendencyOrder.indexOf(a) - tendencyOrder.indexOf(b));
  const primary = ranked[0];
  const secondary = scores[ranked[1]] > 0 ? ranked[1] : null;
  return {
    quizType: 'four_tendencies',
    scores,
    primaryTendency: primary,
    secondaryTendency: secondary,
    profileSummary: tendencyCopy[primary].summary,
    teamContribution: tendencyCopy[primary].contribution,
    watchOut: tendencyCopy[primary].watch,
  };
}

export function composeQuizProfile(workingGenius: WorkingGeniusResult | null, fourTendencies: FourTendenciesResult | null): CombinedQuizProfile {
  const profileSummary = [workingGenius?.profileSummary, fourTendencies?.profileSummary].filter(Boolean).join(' ');
  const teamContribution = [workingGenius?.teamContribution, fourTendencies?.teamContribution].filter(Boolean).join(' ');
  const watchOut = [workingGenius?.watchOut, fourTendencies?.watchOut].filter(Boolean).join(' ');
  return {
    workingGenius: workingGenius || undefined,
    fourTendencies: fourTendencies || undefined,
    profileSummary: profileSummary || 'Complete both quizzes to unlock your combined profile.',
    teamContribution: teamContribution || 'Your team contribution appears here after scoring.',
    watchOut: watchOut || 'Your coaching watch-out appears here after scoring.',
  };
}

function validateWorkingGeniusAnswers(answers: WorkingGeniusAnswers) {
  const ids = new Set(workingGeniusQuestions.map((question) => question.id));
  if (Object.keys(answers).length !== workingGeniusQuestions.length) throw new Error('Answer all 36 Working Genius questions.');
  for (const id of ids) {
    const value = answers[id];
    if (![1, 2, 3, 4, 5].includes(value)) throw new Error('Working Genius answers must be Likert values from 1 to 5.');
  }
}

function validateFourTendenciesAnswers(answers: FourTendenciesAnswers) {
  if (Object.keys(answers).length !== fourTendenciesQuestions.length) throw new Error('Answer all 16 Four Tendencies questions.');
  for (const question of fourTendenciesQuestions) {
    if (!question.options.some((option) => option.id === answers[question.id])) throw new Error('Four Tendencies answers must use a valid option id.');
  }
}
