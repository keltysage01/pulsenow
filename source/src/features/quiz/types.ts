export type QuizType = 'working_genius' | 'four_tendencies';

export type WorkingGeniusType = 'wonder' | 'invention' | 'discernment' | 'galvanizing' | 'enablement' | 'tenacity';
export type TendencyType = 'upholder' | 'questioner' | 'obliger' | 'rebel';

export type LikertValue = 1 | 2 | 3 | 4 | 5;

export type WorkingGeniusQuestion = {
  id: string;
  quizType: 'working_genius';
  genius: WorkingGeniusType;
  prompt: string;
};

export type FourTendenciesOption = {
  id: string;
  label: string;
  tendency: TendencyType;
};

export type FourTendenciesQuestion = {
  id: string;
  quizType: 'four_tendencies';
  prompt: string;
  options: FourTendenciesOption[];
};

export type QuizQuestion = WorkingGeniusQuestion | FourTendenciesQuestion;

export type WorkingGeniusAnswers = Record<string, LikertValue>;
export type FourTendenciesAnswers = Record<string, string>;

export type WorkingGeniusResult = {
  quizType: 'working_genius';
  scores: Record<WorkingGeniusType, number>;
  workingGenius: WorkingGeniusType[];
  workingCompetencies: WorkingGeniusType[];
  workingFrustrations: WorkingGeniusType[];
  profileSummary: string;
  teamContribution: string;
  watchOut: string;
  tiebreakerNote?: string;
};

export type FourTendenciesResult = {
  quizType: 'four_tendencies';
  scores: Record<TendencyType, number>;
  primaryTendency: TendencyType;
  secondaryTendency: TendencyType | null;
  profileSummary: string;
  teamContribution: string;
  watchOut: string;
};

export type CombinedQuizProfile = {
  workingGenius?: WorkingGeniusResult;
  fourTendencies?: FourTendenciesResult;
  profileSummary: string;
  teamContribution: string;
  watchOut: string;
};

export type QuizState = {
  activeQuiz: QuizType;
  index: number;
  workingGeniusAnswers: WorkingGeniusAnswers;
  fourTendenciesAnswers: FourTendenciesAnswers;
  workingGeniusResult: WorkingGeniusResult | null;
  fourTendenciesResult: FourTendenciesResult | null;
  loading: boolean;
  error: string | null;
};

export type QuizAction =
  | { type: 'start'; quizType: QuizType }
  | { type: 'answerWorkingGenius'; questionId: string; value: LikertValue }
  | { type: 'answerFourTendencies'; questionId: string; optionId: string }
  | { type: 'next'; questionCount: number }
  | { type: 'previous' }
  | { type: 'setWorkingGeniusResult'; result: WorkingGeniusResult }
  | { type: 'setFourTendenciesResult'; result: FourTendenciesResult }
  | { type: 'setLoading'; loading: boolean }
  | { type: 'setError'; error: string | null }
  | { type: 'reset' };

export type QuizSubmitRequest = {
  quizType: QuizType;
  answers: WorkingGeniusAnswers | FourTendenciesAnswers;
  session?: { id?: string; org_id?: string; team_id?: string; name?: string };
};

export type QuizSubmitResponse = {
  ok: boolean;
  result: WorkingGeniusResult | FourTendenciesResult;
  todayCard?: CoachFeedCard;
  mode: 'supabase' | 'local-preview';
};

export type CoachFeedCard = {
  id: string;
  cardType: 'quiz_profile' | 'weekly_insight' | 'team_gap' | 'general';
  title: string;
  body: string;
  payload: Record<string, unknown>;
};

export type TeamGap = {
  key: string;
  severity: 'info' | 'warning';
  message: string;
};

export type TeamQuizSummary = {
  teamId: string;
  memberCount: number;
  workingGeniusCounts: Record<WorkingGeniusType, number>;
  tendencyCounts: Record<TendencyType, number>;
  gaps: TeamGap[];
};
