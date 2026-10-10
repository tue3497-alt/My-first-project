import { initActivities } from './activities.js?v=4';

initActivities();
document.querySelector('#year').textContent = new Date().getFullYear();

// CSS handles smooth scrolling and the reduced-motion preference. Anchor links
// remain fully functional without JavaScript. Give keyboard visitors a clear
// destination after they choose a section from the header.
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    const section = document.querySelector(hash);
    if (!section) return;
    const target = hash === '#classroom' ? document.querySelector('#classroom-stage') : section;
    if (target !== document.querySelector('#classroom-stage')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});
