export const workingGeniusTypes = ['wonder', 'invention', 'discernment', 'galvanizing', 'enablement', 'tenacity'];
export const tendencyTypes = ['upholder', 'questioner', 'obliger', 'rebel'];
export const enneagramTypes = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

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

const enneagramLabels = {
  one: 'Type 1 - Principled Improver',
  two: 'Type 2 - Helpful Connector',
  three: 'Type 3 - Driven Achiever',
  four: 'Type 4 - Expressive Individualist',
  five: 'Type 5 - Analytical Observer',
  six: 'Type 6 - Loyal Planner',
  seven: 'Type 7 - Energetic Enthusiast',
  eight: 'Type 8 - Decisive Challenger',
  nine: 'Type 9 - Steady Peacemaker',
};

const enneagramCopy = {
  one: ['You are motivated by improvement, integrity, and doing the work the right way.', 'You raise standards and help the team tighten sloppy execution.', 'Watch for perfectionism delaying real outreach.'],
  two: ['You are motivated by helping, connecting, and being useful to people.', 'You build trust quickly and notice who needs support.', 'Watch for over-giving before your own goals are protected.'],
  three: ['You are motivated by progress, achievement, and visible wins.', 'You create momentum and model goal-focused action.', 'Watch for measuring your worth only by the scoreboard.'],
  four: ['You are motivated by meaning, authenticity, and personal expression.', 'You bring emotional honesty and a sharper read on what feels true.', 'Watch for letting mood decide whether the next action happens.'],
  five: ['You are motivated by clarity, mastery, and conserving focused energy.', 'You bring useful analysis before the team wastes motion.', 'Watch for staying in research when one call would create better data.'],
  six: ['You are motivated by security, loyalty, and having a dependable plan.', 'You spot risk early and help the team prepare.', 'Watch for over-checking before you trust the next step.'],
  seven: ['You are motivated by possibility, energy, and keeping options open.', 'You create optimism and fresh angles when work feels heavy.', 'Watch for jumping to the next idea before closing the loop.'],
  eight: ['You are motivated by strength, truth, and direct control of outcomes.', 'You bring decisive action and protect people from drift.', 'Watch for pushing so hard that quieter signals get missed.'],
  nine: ['You are motivated by steadiness, harmony, and keeping things grounded.', 'You calm friction and help the team stay connected.', 'Watch for avoiding the uncomfortable ask that would move the goal forward.'],
};

export const enneagramQuestions = [
  ['EN_01', 'A hard outreach day starts to drag. What pulls you forward?'],
  ['EN_02', 'When a teammate is stuck, what do you naturally offer first?'],
  ['EN_03', 'What kind of coaching usually lands best?'],
  ['EN_04', 'Under pressure, what pattern shows up fastest?'],
  ['EN_05', 'What makes you proud at the end of a week?'],
  ['EN_06', 'What usually blocks your follow-through?'],
  ['EN_07', 'In sales conversations, which strength do you lean on?'],
  ['EN_08', 'What do you want the coach to protect you from?'],
  ['EN_09', 'What kind of goal language feels most motivating?'],
].map(([id, prompt]) => ({
  id,
  quizType: 'enneagram',
  prompt,
  options: enneagramTypes.map((type) => ({ id: type, label: enneagramLabels[type], enneagramType: type })),
}));

export const myersBriggsQuestions = [
  ['MB_EI_01', 'After a packed day, what restores you faster?', 'E', 'Talking it out or doing something active with people.', 'I', 'Quiet time, space, and fewer inputs.'],
  ['MB_EI_02', 'When you are solving a problem, where do you start?', 'E', 'External discussion and quick action.', 'I', 'Internal processing before I speak or move.'],
  ['MB_EI_03', 'In a team sprint, what feels natural?', 'E', 'Keeping energy visible and interactive.', 'I', 'Holding focused space and contributing when clear.'],
  ['MB_SN_01', 'What kind of information do you trust first?', 'S', 'Specific facts, proof, and what has worked before.', 'N', 'Patterns, possibilities, and what could work next.'],
  ['MB_SN_02', 'A new sales idea comes up. What do you ask for?', 'S', 'The practical steps and real examples.', 'N', 'The bigger picture and strategic upside.'],
  ['MB_SN_03', 'What makes coaching easier to follow?', 'S', 'Concrete details and exact next actions.', 'N', 'A concept I can adapt creatively.'],
  ['MB_TF_01', 'When deciding between two moves, what weighs more?', 'T', 'Logic, consistency, and measurable outcome.', 'F', 'People, values, and relationship impact.'],
  ['MB_TF_02', 'What feedback style is easiest to use?', 'T', 'Direct, objective, and specific.', 'F', 'Supportive, personal, and context-aware.'],
  ['MB_TF_03', 'In conflict, what do you try to protect?', 'T', 'Fairness, truth, and clear standards.', 'F', 'Trust, morale, and human impact.'],
  ['MB_JP_01', 'How do you prefer to run your day?', 'J', 'Planned, decided, and structured.', 'P', 'Flexible, responsive, and open.'],
  ['MB_JP_02', 'A deadline is coming. What helps most?', 'J', 'A clear plan and early closure.', 'P', 'Room to adapt as better information appears.'],
  ['MB_JP_03', 'What kind of task list feels better?', 'J', 'Prioritized and checked off.', 'P', 'Loose enough to follow energy and opportunity.'],
].map(([id, prompt, firstId, firstLabel, secondId, secondLabel]) => ({
  id,
  quizType: 'myers_briggs',
  prompt,
  options: [
    { id: firstId, label: firstLabel, letter: firstId },
    { id: secondId, label: secondLabel, letter: secondId },
  ],
}));

export function getQuestions(quizType) {
  if (quizType === 'working_genius') return workingGeniusQuestions;
  if (quizType === 'four_tendencies') return fourTendenciesQuestions;
  if (quizType === 'enneagram') return enneagramQuestions;
  if (quizType === 'myers_briggs') return myersBriggsQuestions;
  throw new Error('invalid_quiz_type');
}

export function scoreQuiz(quizType, answers = {}) {
  if (quizType === 'working_genius') return scoreWorkingGenius(answers);
  if (quizType === 'four_tendencies') return scoreFourTendencies(answers);
  if (quizType === 'enneagram') return scoreEnneagram(answers);
  if (quizType === 'myers_briggs') return scoreMyersBriggs(answers);
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

export function scoreEnneagram(answers) {
  if (Object.keys(answers).length !== enneagramQuestions.length) throw new Error('Answer all 9 Enneagram questions.');
  const scores = Object.fromEntries(enneagramTypes.map((type) => [type, 0]));
  for (const question of enneagramQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) throw new Error('Enneagram answers must use valid option ids.');
    scores[option.enneagramType] += 1;
  }
  const ranked = enneagramTypes.slice().sort((a, b) => scores[b] - scores[a] || enneagramTypes.indexOf(a) - enneagramTypes.indexOf(b));
  return {
    quizType: 'enneagram',
    scores,
    primaryType: ranked[0],
    secondaryType: scores[ranked[1]] > 0 ? ranked[1] : null,
    profileSummary: enneagramLabels[ranked[0]] + ': ' + enneagramCopy[ranked[0]][0],
    teamContribution: enneagramCopy[ranked[0]][1],
    watchOut: enneagramCopy[ranked[0]][2],
    explanation: 'This result helps the coach understand your default motivation under pressure, not just your task preference.',
  };
}

export function scoreMyersBriggs(answers) {
  if (Object.keys(answers).length !== myersBriggsQuestions.length) throw new Error('Answer all 12 Myers-Briggs questions.');
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  for (const question of myersBriggsQuestions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) throw new Error('Myers-Briggs answers must use valid option ids.');
    scores[option.letter] += 1;
  }
  const personalityType = [
    scores.E >= scores.I ? 'E' : 'I',
    scores.S >= scores.N ? 'S' : 'N',
    scores.T >= scores.F ? 'T' : 'F',
    scores.J >= scores.P ? 'J' : 'P',
  ].join('');
  const dimensionCopy = {
    E: 'external energy and fast conversation',
    I: 'quiet focus and internal processing',
    S: 'concrete details and proven next steps',
    N: 'patterns, meaning, and future possibilities',
    T: 'logic, standards, and clean decisions',
    F: 'people, values, and relationship impact',
    J: 'structure, closure, and planned execution',
    P: 'flexibility, responsiveness, and adaptive action',
  };
  return {
    quizType: 'myers_briggs',
    scores,
    personalityType,
    dimensions: personalityType.split(''),
    profileSummary: 'Your Myers-Briggs style reads as ' + personalityType + ', which means coaching should respect ' + personalityType.split('').map((letter) => dimensionCopy[letter]).join(', ') + '.',
    teamContribution: 'You help the team by bringing ' + dimensionCopy[personalityType[0]] + ' plus ' + dimensionCopy[personalityType[3]] + ' to daily execution.',
    watchOut: 'Under pressure, balance your natural ' + dimensionCopy[personalityType[1]] + ' with the opposite view so sales activity does not get too narrow.',
    coachingStyle: 'Use ' + (personalityType.includes('J') ? 'clear plans and deadlines' : 'flexible options and quick experiments') + ' with ' + (personalityType.includes('T') ? 'direct logic' : 'relationship-aware language') + '.',
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
