'use strict';
const courses = [
  {id:'concept-1',title:'新概念英语 1',category:'foundation',label:'从零开始 · 打好基础',color:'yellow',book:'新概念',english:'FIRST THINGS FIRST',number:'1',badge:'入门推荐',description:'从基础词汇到日常对话，让英语成为你生活的一部分。',level:'基础入门',detail:'从简单的词汇、句型和日常对话入手，建立英语学习的基础。适合刚开始学习，或希望重新梳理基础的同学。',topics:['学习常用词汇与基本句型','理解日常对话，练习基础表达','逐步建立语法知识框架'],audience:'适合零基础、初学者，以及想系统巩固基础的学习者。',keywords:'new concept first things first 初级 零基础'},
  {id:'concept-2',title:'新概念英语 2',category:'foundation',label:'稳步进阶 · 自信表达',color:'orange',book:'新概念',english:'PRACTICE & PROGRESS',number:'2',badge:'进阶之选',description:'跟着短文理解语法，把学过的知识变成自然的表达。',level:'进阶提升',detail:'通过短文阅读和语法梳理，把零散的知识连接起来。学习在语境中理解句子，并练习更完整的英语表达。',topics:['读懂短篇故事，积累表达方式','在语境中理解和巩固语法','练习从理解到复述、写作的转化'],audience:'适合已有基础，希望系统提升阅读、语法与表达能力的学习者。',keywords:'new concept practice progress 中级'},
  {id:'graduate',title:'考研英语',category:'exam',label:'明确方向 · 扎实备考',color:'blue',book:'考研<br>英语',english:'THINK BIGGER',number:'✦',badge:'考试备考',description:'梳理词汇、长难句与阅读思路，给备考一个清晰方向。',level:'考研备考',detail:'围绕考研英语的阅读、词汇和写作能力，建立清晰的学习方向。通过理解句子结构和文章逻辑，练习有方法地阅读。',topics:['积累核心词汇，梳理长难句','练习阅读理解与文章逻辑分析','学习写作结构与表达组织'],audience:'适合准备考研英语，希望梳理基础与备考方法的同学。',keywords:'graduate postgraduate'},
  {id:'ielts',title:'雅思阅读',category:'exam',label:'读懂世界 · 打开新门',color:'lilac',book:'雅思<br>阅读',english:'READ THE WORLD',number:'↗',badge:'IELTS 专项',description:'用有条理的阅读方法，练习定位信息、理解文章与题型。',level:'雅思备考',detail:'认识雅思阅读的常见题型，学习略读、寻读与信息定位。通过有针对性的练习，逐步掌握阅读思路。',topics:['练习略读与寻读，定位关键信息','理解常见题型与答题思路','建立适合自己的阅读练习习惯'],audience:'适合准备雅思考试，希望加强阅读方法与题型理解的学习者。',keywords:'ielts reading'}
];
const grid = document.querySelector('#course-grid');
const search = document.querySelector('#search');
const dialog = document.querySelector('#course-dialog');
const dialogContent = document.querySelector('#dialog-content');
let currentFilter = 'all';
let returnFocus = null;
function renderCourses() {
  const query = search.value.trim().toLowerCase();
  const visible = courses.filter(c => (currentFilter === 'all' || c.category === currentFilter) && `${c.title} ${c.description} ${c.level} ${c.keywords}`.toLowerCase().includes(query));
  grid.innerHTML = visible.map(c => `<article class="course-card"><div class="card-top"><span class="course-icon ${c.color}" aria-hidden="true">${c.id === 'graduate' ? '研' : c.id === 'ielts' ? '雅' : c.number}</span><span class="card-level">${c.level}</span></div><h3>${c.title}</h3><p>${c.description}</p><div class="card-bottom"><button data-course="${c.id}" aria-label="了解${c.title}">了解课程 <span aria-hidden="true">→</span></button></div></article>`).join('');
  document.querySelector('.empty').hidden = visible.length > 0;
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b => {b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button));});
  renderCourses();
}));
search.addEventListener('input', renderCourses);
function openDialog(markup) {
  if (!dialog.open) returnFocus = document.activeElement;
  dialogContent.innerHTML = markup;
  if (!dialog.open) dialog.showModal();
}
function showCourse(course) {
  openDialog(`<div class="dialog-eyebrow">OXYGEN · ${course.label}</div><h2 id="dialog-title">${course.title}</h2><div class="dialog-tags"><span>${course.level}</span><span>Turgun 主讲</span></div><div class="dialog-tabs" role="tablist" aria-label="课程介绍"><button id="overview-tab" class="selected" role="tab" aria-selected="true" aria-controls="course-panel" tabindex="0" data-tab="overview">课程内容</button><button id="audience-tab" role="tab" aria-selected="false" aria-controls="course-panel" tabindex="-1" data-tab="audience">适合谁学</button></div><div id="course-panel" class="dialog-panel" role="tabpanel" aria-labelledby="overview-tab" tabindex="0"><p>${course.detail}</p><ul>${course.topics.map(t => `<li>${t}</li>`).join('')}</ul></div><button class="button" data-modal-lesson>先体验一小课 <span aria-hidden="true">↗</span></button><p class="dialog-note">报名方式与课程安排尚未公布，后续会在课堂网站更新。</p>`);
  function changeTab(button) {
    const overview = button.dataset.tab === 'overview';
    dialog.querySelectorAll('[data-tab]').forEach(b => {b.classList.toggle('selected', b === button); b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1;});
    const panel = document.querySelector('#course-panel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.innerHTML = overview ? `<p>${course.detail}</p><ul>${course.topics.map(t => `<li>${t}</li>`).join('')}</ul>` : `<p>${course.audience}</p><p>如果你还不确定自己的基础，可以先体验下面的英语小练习，找到学习的感觉。</p>`;
  }
  dialog.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => changeTab(button));
    button.addEventListener('keydown', event => {if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {event.preventDefault(); const buttons = [...dialog.querySelectorAll('[data-tab]')]; const next = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons[1] : buttons.find(b => b !== button); changeTab(next); next.focus();}});
  });
  dialog.querySelector('[data-modal-lesson]').addEventListener('click', showLesson);
}
function showLesson() {
  openDialog('<div class="dialog-eyebrow">ONE SMALL STEP · 一分钟英语</div><h2 id="dialog-title">把经历，说成一句英语。</h2><p>“我教英语已经八年了。”<br>从过去开始、持续到现在的经历，可以怎样表达？</p><div class="lesson-sentence">I <span id="answer-blank">_____</span> English<br>for eight years.</div><div class="lesson-question">选择合适的表达：</div><div class="answers" role="group" aria-label="选择填空答案"><button data-answer="teach">teach</button><button data-answer="have taught">have taught</button><button data-answer="am teaching">am teaching</button></div><div class="lesson-feedback" role="status" aria-live="polite">选一个答案，看看你的理解。</div><div class="lesson-footer"><button class="listen-button" id="listen">▷ 听一听完整句子</button><button class="button" id="lesson-browse">探索课程 <span aria-hidden="true">↗</span></button></div>');
  dialog.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    const correct = button.dataset.answer === 'have taught';
    dialog.querySelectorAll('[data-answer]').forEach(b => b.classList.remove('correct','wrong'));
    button.classList.add(correct ? 'correct' : 'wrong');
    button.setAttribute('aria-pressed', 'true');
    dialog.querySelectorAll('[data-answer]').forEach(b => {if (b !== button) b.setAttribute('aria-pressed','false');});
    document.querySelector('#answer-blank').textContent = correct ? 'have taught' : '_____';
    document.querySelector('.lesson-feedback').textContent = correct ? '答对了！“have taught” 是现在完成时。have / has + 过去分词，配合 for eight years，表达从过去延续到现在的经历。' : '再试试。“已经八年了”强调从过去到现在的持续经历，这里需要用现在完成时：have / has + 过去分词。';
  }));
  document.querySelector('#listen').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {document.querySelector('.lesson-feedback').textContent = '当前浏览器暂不支持朗读。你可以自己读一读：I have taught English for eight years.'; return;}
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('I have taught English for eight years.');
    utterance.lang = 'en-GB'; utterance.rate = .85;
    const voice = window.speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => {if (dialog.open) document.querySelector('.lesson-feedback').textContent = '朗读暂时不可用。你可以自己读一读：I have taught English for eight years.';};
    window.speechSynthesis.speak(utterance);
  });
  document.querySelector('#lesson-browse').addEventListener('click', () => {dialog.close(); document.querySelector('#courses').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});});
}
grid.addEventListener('click', event => {const button = event.target.closest('[data-course]'); if (button) showCourse(courses.find(c => c.id === button.dataset.course));});
document.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', showLesson));
document.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {if ('speechSynthesis' in window) window.speechSynthesis.cancel(); if (returnFocus?.isConnected) returnFocus.focus();});
dialog.addEventListener('click', event => {if (event.target === dialog) {const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();}});
document.querySelector('#year').textContent = new Date().getFullYear();
renderCourses();
