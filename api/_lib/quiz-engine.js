export const workingGeniusTypes = ['wonder', 'invention', 'discernment', 'galvanizing', 'enablement', 'tenacity'];
export const tendencyTypes = ['upholder', 'questioner', 'obliger', 'rebel'];
export const enneagramTypes = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const wgPrompts = {
  wonder: ['ask whether we are solving the right problem', 'spot opportunities other people have not named', 'ask deeper questions about people and patterns', 'pause and clarify what matters most'],
  invention: ['create a fresh plan when the current approach is not working', 'generate several ways to reach the same goal', 'bring energy to a blank page', 'connect details into a new solution'],
  discernment: ['feel which option has the best chance of working', 'notice weak assumptions early', 'give an honest read on an idea', 'separate signal from noise'],
  galvanizing: ['rally people around the next move', 'turn a quiet room into energy and direction', 'invite people into action', 'restore momentum when it drops'],
  enablement: ['help someone else move faster', 'notice where support is needed', 'remove friction for the team', 'take a piece of the work so someone else can win'],
  tenacity: ['finish work cleanly', 'use deadlines to focus', 'notice loose ends', 'make sure the promised outcome happens'],
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

const enneagramScenarios = [
  ['EN_01', 'A hard outreach day starts to drag. What pulls you forward?', {
    one: 'Doing it correctly because the standard matters.',
    two: 'Remembering who this could help.',
    three: 'Seeing the win that comes from finishing strong.',
    four: 'Finding a more honest reason the work matters.',
    five: 'Getting enough clarity to act with confidence.',
    six: 'Following the plan so nothing important slips.',
    seven: 'Turning it into a fresh challenge or sprint.',
    eight: 'Taking control and forcing momentum.',
    nine: 'Finding a calm rhythm and staying with it.',
  }],
  ['EN_02', 'When a teammate is stuck, what do you naturally offer first?', {
    one: 'A cleaner standard or better way to execute.',
    two: 'Personal support and encouragement.',
    three: 'A goal, target, or scoreboard to chase.',
    four: 'Space to name what is really going on.',
    five: 'A clear explanation or useful information.',
    six: 'A safer plan with next steps and backup options.',
    seven: 'A new angle that makes it feel lighter.',
    eight: 'Direct truth and a push to act.',
    nine: 'A steady presence that lowers the tension.',
  }],
  ['EN_03', 'What kind of coaching usually lands best?', {
    one: 'Show me the right standard and where to improve.',
    two: 'Connect it to people and relationships.',
    three: 'Make the outcome measurable and worth chasing.',
    four: 'Make it personal and emotionally honest.',
    five: 'Give me the logic and enough context.',
    six: 'Help me trust the plan and reduce risk.',
    seven: 'Keep it energetic, practical, and flexible.',
    eight: 'Be direct and tell me the move.',
    nine: 'Keep it calm, simple, and doable.',
  }],
  ['EN_04', 'Under pressure, what pattern shows up fastest?', {
    one: 'I get critical of what is wrong.',
    two: 'I focus on everyone else before myself.',
    three: 'I push harder to prove I can win.',
    four: 'I compare how things feel versus what I wanted.',
    five: 'I pull back to think and conserve energy.',
    six: 'I scan for what could go wrong.',
    seven: 'I look for a better or more exciting option.',
    eight: 'I take charge and may get intense.',
    nine: 'I avoid conflict and try to keep peace.',
  }],
  ['EN_05', 'What makes you proud at the end of a week?', {
    one: 'I improved the system and did it well.',
    two: 'I helped people feel seen and supported.',
    three: 'I produced results I can point to.',
    four: 'I stayed true to what mattered.',
    five: 'I understood the work and used my energy wisely.',
    six: 'I was dependable and prepared.',
    seven: 'I created possibility and kept moving.',
    eight: 'I made the hard calls and owned the outcome.',
    nine: 'I kept things steady and moved without drama.',
  }],
  ['EN_06', 'What usually blocks your follow-through?', {
    one: 'Waiting until the work feels good enough.',
    two: "Letting other people's needs take over.",
    three: 'Avoiding anything that feels like a visible loss.',
    four: 'Needing the work to feel aligned first.',
    five: 'Wanting more information before acting.',
    six: 'Needing more certainty before trusting the move.',
    seven: 'Getting pulled toward a more interesting option.',
    eight: 'Resisting anything that feels like control.',
    nine: 'Letting discomfort fade into later.',
  }],
  ['EN_07', 'In sales conversations, which strength do you lean on?', {
    one: 'Credibility and doing things properly.',
    two: 'Warmth and personal connection.',
    three: 'Confidence and outcome focus.',
    four: 'Depth and sincerity.',
    five: 'Knowledge and calm explanation.',
    six: 'Preparedness and trust-building.',
    seven: 'Energy and possibility.',
    eight: 'Directness and conviction.',
    nine: 'Ease and patience.',
  }],
  ['EN_08', 'What do you want the coach to protect you from?', {
    one: 'Over-polishing instead of shipping.',
    two: 'Helping everyone except myself.',
    three: 'Chasing status instead of the right action.',
    four: 'Getting stuck in feelings before movement.',
    five: 'Thinking longer than the decision needs.',
    six: 'Over-planning because of uncertainty.',
    seven: 'Starting too much and finishing too little.',
    eight: 'Forcing the outcome without listening.',
    nine: 'Staying comfortable instead of making the ask.',
  }],
  ['EN_09', 'What kind of goal language feels most motivating?', {
    one: 'Make it cleaner and more excellent.',
    two: 'Make it helpful and relational.',
    three: 'Make it measurable and ambitious.',
    four: 'Make it meaningful and true.',
    five: 'Make it clear and efficient.',
    six: 'Make it dependable and well-supported.',
    seven: 'Make it exciting and full of options.',
    eight: 'Make it direct and powerful.',
    nine: 'Make it steady and peaceful.',
  }],
  ['EN_10', 'When you receive blunt feedback, what do you listen for first?', {
    one: 'What needs to be corrected.',
    two: 'Whether the relationship is still okay.',
    three: 'How to turn it into better performance.',
    four: 'Whether they understand what I meant.',
    five: 'The facts I can verify.',
    six: 'What risk or expectation I missed.',
    seven: 'How to move on without getting stuck.',
    eight: 'Whether the feedback is honest and useful.',
    nine: 'How to keep the conversation from escalating.',
  }],
  ['EN_11', 'A plan changes at the last minute. What is your first concern?', {
    one: 'Keeping quality from slipping.',
    two: 'Making sure people are supported.',
    three: 'Protecting the result.',
    four: 'Not losing the meaning behind the work.',
    five: 'Getting enough information to adjust.',
    six: 'Knowing what is safe and reliable now.',
    seven: 'Finding the opportunity in the change.',
    eight: 'Deciding who is in charge and moving.',
    nine: 'Keeping everyone steady.',
  }],
  ['EN_12', 'Which compliment would feel most accurate?', {
    one: 'You make things better.',
    two: 'You make people feel cared for.',
    three: 'You make goals happen.',
    four: 'You make the work feel real.',
    five: 'You make complex things clear.',
    six: 'You make the team prepared.',
    seven: 'You make possibility feel available.',
    eight: 'You make hard decisions easier.',
    nine: 'You make the room calmer.',
  }],
  ['EN_13', 'When you avoid a task, what is usually underneath?', {
    one: 'It may not meet the standard.',
    two: 'Someone else needs me first.',
    three: 'It could expose a weakness.',
    four: 'It feels disconnected from me.',
    five: 'It may cost more energy than I have.',
    six: 'The unknowns feel unresolved.',
    seven: 'It feels limiting or dull.',
    eight: 'It feels like someone is forcing me.',
    nine: 'It may create tension.',
  }],
  ['EN_14', 'In a team conflict, what role do you fall into?', {
    one: 'Clarifying what is fair and correct.',
    two: 'Checking how everyone is feeling.',
    three: 'Refocusing people on the goal.',
    four: 'Naming what is emotionally true.',
    five: 'Stepping back to analyze.',
    six: 'Testing which path is safest.',
    seven: 'Lightening the mood and opening options.',
    eight: 'Confronting the issue directly.',
    nine: 'Smoothing the tension so people can continue.',
  }],
  ['EN_15', 'What kind of weekly review is most useful?', {
    one: 'What improved and what needs tightening.',
    two: 'Who was helped and who needs attention.',
    three: 'What results moved and what did not.',
    four: 'What felt aligned and what felt false.',
    five: 'What data changed my understanding.',
    six: 'What risks showed up and how prepared I was.',
    seven: 'What created energy and what new options appeared.',
    eight: 'What decisions were made and what got handled.',
    nine: 'What stayed balanced and what needs a next step.',
  }],
  ['EN_16', 'When a prospect says no, what do you tend to do internally?', {
    one: 'Review what I should have done better.',
    two: 'Wonder whether I connected well enough.',
    three: 'Move quickly toward the next win.',
    four: 'Feel the disappointment personally.',
    five: 'Analyze what information was missing.',
    six: 'Look for the signal I should have anticipated.',
    seven: 'Reframe it and look for another possibility.',
    eight: 'Accept it directly and keep control.',
    nine: 'Try not to let it disrupt my mood.',
  }],
  ['EN_17', 'What drains your energy fastest?', {
    one: 'Sloppy work and avoidable mistakes.',
    two: 'Feeling unappreciated or disconnected.',
    three: 'Wasted effort with no visible progress.',
    four: 'Shallow work that ignores what matters.',
    five: 'Too much demand with too little space.',
    six: 'Unclear expectations and hidden risks.',
    seven: 'Restriction, boredom, and heavy negativity.',
    eight: 'Indecision and passive resistance.',
    nine: 'Pressure, conflict, and too many demands.',
  }],
  ['EN_18', 'What does trust look like from a leader?', {
    one: 'They hold a clear and fair standard.',
    two: 'They notice people and show care.',
    three: 'They value results and competence.',
    four: 'They are authentic and see the person.',
    five: 'They give context and respect boundaries.',
    six: 'They are consistent and prepared.',
    seven: 'They bring optimism and room to adapt.',
    eight: 'They are direct and do what they say.',
    nine: 'They are patient, stable, and inclusive.',
  }],
  ['EN_19', 'Which inner message is most familiar?', {
    one: 'I need to make this right.',
    two: 'I need to be needed.',
    three: 'I need to succeed.',
    four: 'I need to be understood.',
    five: 'I need to be capable.',
    six: 'I need to be prepared.',
    seven: 'I need to stay free and upbeat.',
    eight: 'I need to stay strong.',
    nine: 'I need to keep peace.',
  }],
  ['EN_20', 'When the day is unstructured, what do you naturally create?', {
    one: 'Standards and priorities.',
    two: 'Connection points with people.',
    three: 'Targets and visible wins.',
    four: 'Meaningful focus.',
    five: 'Quiet space to think.',
    six: 'A plan and backup plan.',
    seven: 'Options and variety.',
    eight: 'A direct path to action.',
    nine: 'A comfortable rhythm.',
  }],
  ['EN_21', 'What is hardest to admit when you are stressed?', {
    one: 'I am being too critical.',
    two: 'I need something too.',
    three: 'I am afraid of failing.',
    four: 'I may be intensifying the feeling.',
    five: 'I am withdrawing too much.',
    six: 'I am looking for too much certainty.',
    seven: 'I am avoiding discomfort.',
    eight: 'I am coming on too strong.',
    nine: 'I am avoiding my own priority.',
  }],
  ['EN_22', 'What helps you restart after losing momentum?', {
    one: 'A clear next improvement.',
    two: 'A person I can help or report back to.',
    three: 'A visible target and quick win.',
    four: 'A reason that feels personally true.',
    five: 'A defined scope and enough information.',
    six: 'A dependable plan with the first step named.',
    seven: 'A fresh challenge with energy.',
    eight: 'A direct decision and ownership.',
    nine: 'A calm, simple action that lowers resistance.',
  }],
  ['EN_23', 'What do you most want your work to prove?', {
    one: 'That I acted with integrity.',
    two: 'That I made a real difference for people.',
    three: 'That I can achieve what I set out to do.',
    four: 'That my contribution is authentic.',
    five: 'That I understand and can handle complexity.',
    six: 'That I am reliable and ready.',
    seven: 'That there is always another possibility.',
    eight: 'That I can protect and lead well.',
    nine: 'That progress can happen without losing peace.',
  }],
  ['EN_24', 'Which mistake are you most likely to overcorrect?', {
    one: 'Doing something imperfectly.',
    two: 'Disappointing someone.',
    three: 'Looking unsuccessful.',
    four: 'Being ordinary or misunderstood.',
    five: 'Being unprepared.',
    six: 'Trusting too quickly.',
    seven: 'Feeling trapped.',
    eight: 'Being controlled.',
    nine: 'Creating conflict.',
  }],
  ['EN_25', 'What kind of next action is easiest to accept?', {
    one: 'The right action with a clear standard.',
    two: 'The helpful action tied to a person.',
    three: 'The high-impact action tied to a result.',
    four: 'The meaningful action I can stand behind.',
    five: 'The informed action with a contained scope.',
    six: 'The prepared action with a backup.',
    seven: 'The energizing action with room to adapt.',
    eight: 'The decisive action I can own.',
    nine: 'The manageable action that keeps things steady.',
  }],
  ['EN_26', 'When people misunderstand you, what hurts most?', {
    one: 'They miss my intent to improve things.',
    two: 'They miss how much I care.',
    three: 'They miss how hard I am working.',
    four: 'They miss who I really am.',
    five: 'They miss the thought behind my position.',
    six: 'They miss my loyalty and caution.',
    seven: 'They miss my optimism and flexibility.',
    eight: 'They miss that I am trying to protect what matters.',
    nine: 'They miss that I have a point of view too.',
  }],
  ['EN_27', 'What should the coach challenge most carefully?', {
    one: 'My need to perfect it before acting.',
    two: 'My habit of earning approval by helping.',
    three: 'My tendency to chase the visible win.',
    four: 'My pull toward intensity before action.',
    five: 'My desire to keep researching.',
    six: 'My loop of checking every risk.',
    seven: 'My habit of escaping to the next option.',
    eight: 'My instinct to overpower the moment.',
    nine: 'My comfort with postponing tension.',
  }],
];

export const enneagramQuestions = enneagramScenarios.map(([id, prompt, labels]) => ({
  id,
  quizType: 'enneagram',
  prompt,
  options: enneagramTypes.map((type) => ({ id: type, label: labels[type], enneagramType: type })),
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
  if (Object.keys(answers).length !== workingGeniusQuestions.length) throw new Error('Answer all 24 Working Genius questions.');
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
  if (Object.keys(answers).length !== enneagramQuestions.length) throw new Error('Answer all 27 Enneagram questions.');
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
