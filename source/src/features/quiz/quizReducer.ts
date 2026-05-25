import type { QuizAction, QuizState } from './types';

export const initialQuizState: QuizState = {
  activeQuiz: 'working_genius',
  index: 0,
  workingGeniusAnswers: {},
  fourTendenciesAnswers: {},
  workingGeniusResult: null,
  fourTendenciesResult: null,
  loading: false,
  error: null,
};

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (action.type === 'start') return { ...state, activeQuiz: action.quizType, index: 0, error: null };
  if (action.type === 'answerWorkingGenius') return { ...state, workingGeniusAnswers: { ...state.workingGeniusAnswers, [action.questionId]: action.value }, error: null };
  if (action.type === 'answerFourTendencies') return { ...state, fourTendenciesAnswers: { ...state.fourTendenciesAnswers, [action.questionId]: action.optionId }, error: null };
  if (action.type === 'next') return { ...state, index: Math.min(state.index + 1, Math.max(0, action.questionCount - 1)) };
  if (action.type === 'previous') return { ...state, index: Math.max(0, state.index - 1) };
  if (action.type === 'setWorkingGeniusResult') return { ...state, workingGeniusResult: action.result, loading: false, error: null };
  if (action.type === 'setFourTendenciesResult') return { ...state, fourTendenciesResult: action.result, loading: false, error: null };
  if (action.type === 'setLoading') return { ...state, loading: action.loading };
  if (action.type === 'setError') return { ...state, error: action.error, loading: false };
  if (action.type === 'reset') return initialQuizState;
  return state;
}
