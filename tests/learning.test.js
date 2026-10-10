import test from 'node:test';
import assert from 'node:assert/strict';
import {
  vocabulary,
  questions,
  createQuiz,
  answerQuiz,
  nextQuestion,
  createFlashcards,
  flipFlashcard,
  moveFlashcard,
} from '../learning.js';

test('a complete quiz scores each correct answer once and reveals the score only at the end', () => {
  let state = createQuiz();
  for (let index = 0; index < questions.length; index += 1) {
    assert.equal(state.complete, false);
    assert.equal(state.index, index);
    state = answerQuiz(state, questions[index].correct);
    assert.equal(state.score, index + 1);
    state = nextQuestion(state);
  }
  assert.equal(state.complete, true);
  assert.equal(state.score, 3);
  assert.equal(state.answers.length, 3);
  assert.strictEqual(answerQuiz(state, 1), state);
  assert.strictEqual(nextQuestion(state), state);
});

test('wrong answers receive no point and cannot be changed by a duplicate submission', () => {
  const initial = createQuiz();
  const wrong = answerQuiz(initial, 0);
  assert.equal(wrong.score, 0);
  assert.deepEqual(wrong.answers, [0]);
  assert.deepEqual(initial.answers, []);
  assert.strictEqual(answerQuiz(wrong, questions[0].correct), wrong);
  const second = answerQuiz(nextQuestion(wrong), questions[1].correct);
  assert.equal(second.score, 1);
  assert.deepEqual(second.answers, [0, 0]);
});

test('unanswered questions and invalid choices cannot advance or alter the score', () => {
  const state = createQuiz();
  assert.strictEqual(nextQuestion(state), state);
  for (const choice of [-1, 3, NaN, '1', 0.5, undefined]) {
    assert.strictEqual(answerQuiz(state, choice), state);
  }
});

test('restarting a completed quiz produces a clean independent state', () => {
  let state = createQuiz();
  for (const question of questions) state = nextQuestion(answerQuiz(state, question.correct));
  const restarted = createQuiz();
  assert.deepEqual(restarted, { index: 0, answers: [], score: 0, complete: false });
  assert.equal(state.score, 3);
  assert.equal(state.complete, true);
  assert.notStrictEqual(state.answers, restarted.answers);
});

test('flashcards reveal and hide meanings without changing the current word', () => {
  const state = createFlashcards();
  const revealed = flipFlashcard(state);
  assert.deepEqual(state, { index: 0, revealed: false });
  assert.deepEqual(revealed, { index: 0, revealed: true });
  assert.deepEqual(flipFlashcard(revealed), state);
});

test('flashcard navigation hides the answer and stays inside its five-word boundaries', () => {
  const first = createFlashcards();
  assert.strictEqual(moveFlashcard(first, -1), first);
  assert.strictEqual(moveFlashcard(first, 2), first);
  let state = flipFlashcard(first);
  for (let index = 1; index < vocabulary.length; index += 1) {
    state = moveFlashcard(state, 1);
    assert.equal(state.index, index);
    assert.equal(state.revealed, false);
  }
  assert.strictEqual(moveFlashcard(state, 1), state);
  state = moveFlashcard(flipFlashcard(state), -1);
  assert.deepEqual(state, { index: vocabulary.length - 2, revealed: false });
  assert.deepEqual(createFlashcards(), { index: 0, revealed: false });
});
