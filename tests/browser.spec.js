import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'iPad portrait', width: 1024, height: 1366 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'small phone', width: 375, height: 812 },
];

async function openActivity(page, name) {
  const trigger = page.locator(`button[data-activity="${name}"]`).filter({ visible: true }).last();
  await trigger.click();
  await expect(page.locator('#activity-dialog')).toBeVisible();
  return trigger;
}

async function closeActivity(page) {
  await page.locator('#activity-close').click();
  await expect(page.locator('#activity-dialog')).not.toBeVisible();
}

for (const viewport of viewports) {
  test(`layout, navigation, and content work on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/A little English\.\s*A bigger world\./);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 245, 240)');
    await expect(page.getByRole('heading', { name: 'Beginner English', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Everyday Speaking', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'IELTS Preparation', exact: true })).toBeVisible();
    await expect(page.locator('#courses')).toContainText(/sample/i);
    await expect(page.locator('#about')).toContainText('Turgun');
    await expect(page.locator('#about')).toContainText(/8|eight/i);
    await expect(page.locator('#about')).toContainText(/KTH|Royal Institute of Technology/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.getByRole('link', { name: 'Explore Classroom', exact: true }).first().click();
    await expect(page).toHaveURL(/#classroom$/);
    await expect.poll(() => page.locator('#classroom').evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(160);
    await expect(page.locator('#classroom')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('classroom has accessible HTML entries for every activity and restores focus on close', async ({ page }) => {
  await page.goto('/#classroom');
  for (const activity of ['lesson', 'vocabulary', 'quiz']) {
    const trigger = await openActivity(page, activity);
    await page.keyboard.press('Escape');
    await expect(page.locator('#activity-dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
});

test('board lesson gives useful feedback for incorrect and correct answers', async ({ page }) => {
  await page.goto('/#classroom');
  const trigger = page.locator('button[data-activity="lesson"]').last();
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#activity-dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A small introduction', exact: true })).toBeVisible();
  await page.locator('[data-lesson-answer="incorrect"]').click();
  await expect(page.locator('#lesson-feedback')).toContainText(/try|almost|need|missing|remember/i);
  await page.locator('[data-lesson-answer="correct"]').click();
  await expect(page.locator('#lesson-feedback')).toContainText(/exactly|correct|well done|that.s right/i);
  await closeActivity(page);
  await expect(trigger).toBeFocused();
});

test('vocabulary flashcards flip, navigate all five words, and restart', async ({ page }) => {
  await page.goto('/#classroom');
  await openActivity(page, 'vocabulary');
  const content = page.locator('#activity-content');
  await expect(content).toContainText('curious');
  await expect(content.locator('[data-action="previous"]')).toBeDisabled();
  await expect(content.locator('.flashcard-definition')).not.toBeVisible();
  await content.locator('[data-action="flip"]').click();
  await expect(content.locator('.flashcard-definition')).toBeVisible();
  await content.locator('[data-action="flip"]').click();
  await expect(content.locator('.flashcard-definition')).not.toBeVisible();

  for (const word of ['practise', 'confidence', 'opportunity', 'explore']) {
    await content.locator('[data-action="next-card"]').click();
    await expect(content).toContainText(word);
    await expect(content.locator('.flashcard-definition')).not.toBeVisible();
  }
  await expect(content.locator('[data-action="next-card"]')).toBeDisabled();
  await content.locator('[data-action="previous"]').click();
  await expect(content).toContainText('opportunity');
  await content.locator('[data-action="flip"]').click();
  await content.locator('[data-action="restart-cards"]').click();
  await expect(content).toContainText('curious');
  await expect(content.locator('[data-action="previous"]')).toBeDisabled();
  await expect(content.locator('.flashcard-definition')).not.toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(content).toContainText('practise');
  await page.keyboard.press('ArrowLeft');
  await expect(content).toContainText('curious');
  await closeActivity(page);
});

test('quiz scores three answers once each and restarts cleanly', async ({ page }) => {
  await page.goto('/#classroom');
  await openActivity(page, 'quiz');
  const content = page.locator('#activity-content');
  const choices = [0, 0, 1]; // One incorrect answer, followed by two correct answers.
  for (let index = 0; index < choices.length; index += 1) {
    const check = content.locator('#check-answer');
    await expect(check).toBeDisabled();
    await content.locator(`[data-quiz-choice="${choices[index]}"]`).check();
    await expect(check).toBeEnabled();
    await check.click();
    await expect(content.locator('.activity-feedback')).toContainText(index ? /correct|well done|right/i : /try|almost|correct answer|not quite/i);
    for (const option of await content.locator('[data-quiz-choice]').all()) await expect(option).toBeDisabled();
    await expect(content.locator('#check-answer')).toHaveCount(0);
    const feedback = await content.locator('.activity-feedback').textContent();
    await content.locator('#quiz-form').evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
    await expect(content.locator('.activity-feedback')).toHaveText(feedback);
    await content.locator('[data-action="next-question"]').click();
  }
  await expect(content.locator('.quiz-score')).toContainText(/2\s*(?:\/|out of)\s*3/);
  await content.locator('[data-action="restart-quiz"]').click();
  await expect(content.locator('#check-answer')).toBeDisabled();
  await expect(content.locator('[data-quiz-choice]')).toHaveCount(3);
  for (const choice of [1, 0, 1]) {
    await content.locator(`[data-quiz-choice="${choice}"]`).check();
    await content.locator('#check-answer').click();
    await content.locator('[data-action="next-question"]').click();
  }
  await expect(content.locator('.quiz-score')).toContainText(/3\s*(?:\/|out of)\s*3/);
  await closeActivity(page);
});

test('activities remain readable and closeable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#classroom');
  for (const activity of ['lesson', 'vocabulary', 'quiz']) {
    await openActivity(page, activity);
    await expect(page.locator('#activity-close')).toBeInViewport();
    expect(await page.locator('#activity-dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth + 1)).toBe(true);
    await closeActivity(page);
  }
});

test('WebGL draws the classroom without GL errors', async ({ page }) => {
  const errors = [];
  const thirdPartyRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).hostname !== '127.0.0.1') thirdPartyRequests.push(request.url());
  });
  await page.goto('/#classroom');
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  const canvas = page.locator('#classroom-canvas');
  await expect(canvas).toBeVisible();
  const state = await canvas.evaluate((element) => {
    const gl = element.getContext('webgl2') || element.getContext('webgl');
    return { width: element.width, height: element.height, error: gl?.getError(), noError: gl?.NO_ERROR };
  });
  expect(state.width).toBeGreaterThan(300);
  expect(state.height).toBeGreaterThan(150);
  expect(state.error).toBe(state.noError);
  await expect(page.locator('#classroom-reset')).toBeEnabled();
  await page.locator('#classroom-reset').click();
  expect(errors).toEqual([]);
  expect(thirdPartyRequests).toEqual([]);
});

test('the board, book, and desk meshes themselves open their activities', async ({ page }) => {
  await page.goto('/#classroom');
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  const titles = { lesson: 'A small introduction', vocabulary: 'Words for a bigger world', quiz: 'A little English check-in' };
  for (const [activity, title] of Object.entries(titles)) {
    const marker = page.locator(`#classroom-hotspots [data-activity="${activity}"]`);
    await expect.poll(() => marker.evaluate((element) => Number.parseFloat(element.style.left) || 0)).toBeGreaterThan(0);
    const point = await marker.evaluate((element) => {
      const stage = document.querySelector('#classroom-stage').getBoundingClientRect();
      return { x: stage.left + Number.parseFloat(element.style.left), y: stage.top + Number.parseFloat(element.style.top) };
    });
    await page.locator('#classroom-hotspots').evaluate((element) => { element.style.visibility = 'hidden'; });
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('#activity-dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await closeActivity(page);
    await expect(page.locator('#classroom-stage')).toBeFocused();
    await page.locator('#classroom-hotspots').evaluate((element) => { element.style.visibility = ''; });
  }
});

test('limited camera controls work while wheel scrolling stays natural', async ({ page }) => {
  await page.goto('/#classroom');
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  const marker = page.locator('#classroom-hotspots [data-activity="lesson"]');
  await expect.poll(() => marker.evaluate((element) => Number.parseFloat(element.style.left) || 0)).toBeGreaterThan(0);
  const initialLeft = await marker.evaluate((element) => Number.parseFloat(element.style.left));
  await page.locator('#classroom-stage').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => marker.evaluate((element) => Number.parseFloat(element.style.left))).not.toBe(initialLeft);
  await page.keyboard.press('Home');
  await expect.poll(() => marker.evaluate((element) => Number.parseFloat(element.style.left))).toBe(initialLeft);
  await expect(page.locator('#classroom-canvas')).toHaveCSS('touch-action', 'pan-y');
  const beforeScroll = await page.evaluate(() => window.scrollY);
  await page.locator('#classroom-canvas').hover({ position: { x: 20, y: 20 } });
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeScroll + 100);
});

test('reduced motion retains the classroom and working activities', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#classroom');
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  await openActivity(page, 'lesson');
  await closeActivity(page);
});

test('WebGL unavailable displays an attractive fallback with all activities still usable', async ({ page }) => {
  const threeRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/vendor/three/')) threeRequests.push(request.url());
  });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (/webgl/i.test(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto('/#classroom');
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'fallback', { timeout: 20_000 });
  await expect(page.locator('#classroom-stage')).toBeVisible();
  for (const activity of ['lesson', 'vocabulary', 'quiz']) {
    await openActivity(page, activity);
    await closeActivity(page);
  }
  expect(threeRequests).toEqual([]);
});

test('site assets and classroom work from a GitHub Pages project subdirectory', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/My-first-project/**', async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/^\/My-first-project\//, '/');
    const response = await route.fetch({ url: url.href });
    await route.fulfill({ response });
  });
  await page.goto('/My-first-project/#classroom');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/A little English\.\s*A bigger world\./);
  await expect(page.locator('#classroom-stage')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  await openActivity(page, 'vocabulary');
  await closeActivity(page);
  expect(errors).toEqual([]);
});
