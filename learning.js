/** Small, immutable activity models shared by the UI and its tests. */
export const vocabulary = Object.freeze([
  Object.freeze({
    word: 'curious',
    meaning: 'Wanting to learn or know more about something.',
    example: 'I am curious about life in other countries.',
  }),
  Object.freeze({
    word: 'practise',
    meaning: 'To do something regularly to improve your skill. (British English verb.)',
    example: 'I practise speaking English for a few minutes each day.',
  }),
  Object.freeze({
    word: 'confidence',
    meaning: 'The feeling that you can do something well.',
    example: 'Speaking with a friend helps me build confidence.',
  }),
  Object.freeze({
    word: 'opportunity',
    meaning: 'A chance to do something.',
    example: 'This class is an opportunity to meet new people.',
  }),
  Object.freeze({
    word: 'explore',
    meaning: 'To look around a place or learn more about an idea.',
    example: 'Let’s explore a new neighbourhood together.',
  }),
]);

export const questions = Object.freeze([
  Object.freeze({
    prompt: 'She ___ English every day.',
    options: Object.freeze(['study', 'studies', 'studying']),
    correct: 1,
    explanation: 'With “she”, we add -s to the present simple verb: she studies.',
  }),
  Object.freeze({
    prompt: 'Could you ___ that, please?',
    options: Object.freeze(['repeat', 'repeats', 'repeating']),
    correct: 0,
    explanation: 'After “could”, use the base form of the verb: could you repeat.',
  }),
  Object.freeze({
    prompt: 'You meet someone for the first time. What do you say?',
    options: Object.freeze(['See you yesterday.', 'Nice to meet you.', 'I am meet you.']),
    correct: 1,
    explanation: '“Nice to meet you” is a friendly greeting when you first meet someone.',
  }),
]);

export function createQuiz() {
  return { index: 0, answers: [], score: 0, complete: false };
}

export function answerQuiz(state, choice) {
  const question = questions[state.index];
  if (
    state.complete ||
    state.answers[state.index] !== undefined ||
    !Number.isInteger(choice) ||
    !question ||
    choice < 0 ||
    choice >= question.options.length
  ) return state;

  const answers = [...state.answers];
  answers[state.index] = choice;
  return {
    ...state,
    answers,
    score: state.score + Number(choice === question.correct),
  };
}

export function nextQuestion(state) {
  if (state.complete || state.answers[state.index] === undefined) return state;
  return state.index === questions.length - 1
    ? { ...state, complete: true }
    : { ...state, index: state.index + 1 };
}

export function createFlashcards() {
  return { index: 0, revealed: false };
}

export function flipFlashcard(state) {
  return { ...state, revealed: !state.revealed };
}

export function moveFlashcard(state, direction) {
  if (direction !== -1 && direction !== 1) return state;
  const index = Math.max(0, Math.min(vocabulary.length - 1, state.index + direction));
  return index === state.index ? state : { index, revealed: false };
}
