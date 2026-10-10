# Oxygen English

A calm, frontend-only English teaching website in warm ivory (`#F7F5F0`), charcoal (`#242824`), and muted sage (`#8FA99B`). Built with the repository’s existing HTML/CSS/JavaScript structure and a locally vendored Three.js classroom.

## Run and preview

Use Node.js 20 or later, then run these commands from the repository directory:

```sh
npm ci
npm start
```

Open `http://localhost:3000` in a browser **on the computer running the server**. There is no compilation or production build step: the browser loads the static files directly. `npm start` itself does not require the test dependencies to be installed.

An alternative, if you already have Python, is:

```sh
python3 -m http.server 3000
```

For an iPad on the same Wi-Fi network as your computer, run:

```sh
npm start -- --host 0.0.0.0
```

Then open `http://YOUR-COMPUTER-LAN-IP:3000` on the iPad, substituting your computer’s local network address. `localhost` on an iPad refers to the iPad itself. A server running inside the Codex cloud workspace requires a supported forwarded port or a published website to reach it from your iPad.

This repository’s existing GitHub Pages address is:

https://tue3497-alt.github.io/My-first-project/

GitHub Pages publishes static files from `main` at `/ (root)`. `.nojekyll` is retained. All runtime asset paths are relative, so the site works under a GitHub Pages project subdirectory.

## Explore the classroom

- **Board:** a short introduction lesson, with a practice question and feedback.
- **Book:** five vocabulary flashcards. Reveal meanings, move between words, and start again.
- **Desk:** three English questions with explanations, a score out of three, and restart.

Click the objects or their labels in the 3D room, or use the three HTML activity buttons directly beneath it. Modals have a close button, support Escape, and return focus to the opener. The quiz has native radio controls and the flashcards support arrow keys.

Drag horizontally to gently look around. Touch controls leave vertical page scrolling available. Arrow keys and Reset view provide alternative camera controls. Mouse-wheel scrolling stays with the page.

The course descriptions are explicitly marked as **sample outlines**. Teacher information uses the supplied facts: Turgun, eight years of teaching experience, and currently a master’s student at KTH Royal Institute of Technology. There are no invented prices, testimonials, grades, or learning results. No login, payment, storage, or backend service is included.

## Validation

```sh
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

`check` validates JavaScript syntax; `test` runs the six Node state tests for quiz scoring, duplicate submissions, restart, and flashcard navigation. Playwright covers responsive layouts, activities, keyboard/focus handling, real mesh clicks, camera and scrolling controls, WebGL fallback, reduced motion, and a GitHub Pages subdirectory.

To use an existing Chromium installation instead of downloading Playwright’s browser:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

The cloud environment has Chromium at that path. Browser checks use software rendering in Chromium. Physical iPad Safari and device GPU performance have not been verified.

## Files and performance

- `index.html`, `styles.css`, `app.js`: the site and native section navigation.
- `scene.js`: procedural room, camera controls, raycasting, and fallback handling.
- `activities.js`, `learning.js`: accessible activities and immutable quiz/flashcard models.
- `classroom-fallback.svg`: the local classroom illustration when 3D is unavailable.
- `vendor/three/`: unmodified Three.js 0.180.0 ESM files, MIT license, and provenance/integrity notes.
- `tests/`: state and browser tests; `scripts/serve.mjs`: development file server.

Three.js is loaded only when the classroom approaches the viewport. The room uses procedural geometry and textures, shared materials, instanced furniture parts, capped pixel ratio, and demand-based rendering. There is no continuous animation loop, so reduced-motion preferences and offscreen operation do not require background animation. If WebGL2 is unavailable or rendering fails, the static classroom illustration and all HTML activities remain usable. No external fonts, models, CDN requests, or paid assets are required at runtime.
