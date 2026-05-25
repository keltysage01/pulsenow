import type { FourTendenciesQuestion, QuizQuestion, WorkingGeniusQuestion } from './types';

export const workingGeniusQuestions: WorkingGeniusQuestion[] = [
  { id: 'WG_WON_01', quizType: 'working_genius', genius: 'wonder', prompt: 'I naturally ask whether we are solving the right problem before we rush into action.' },
  { id: 'WG_WON_02', quizType: 'working_genius', genius: 'wonder', prompt: 'I enjoy spotting opportunities that other people have not named yet.' },
  { id: 'WG_WON_03', quizType: 'working_genius', genius: 'wonder', prompt: 'I get energy from asking deeper questions about people, goals, and patterns.' },
  { id: 'WG_WON_04', quizType: 'working_genius', genius: 'wonder', prompt: 'I often sense when a team needs to pause and clarify what matters most.' },
  { id: 'WG_WON_05', quizType: 'working_genius', genius: 'wonder', prompt: 'I like opening up possibilities before a plan gets too locked in.' },
  { id: 'WG_WON_06', quizType: 'working_genius', genius: 'wonder', prompt: 'I am comfortable sitting with uncertainty long enough to find a better question.' },
  { id: 'WG_INV_01', quizType: 'working_genius', genius: 'invention', prompt: 'I enjoy creating a fresh plan when the current approach is not working.' },
  { id: 'WG_INV_02', quizType: 'working_genius', genius: 'invention', prompt: 'I can quickly generate several ways to reach the same goal.' },
  { id: 'WG_INV_03', quizType: 'working_genius', genius: 'invention', prompt: 'I feel energized when a blank page needs a practical idea.' },
  { id: 'WG_INV_04', quizType: 'working_genius', genius: 'invention', prompt: 'I naturally connect unrelated details into a new solution.' },
  { id: 'WG_INV_05', quizType: 'working_genius', genius: 'invention', prompt: 'People often ask me to help design a better process, script, or campaign.' },
  { id: 'WG_INV_06', quizType: 'working_genius', genius: 'invention', prompt: 'I would rather build a new option than complain about a blocked one.' },
  { id: 'WG_DIS_01', quizType: 'working_genius', genius: 'discernment', prompt: 'I can usually feel which option has the best chance of working.' },
  { id: 'WG_DIS_02', quizType: 'working_genius', genius: 'discernment', prompt: 'I notice weak assumptions before a plan gets expensive.' },
  { id: 'WG_DIS_03', quizType: 'working_genius', genius: 'discernment', prompt: 'People rely on me to give an honest read on an idea.' },
  { id: 'WG_DIS_04', quizType: 'working_genius', genius: 'discernment', prompt: 'I can separate a promising signal from noise without overcomplicating it.' },
  { id: 'WG_DIS_05', quizType: 'working_genius', genius: 'discernment', prompt: 'I like pressure-testing a decision before the team commits.' },
  { id: 'WG_DIS_06', quizType: 'working_genius', genius: 'discernment', prompt: 'My judgment gets sharper when I can compare real options side by side.' },
  { id: 'WG_GAL_01', quizType: 'working_genius', genius: 'galvanizing', prompt: 'I like rallying people around the next move.' },
  { id: 'WG_GAL_02', quizType: 'working_genius', genius: 'galvanizing', prompt: 'I can turn a quiet room into one with energy and direction.' },
  { id: 'WG_GAL_03', quizType: 'working_genius', genius: 'galvanizing', prompt: 'I enjoy inviting people into action after a decision is made.' },
  { id: 'WG_GAL_04', quizType: 'working_genius', genius: 'galvanizing', prompt: 'When momentum drops, I naturally push the team to re-engage.' },
  { id: 'WG_GAL_05', quizType: 'working_genius', genius: 'galvanizing', prompt: 'I am comfortable making the ask and creating urgency.' },
  { id: 'WG_GAL_06', quizType: 'working_genius', genius: 'galvanizing', prompt: 'People count on me to help a plan feel alive and worth acting on.' },
  { id: 'WG_ENA_01', quizType: 'working_genius', genius: 'enablement', prompt: 'I get energy from helping someone else move faster.' },
  { id: 'WG_ENA_02', quizType: 'working_genius', genius: 'enablement', prompt: 'I notice where support is needed and step in without making it about me.' },
  { id: 'WG_ENA_03', quizType: 'working_genius', genius: 'enablement', prompt: 'I like being the person who removes friction for the team.' },
  { id: 'WG_ENA_04', quizType: 'working_genius', genius: 'enablement', prompt: 'I am comfortable taking a piece of the work so someone else can win.' },
  { id: 'WG_ENA_05', quizType: 'working_genius', genius: 'enablement', prompt: 'People feel more confident when I am in the work with them.' },
  { id: 'WG_ENA_06', quizType: 'working_genius', genius: 'enablement', prompt: 'I enjoy translating a goal into helpful next steps for someone else.' },
  { id: 'WG_TEN_01', quizType: 'working_genius', genius: 'tenacity', prompt: 'I like finishing work cleanly and checking it off.' },
  { id: 'WG_TEN_02', quizType: 'working_genius', genius: 'tenacity', prompt: 'Deadlines help me focus and push through the last mile.' },
  { id: 'WG_TEN_03', quizType: 'working_genius', genius: 'tenacity', prompt: 'I notice loose ends and want them closed.' },
  { id: 'WG_TEN_04', quizType: 'working_genius', genius: 'tenacity', prompt: 'I feel responsible for making sure the promised outcome actually happens.' },
  { id: 'WG_TEN_05', quizType: 'working_genius', genius: 'tenacity', prompt: 'I would rather ship a useful finished result than keep tweaking ideas forever.' },
  { id: 'WG_TEN_06', quizType: 'working_genius', genius: 'tenacity', prompt: 'People trust me to drive tasks to completion.' },
];

export const fourTendenciesQuestions: FourTendenciesQuestion[] = Array.from({ length: 16 }, (_, index) => {
  const n = index + 1;
  const prompts = [
    'A new weekly contact goal is announced. What best describes your first move?',
    'You miss a personal habit two days in a row. What gets you back on track?',
    'A leader asks everyone to adopt a new script. How do you respond?',
    'You want to improve your follow-up discipline. What structure helps most?',
    'A teammate asks you to join a morning sprint. What happens?',
    'You are given a deadline that feels arbitrary. What do you need?',
    'You make a promise to yourself to study tonight. What makes it happen?',
    'Someone tells you that you have to do something immediately. What is your instinct?',
    'A team contest starts Monday. Which part motivates you most?',
    'You are choosing a new productivity system. What convinces you?',
    'Your manager checks in on your progress. What feels helpful?',
    'A rule changes midweek. How do you adapt?',
    'You need to make ten uncomfortable calls. What gets you moving?',
    'A training plan has clear daily steps. How does that land?',
    'You disagree with the recommended path. What do you do next?',
    'At the end of the week, what makes you proudest?',
  ];
  return {
    id: 'FT_' + String(n).padStart(2, '0'),
    quizType: 'four_tendencies',
    prompt: prompts[index],
    options: [
      { id: 'A', label: 'I follow it because the expectation is clear and I said I would.', tendency: 'upholder' },
      { id: 'B', label: 'I need to understand why it matters before I fully commit.', tendency: 'questioner' },
      { id: 'C', label: 'I do best when someone else is counting on me.', tendency: 'obliger' },
      { id: 'D', label: 'I need room to choose it in my own way.', tendency: 'rebel' },
    ],
  };
});

export const quizQuestions: Record<'working_genius' | 'four_tendencies', QuizQuestion[]> = {
  working_genius: workingGeniusQuestions,
  four_tendencies: fourTendenciesQuestions,
};
