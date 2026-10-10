import {
  vocabulary,
  questions,
  createQuiz,
  answerQuiz,
  nextQuestion,
  createFlashcards,
  flipFlashcard,
  moveFlashcard,
} from './learning.js?v=4';

const titles = {
  lesson: 'A small introduction',
  vocabulary: 'Words for a bigger world',
  quiz: 'A little English check-in',
};

export function initActivities() {
  const dialog = document.querySelector('#activity-dialog');
  const content = document.querySelector('#activity-content');
  const closeButton = document.querySelector('#activity-close');
  if (!dialog || !content || !closeButton || dialog.dataset.activitiesReady) return;
  dialog.dataset.activitiesReady = 'true';

  let title = document.querySelector('#activity-title');
  if (!title) {
    title = document.createElement('h2');
    title.id = 'activity-title';
    content.before(title);
  }
  let live = document.querySelector('#activity-live');
  if (!live) {
    live = document.createElement('p');
    live.id = 'activity-live';
    live.className = 'sr-only';
    dialog.append(live);
  }
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  let active = null;
  let returnFocus = null;
  let originalOverflow = null;
  let quiz = createQuiz();
  let flashcards = createFlashcards();
  let backdropPointer = false;

  const announce = message => { live.textContent = message; };
  const focusContent = selector => {
    content.querySelector(selector)?.focus({ preventScroll: true });
  };

  function renderLesson() {
    content.innerHTML = `
      <p class="activity-kicker">Sample lesson · Introductions</p>
      <p class="activity-description">A conversation can begin with two simple sentences. Say who you are, then share something you enjoy.</p>
      <div class="lesson-example">
        <p><strong>I am…</strong> <span>+ a name or a role</span></p>
        <p>“I am Turgun.” <span class="lesson-note">Introduce yourself.</span></p>
        <p><strong>I enjoy…</strong> <span>+ a noun or an -ing verb</span></p>
        <p>“I enjoy teaching English.” <span class="lesson-note">Share an interest.</span></p>
      </div>
      <p class="activity-description">Your turn: say your name and one thing you enjoy. “I am ___. I enjoy ___.”</p>
      <fieldset class="lesson-practice">
        <legend>Which sentence is correct?</legend>
        <div class="activity-options">
          <button class="activity-option" type="button" data-lesson-answer="incorrect" aria-pressed="false">I a student.</button>
          <button class="activity-option" type="button" data-lesson-answer="correct" aria-pressed="false">I am a student.</button>
        </div>
      </fieldset>
      <p class="activity-feedback" id="lesson-feedback">Choose a sentence to practise.</p>
      <p class="activity-footnote">A short sample of the classroom experience. No account needed.</p>`;
  }

  function renderVocabulary(focusSelector) {
    const card = vocabulary[flashcards.index];
    content.innerHTML = `
      <p class="activity-kicker">Vocabulary · Five useful words</p>
      <p class="activity-description">Take your time. Reveal a meaning, read the example, then try the word in a sentence of your own.</p>
      <div class="activity-progress">
        <span id="flashcard-position">Word ${flashcards.index + 1} of ${vocabulary.length}</span>
        <progress value="${flashcards.index + 1}" max="${vocabulary.length}" aria-labelledby="flashcard-position"></progress>
      </div>
      <button class="flashcard ${flashcards.revealed ? 'is-revealed' : ''}" type="button" data-action="flip" aria-label="${flashcards.revealed ? 'Hide' : 'Show'} the definition of ${card.word}" aria-expanded="${flashcards.revealed}">
        <span class="flashcard-term">${card.word}</span>
        ${flashcards.revealed
          ? `<span class="flashcard-definition">${card.meaning}</span><span class="flashcard-example">“${card.example}”</span>`
          : '<span class="flashcard-cue">Tap to reveal the meaning</span>'}
        <span class="flashcard-hint">${flashcards.revealed ? 'Hide meaning' : 'Reveal meaning'} <span aria-hidden="true"><svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span></span>
      </button>
      <div class="activity-actions flashcard-navigation">
        <button class="activity-button secondary" type="button" data-action="previous" ${flashcards.index === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span> Previous word</button>
        <button class="activity-button primary" type="button" data-action="next-card" ${flashcards.index === vocabulary.length - 1 ? 'disabled' : ''}>Next word <span aria-hidden="true">→</span></button>
      </div>
      <button class="activity-text-button" type="button" data-action="restart-cards">Start again</button>`;
    if (focusSelector) {
      const destination = content.querySelector(focusSelector);
      focusContent(destination?.disabled ? '[data-action="flip"]' : focusSelector);
    }
  }

  function renderQuiz(focusSelector) {
    if (quiz.complete) {
      content.innerHTML = `
        <p class="activity-kicker">Sample quiz · Complete</p>
        <div class="quiz-summary">
          <p class="quiz-score" tabindex="-1" aria-label="Your score: ${quiz.score} out of ${questions.length}">${quiz.score}<span> / ${questions.length}</span></p>
          <h3>${quiz.score === questions.length ? 'A lovely little start.' : 'Every question is a chance to learn.'}</h3>
          <p class="activity-description">${quiz.score === questions.length ? 'You answered all three questions correctly. Keep exploring and trying new sentences.' : 'Try the questions again and notice the explanations. Small steps make practice feel manageable.'}</p>
        </div>
        <div class="activity-actions">
          <button class="activity-button primary" type="button" data-action="restart-quiz">Restart quiz <span aria-hidden="true"><svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span></button>
        </div>
        <p class="activity-footnote">This short sample is for practice, not a level assessment.</p>`;
      if (focusSelector) focusContent('.quiz-score');
      return;
    }

    const question = questions[quiz.index];
    const answer = quiz.answers[quiz.index];
    const answered = answer !== undefined;
    const correct = answer === question.correct;
    const feedback = answered
      ? `${correct ? 'Correct.' : `Not quite. The answer is “${question.options[question.correct]}”.`} ${question.explanation}`
      : 'Choose one answer, then check it.';
    content.innerHTML = `
      <p class="activity-kicker">Sample quiz · Three small questions</p>
      <div class="activity-progress">
        <span id="quiz-position">Question ${quiz.index + 1} of ${questions.length}</span>
        <progress value="${quiz.index + 1}" max="${questions.length}" aria-labelledby="quiz-position"></progress>
      </div>
      <form id="quiz-form">
        <fieldset class="quiz-question-group">
          <legend class="quiz-question" tabindex="-1">${question.prompt}</legend>
          <div class="activity-options quiz-options">
            ${question.options.map((option, index) => `
              <label class="quiz-option ${answered && index === question.correct ? 'is-correct' : ''} ${answered && index === answer && !correct ? 'is-incorrect' : ''}">
                <input type="radio" name="quiz-answer" value="${index}" data-quiz-choice="${index}" ${index === answer ? 'checked' : ''} ${answered ? 'disabled' : ''}>
                <span>${option}</span>
                ${answered && index === question.correct ? '<span class="quiz-option-note">Correct answer</span>' : ''}
              </label>`).join('')}
          </div>
        </fieldset>
        <p class="activity-feedback ${answered ? (correct ? 'is-correct' : 'is-incorrect') : ''}">${feedback}</p>
        <div class="activity-actions">
          ${answered
            ? `<button class="activity-button primary" type="button" data-action="next-question">${quiz.index === questions.length - 1 ? 'See my score' : 'Next question'} <span aria-hidden="true">→</span></button>`
            : '<button class="activity-button primary" type="submit" id="check-answer" disabled>Check answer <span aria-hidden="true"><svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span></button>'}
        </div>
      </form>`;
    if (focusSelector) focusContent(focusSelector);
  }

  function openActivity(activity, trigger) {
    if (!Object.hasOwn(titles, activity)) return;
    const wasOpen = dialog.open;
    active = activity;
    if (!wasOpen) {
      returnFocus = trigger || document.querySelector('#classroom-stage') || document.activeElement;
      originalOverflow = {
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
      };
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    quiz = createQuiz();
    flashcards = createFlashcards();
    title.textContent = titles[activity];
    announce('');
    if (activity === 'lesson') renderLesson();
    if (activity === 'vocabulary') renderVocabulary();
    if (activity === 'quiz') renderQuiz();
    if (!wasOpen) dialog.showModal();
    closeButton.focus({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-activity]') : null;
    if (trigger) openActivity(trigger.dataset.activity, trigger);
  });

  window.addEventListener('oxygen:activity', event => {
    openActivity(event.detail?.activity, document.querySelector('#classroom-stage'));
  });

  content.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;

    if (active === 'lesson' && button.dataset.lessonAnswer) {
      const correct = button.dataset.lessonAnswer === 'correct';
      content.querySelectorAll('[data-lesson-answer]').forEach(option => {
        option.setAttribute('aria-pressed', String(option === button));
        option.classList.toggle('is-selected', option === button);
      });
      const feedback = correct
        ? 'Exactly. Use “I am” to introduce yourself: “I am a student.”'
        : 'Try again. The sentence needs “am” after “I”: “I am a student.”';
      const paragraph = content.querySelector('#lesson-feedback');
      paragraph.textContent = feedback;
      paragraph.className = `activity-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
      announce(feedback);
    }

    if (active === 'vocabulary') {
      switch (button.dataset.action) {
        case 'flip':
          flashcards = flipFlashcard(flashcards);
          renderVocabulary('[data-action="flip"]');
          break;
        case 'previous':
          flashcards = moveFlashcard(flashcards, -1);
          renderVocabulary('[data-action="previous"]');
          break;
        case 'next-card':
          flashcards = moveFlashcard(flashcards, 1);
          renderVocabulary('[data-action="next-card"]');
          break;
        case 'restart-cards':
          flashcards = createFlashcards();
          renderVocabulary('[data-action="flip"]');
          break;
        default:
          return;
      }
      const card = vocabulary[flashcards.index];
      announce(`Word ${flashcards.index + 1} of ${vocabulary.length}: ${card.word}.${flashcards.revealed ? ` ${card.meaning} Example: ${card.example}` : ' Meaning hidden.'}`);
    }

    if (active === 'quiz') {
      if (button.dataset.action === 'next-question') {
        quiz = nextQuestion(quiz);
        renderQuiz('.quiz-question');
        if (quiz.complete) announce(`Quiz complete. Your score is ${quiz.score} out of ${questions.length}.`);
      }
      if (button.dataset.action === 'restart-quiz') {
        quiz = createQuiz();
        renderQuiz('.quiz-question');
        announce('Quiz restarted. Question 1 of 3.');
      }
    }
  });

  content.addEventListener('change', event => {
    if (active === 'quiz' && event.target.matches('[data-quiz-choice]')) {
      content.querySelector('#check-answer').disabled = false;
    }
  });

  content.addEventListener('submit', event => {
    if (event.target.id !== 'quiz-form' || active !== 'quiz') return;
    event.preventDefault();
    const selected = content.querySelector('[name="quiz-answer"]:checked');
    if (!selected) return;
    const updated = answerQuiz(quiz, Number(selected.value));
    if (updated === quiz) return;
    quiz = updated;
    renderQuiz('[data-action="next-question"]');
    announce(content.querySelector('.activity-feedback').textContent);
  });

  dialog.addEventListener('keydown', event => {
    if (active !== 'vocabulary' || !content.contains(document.activeElement) ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const updated = moveFlashcard(flashcards, event.key === 'ArrowRight' ? 1 : -1);
    if (updated === flashcards) return;
    flashcards = updated;
    renderVocabulary('[data-action="flip"]');
    announce(`Word ${flashcards.index + 1} of ${vocabulary.length}: ${vocabulary[flashcards.index].word}. Meaning hidden.`);
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('pointerdown', event => {
    backdropPointer = event.target === dialog && pointerOutsideDialog(event, dialog);
  });
  dialog.addEventListener('click', event => {
    if (backdropPointer && event.target === dialog && pointerOutsideDialog(event, dialog)) dialog.close();
    backdropPointer = false;
  });
  dialog.addEventListener('close', () => {
    active = null;
    if (originalOverflow) {
      document.body.style.overflow = originalOverflow.body;
      document.documentElement.style.overflow = originalOverflow.html;
      originalOverflow = null;
    }
    announce('');
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });
}

function pointerOutsideDialog(event, dialog) {
  const bounds = dialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX > bounds.right ||
    event.clientY < bounds.top || event.clientY > bounds.bottom;
}
