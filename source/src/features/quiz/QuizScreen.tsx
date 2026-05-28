import { useMemo, useReducer } from 'react';
import { buildQuizTodayCard } from './coach';
import { quizQuestions } from './questionBank';
import { initialQuizState, quizReducer } from './quizReducer';
import { composeQuizProfile, scoreFourTendencies, scoreWorkingGenius } from './scoring';
import type { FourTendenciesQuestion, LikertValue, QuizType, WorkingGeniusQuestion } from './types';

type QuizScreenProps = {
  session: { id?: string; name: string; org_id?: string; team_id?: string };
};

const quizMeta: Record<QuizType, { label: string; total: number; intro: string }> = {
  working_genius: {
    label: 'Working Genius',
    total: 24,
    intro: 'Rate each prompt from 1 to 5. The result shows your two strongest lanes, two competencies, and two frustration zones.',
  },
  four_tendencies: {
    label: 'Four Tendencies',
    total: 16,
    intro: 'Choose the response that sounds most like you. The result shows your expectation style.',
  },
};

export function QuizScreen({ session }: QuizScreenProps) {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  const questions = quizQuestions[state.activeQuiz];
  const current = questions[state.index];
  const progress = Math.round(((state.index + 1) / questions.length) * 100);
  const combined = composeQuizProfile(state.workingGeniusResult, state.fourTendenciesResult);
  const todayCard = buildQuizTodayCard(state.workingGeniusResult, state.fourTendenciesResult);

  async function finishQuiz() {
    dispatch({ type: 'setLoading', loading: true });
    try {
      if (state.activeQuiz === 'working_genius') {
        const result = scoreWorkingGenius(state.workingGeniusAnswers);
        dispatch({ type: 'setWorkingGeniusResult', result });
      } else {
        const result = scoreFourTendencies(state.fourTendenciesAnswers);
        dispatch({ type: 'setFourTendenciesResult', result });
      }
      void fetch('/api/quizzes/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quizType: state.activeQuiz,
          answers: state.activeQuiz === 'working_genius' ? state.workingGeniusAnswers : state.fourTendenciesAnswers,
          session,
        }),
      });
    } catch (error) {
      dispatch({ type: 'setError', error: error instanceof Error ? error.message : 'Could not score quiz.' });
    }
  }

  function currentAnswered() {
    if (!current) return false;
    if (state.activeQuiz === 'working_genius') return Boolean(state.workingGeniusAnswers[current.id]);
    return Boolean(state.fourTendenciesAnswers[current.id]);
  }

  function next() {
    if (!currentAnswered()) {
      dispatch({ type: 'setError', error: 'Choose an answer before continuing.' });
      return;
    }
    if (state.index + 1 === questions.length) {
      void finishQuiz();
      return;
    }
    dispatch({ type: 'next', questionCount: questions.length });
  }

  return (
    <>
      <section className="card quiz-hero">
        <p className="eyebrow">Personal profile</p>
        <h2>{quizMeta[state.activeQuiz].label}</h2>
        <p className="muted">{quizMeta[state.activeQuiz].intro}</p>
        <div className="segmented">
          <button className={state.activeQuiz === 'working_genius' ? 'active' : ''} onClick={() => dispatch({ type: 'start', quizType: 'working_genius' })}>Working Genius</button>
          <button className={state.activeQuiz === 'four_tendencies' ? 'active' : ''} onClick={() => dispatch({ type: 'start', quizType: 'four_tendencies' })}>Four Tendencies</button>
        </div>
      </section>

      <section className="card quiz-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Step {state.index + 1} of {questions.length}</p>
            <h2>{current ? current.prompt : 'Loading question'}</h2>
          </div>
        </div>
        <div className="bar quiz-progress"><span style={{ width: progress + '%' }} /></div>

        {state.activeQuiz === 'working_genius' ? (
          <WorkingGeniusAnswerRow question={current as WorkingGeniusQuestion} value={state.workingGeniusAnswers[current.id]} onAnswer={(value) => dispatch({ type: 'answerWorkingGenius', questionId: current.id, value })} />
        ) : (
          <FourTendenciesAnswerList question={current as FourTendenciesQuestion} value={state.fourTendenciesAnswers[current.id]} onAnswer={(optionId) => dispatch({ type: 'answerFourTendencies', questionId: current.id, optionId })} />
        )}

        {state.error ? <p className="quiz-error">{state.error}</p> : null}
        <div className="quiz-actions">
          <button disabled={state.index === 0 || state.loading} onClick={() => dispatch({ type: 'previous' })}>Back</button>
          <button className="primary" disabled={state.loading} onClick={next}>{state.loading ? 'Scoring...' : state.index + 1 === questions.length ? 'See result' : 'Next'}</button>
        </div>
      </section>

      <section className="card quiz-results">
        <p className="eyebrow">Results</p>
        <h2>Your PulseNow profile</h2>
        <p className="muted">{combined.profileSummary}</p>
        <ResultBlock label="Team contribution" text={combined.teamContribution} />
        <ResultBlock label="Watch out" text={combined.watchOut} />
        {state.workingGeniusResult ? <ResultBlock label="Working Genius" text={state.workingGeniusResult.workingGenius.join(' + ')} /> : null}
        {state.fourTendenciesResult ? <ResultBlock label="Tendency" text={state.fourTendenciesResult.primaryTendency} /> : null}
      </section>

      {todayCard ? (
        <section className="card accent">
          <p className="eyebrow">Today feed</p>
          <h2>{todayCard.title}</h2>
          <p className="muted">{todayCard.body}</p>
        </section>
      ) : null}
    </>
  );
}

function WorkingGeniusAnswerRow({ question, value, onAnswer }: { question: WorkingGeniusQuestion; value?: LikertValue; onAnswer: (value: LikertValue) => void }) {
  return (
    <div className="quiz-likert" aria-label={question.prompt}>
      {([1, 2, 3, 4, 5] as LikertValue[]).map((item) => (
        <button key={item} className={value === item ? 'active' : ''} onClick={() => onAnswer(item)}>{item}</button>
      ))}
    </div>
  );
}

function FourTendenciesAnswerList({ question, value, onAnswer }: { question: FourTendenciesQuestion; value?: string; onAnswer: (optionId: string) => void }) {
  const options = useMemo(() => question.options.slice().sort(() => Math.random() - 0.5), [question.id, question.options]);
  return (
    <div className="quiz-options">
      {options.map((option) => (
        <button key={option.id} className={value === option.id ? 'active' : ''} onClick={() => onAnswer(option.id)}>{option.label}</button>
      ))}
    </div>
  );
}

function ResultBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="quiz-result-block">
      <strong>{label}</strong>
      <p>{text}</p>
    </div>
  );
}
