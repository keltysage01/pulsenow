export const workingGeniusTypes = ['wonder', 'invention', 'discernment', 'galvanizing', 'enablement', 'tenacity'];
export const tendencyTypes = ['upholder', 'questioner', 'obliger', 'rebel'];

const wgPrompts = {
  wonder: ['ask whether we are solving the right problem', 'spot opportunities other people have not named', 'ask deeper questions about people and patterns', 'pause and clarify what matters most', 'open possibilities before plans lock in', 'sit with uncertainty to find a better question'],
  invention: ['create a fresh plan when the current approach is not working', 'generate several ways to reach the same goal', 'bring energy to a blank page', 'connect details into a new solution', 'design a better process or script', 'build a new option instead of complaining'],
  discernment: ['feel which option has the best chance of working', 'notice weak assumptions early', 'give an honest read on an idea', 'separate signal from noise', 'pressure-test a decision', 'compare real options side by side'],
  galvanizing: ['rally people around the next move', 'turn a quiet room into energy and direction', 'invite people into action', 'restore momentum when it drops', 'make the ask and create urgency', 'make a plan feel alive'],
  enablement: ['help someone else move faster', 'notice where support is needed', 'remove friction for the team', 'take a piece of the work so someone else can win', 'build confidence by working alongside people', 'translate a goal into helpful next steps'],
  tenacity: ['finish work cleanly', 'use deadlines to focus', 'notice loose ends', 'make sure the promised outcome happens', 'ship a useful finished result', 'drive tasks to completion'],
};

export const workingGeniusQuestions = workingGeniusTypes.flatMap((type) =>
  wgPrompts[type].map((text, index) => ({
    id: 'WG_' + type.slice(0, 3).toUpperCase() + '_' + String(index + 1).padStart(2, '0'),
    quizType: 'working_genius',
    genius: type,
    prompt: 'I naturally ' + text + '.',
  })),
);

const ftPrompts = [
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

export const fourTendenciesQuestions = ftPrompts.map((prompt, index) => ({
  id: 'FT_' + String(index + 1).padStart(2, '0'),
  quizType: 'four_tendencies',
  prompt,
  options: [
    { id: 'A', label: 'I follow it because the expectation is clear and I said I would.', tendency: 'upholder' },
    { id: 'B', label: 'I need to understand why it matters before I fully commit.', tendency: 'questioner' },
    { id: 'C', label: 'I do best when someone else is counting on me.', tendency: 'obliger' },
    { id: 'D', label: 'I need room to choose it in my own way.', tendency: 'rebel' },
  ],
}));

const geniusCopy = {
  wonder: ['You bring curiosity and strategic questions to the front of the work.', 'You help the team slow down enough to choose the right target.', 'Do not stay in questioning so long that action loses momentum.'],
  invention: ['You create options when the current path is too small or too stale.', 'You turn constraints into practical plays, scripts, and systems.', 'Make sure your ideas get tested and handed off instead of endlessly redesigned.'],
  discernment: ['You bring judgment, pattern recognition, and a strong read on what will work.', 'You protect the team from weak assumptions and expensive distractions.', 'Explain your reasoning so your gut check becomes useful to others.'],
  galvanizing: ['You bring energy, urgency, and invitation after a direction is chosen.', 'You move people from agreement to action.', 'Give quieter teammates room to process before you push for speed.'],
  enablement: ['You make progress easier for other people by offering timely support.', 'You keep teammates from getting stuck alone.', 'Avoid becoming the default owner for work that needs clearer accountability.'],
  tenacity: ['You close loops, finish details, and make the promised outcome real.', 'You convert plans into completed work the team can trust.', 'Do not carry unfinished work silently; ask for what you need early.'],
};

const tendencyCopy = {
  upholder: ['You respond well to clear inner and outer expectations.', 'You create reliability, rhythm, and standards the team can count on.', 'Leave room for changing priorities so discipline does not become rigidity.'],
  questioner: ['You commit fastest when the reason is clear and the logic holds up.', 'You improve decisions by asking for evidence and purpose.', 'Set a decision deadline so useful analysis does not become delay.'],
  obliger: ['You follow through strongest when someone else is counting on you.', 'You are highly responsive to teammates, clients, and leaders.', 'Build visible accountability for your own goals, not only other people’s needs.'],
  rebel: ['You move best when the work connects to identity, freedom, and choice.', 'You challenge stale rules and bring independence to the team.', 'Frame commitments as choices you own so resistance does not block progress.'],
};

export function getQuestions(quizType) {
  if (quizType === 'working_genius') return workingGeniusQuestions;
  if (quizType === 'four_tendencies') return fourTendenciesQuestions;
  throw new Error('invalid_quiz_type');
}

export function scoreQuiz(quizType, answers = {}) {
  if (quizType === 'working_genius') return scoreWorkingGenius(answers);
  if (quizType === 'four_tendencies') return scoreFourTendencies(answers);
  throw new Error('invalid_quiz_type');
}

export function scoreWorkingGenius(answers) {
  if (Object.keys(answers).length !== workingGeniusQuestions.length) throw new Error('Answer all 36 Working Genius questions.');
  const scores = Object.fromEntries(workingGeniusTypes.map((type) => [type, 0]));
  for (const question of workingGeniusQuestions) {
    const value = Number(answers[question.id]);
    if (![1, 2, 3, 4, 5].includes(value)) throw new Error('Working Genius answers must be 1-5.');
    scores[question.genius] += value;
  }
  const ranked = workingGeniusTypes.slice().sort((a, b) => scores[b] - scores[a] || workingGeniusTypes.indexOf(a) - workingGeniusTypes.indexOf(b));
  const tied = ranked.some((type, index) => index > 0 && scores[type] === scores[ranked[index - 1]]);
  return {
    quizType: 'working_genius',
    scores,
    workingGenius: ranked.slice(0, 2),
    workingCompetencies: ranked.slice(2, 4),
    workingFrustrations: ranked.slice(4, 6),
    profileSummary: ranked.slice(0, 2).map((type) => geniusCopy[type][0]).join(' '),
    teamContribution: ranked.slice(0, 2).map((type) => geniusCopy[type][1]).join(' '),
    watchOut: ranked.slice(4, 6).map((type) => geniusCopy[type][2]).join(' '),
    tiebreakerNote: tied ? 'Tied Working Genius scores use the stable type order for ranking; review close scores in coaching before labeling them permanently.' : undefined,
  };
}

export function scoreFourTendencies(answers) {
  if (Object.keys(answers).length !== fourTendenciesQuestions.length) throw new Error('Answer all 16 Four Tendencies questions.');
  const scores = Object.fromEntries(tendencyTypes.map((type) => [type, 0]));
  for (const question of fourTendenciesQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) throw new Error('Four Tendencies answers must use valid option ids.');
    scores[option.tendency] += 1;
  }
  const ranked = tendencyTypes.slice().sort((a, b) => scores[b] - scores[a] || tendencyTypes.indexOf(a) - tendencyTypes.indexOf(b));
  return {
    quizType: 'four_tendencies',
    scores,
    primaryTendency: ranked[0],
    secondaryTendency: scores[ranked[1]] > 0 ? ranked[1] : null,
    profileSummary: tendencyCopy[ranked[0]][0],
    teamContribution: tendencyCopy[ranked[0]][1],
    watchOut: tendencyCopy[ranked[0]][2],
  };
}

export function buildQuizTodayCard(workingGenius, fourTendencies) {
  if (!workingGenius || !fourTendencies) return null;
  return {
    id: 'quiz-card-' + Date.now(),
    cardType: 'quiz_profile',
    title: 'Use your ' + label(workingGenius.workingGenius[0]) + ' today',
    body: 'Lead with ' + workingGenius.workingGenius.map(label).join(' + ') + '. Your tendency is ' + label(fourTendencies.primaryTendency) + '. Today, choose one action that fits that profile and protect against: ' + workingGenius.watchOut,
    payload: { workingGenius, fourTendencies },
  };
}

export function detectTeamGaps(rows = []) {
  const counts = Object.fromEntries(workingGeniusTypes.map((type) => [type, 0]));
  for (const row of rows) for (const type of row.result?.workingGenius || []) counts[type] += 1;
  return workingGeniusTypes
    .filter((type) => counts[type] === 0)
    .map((type) => ({ key: 'no_' + type, severity: 'warning', message: 'No ' + label(type) + ' genius is currently visible on this team. Add an explicit owner for that part of the work.' }));
}

function label(value) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
