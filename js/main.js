import { Jacket } from './jacket.js?v=77541661';
import { initLots, buildField, initReveal, initJourney, initDepth } from './journey.js?v=523d6b46';
import { initReveals, initDrift, initSignup, initCardLinks } from './blocks.js?v=d7074ac2';
import { initBadgeSwap } from './badge.js?v=cba734cd';
import { initTopbar, initFloatingBar } from './shop.js?v=215ca003';
import { initTyping } from './typing.js?v=75b219fd';
import { initPixelReveal } from './pixel-reveal.js?v=70d64e08';
import { introActive, onIntroDone } from './preloader.js?v=7b1bb630';

const page = document.getElementById('page');
const root = document.documentElement;

// первый экран телефона: бейджи «SHIPS FROM TOKYO» и «200 PER MODEL» сменяют друг друга
onIntroDone(() => initBadgeSwap(document.getElementById('hero')));   // после прелоудера
// закреплённая шапка: скрыта при прокрутке вниз, появляется при прокрутке вверх; CART (n) — число вещей в корзине
initTopbar();
initFloatingBar();

// фото Brand philosophy и блока достижений появляются пиксельными квадратами
initPixelReveal(document.querySelectorAll('.philosophy__photo, .honors__photo'));

// тексты блоков набираются по буквам, когда появляются на экране
initTyping([
  document.querySelector('.sides__lead'),
  document.querySelector('.models__lead'),
  document.querySelector('.philosophy__text'),
  ...document.querySelectorAll('.collections__meta li'),
  document.querySelector('.honors__award'),
  document.querySelector('.honors__note'),
]);

// Слайдер → поле с куртками → блок моделей (секция после первых двух экранов)
const journey = document.getElementById('journey');
let stopJourney = null;     // десктоп: «прилипающая» сцена
let stopReveal = null;      // без анимации: появление курток при прокрутке
let stopDepth = null;       // телефон/планшет: куртки разлетаются из глубины (Depth Zoom)
if (journey) {
  buildField(journey.querySelector('.field'));
  initLots(journey);
}

// «Brand philosophy» и «Collections»: квадратики карточек и появление при прокрутке
const collections = document.getElementById('collections');
if (collections) initLots(collections);
initCardLinks();
initReveals();

// Достижения (параллакс боковых фото — только в полном режиме) и форма подписки
const honors = document.getElementById('honors');
let stopDrift = null;
const signupForm = document.querySelector('.signup__card');
if (signupForm) initSignup(signupForm);

// Режимы:
//   full   — композиция из макета (от 1200 px), мышь, без prefers-reduced-motion: все сцены и плавная прокрутка;
//   mobile — телефон и планшет (до 1200 px): куртка переворачивается по центру, фото слайдера — стопкой,
//            куртки поля разлетаются (Depth Zoom); прокрутка обычная;
//   static — «уменьшить движение» или большой сенсорный экран: статичные куртки, библиотеки не грузятся.
const wide = matchMedia('(min-width: 1200px) and (hover: hover) and (pointer: fine)');
const narrow = matchMedia('(max-width: 1199.98px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// Библиотеки нужны только в режимах full и mobile — подгружаем их по требованию, по порядку
const LIBS = [
  'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollToPlugin.min.js',
  'https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.min.js',
];
const loadScript = (src) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = reject;
  document.head.append(s);
});
let libs = null;
function loadLibs() {
  libs ??= LIBS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve()).then(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    // при изменении окна Lenis пересчитывает границы прокрутки вместе со ScrollTrigger
    ScrollTrigger.addEventListener('refreshInit', () => lenis?.resize());
  });
  return libs;
}

let jacket = null;

// Плавная прокрутка (Lenis): колесо мыши в Windows листает скачками по ~100 px,
// и куртка со сменой стороны повторяла эти скачки. Lenis превращает их в равномерное движение.
let lenis = null;
const lenisRaf = (time) => lenis.raf(time * 1000);
function startSmoothScroll() {
  if (lenis || typeof Lenis === 'undefined') return;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
  if (introActive()) { lenis.stop(); onIntroDone(() => lenis?.start()); }   // под прелоудером страница стоит
}
function stopSmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(lenisRaf);
  lenis.destroy();
  lenis = null;
}

let mode = null;
function teardown() {
  jacket?.stop(); jacket = null;
  stopJourney?.(); stopJourney = null;
  stopDrift?.(); stopDrift = null;
  stopDepth?.(); stopDepth = null;
  stopReveal?.(); stopReveal = null;
  stopSmoothScroll();
}
async function applyMode() {
  const next = reduced.matches ? 'static' : wide.matches ? 'full' : narrow.matches ? 'mobile' : 'static';
  if (next === mode) { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); return; }
  teardown();
  mode = next;
  root.classList.toggle('is-static', next === 'static');
  if (next !== 'static') {
    try { await loadLibs(); } catch { mode = 'static'; root.classList.add('is-static'); }   // нет сети до CDN — статичные куртки
    if (mode !== next) return;                                                          // режим сменился, пока грузились
  }
  if (mode === 'full') {
    jacket = new Jacket(page);
    jacket.start();
    if (journey) stopJourney = initJourney(journey, { ScrollTrigger });
    if (honors) stopDrift = initDrift(honors, { ScrollTrigger });
    startSmoothScroll();
  } else if (mode === 'mobile') {
    jacket = new Jacket(page, { mobile: true });
    jacket.start();
    if (journey) stopDepth = initDepth(journey.querySelector('.field'), { ScrollTrigger });
  } else {
    if (journey) stopReveal = initReveal(journey.querySelector('.field'));
    // статичная куртка первого экрана — главная картинка: грузить сразу и первой
    // (в разметке она «ленивая» — в режимах с анимацией она скрыта и не нужна)
    const heroJacket = document.querySelector('.jacket-anchor--hero .jacket-static');
    if (heroJacket) { heroJacket.fetchPriority = 'high'; heroJacket.loading = 'eager'; }
    window.dispatchEvent(new Event('yoru:first-frame'));   // статичная куртка — прелоудеру ждать нечего
  }
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  jumpToHash();
}

// Переход со страниц магазина (index.html#models и т. п.): сразу к нужному месту — с учётом сцен,
// как при нажатии на пункт меню (например, блок моделей — уже раскрытым)
let hashDone = false;
function jumpToHash() {
  if (hashDone) return;
  hashDone = true;
  const back = restoredScroll();
  if (back != null) {   // вернулись «назад» из карточки товара — на то же место, где были
    if (lenis) lenis.scrollTo(back, { immediate: true, force: true });
    else window.scrollTo(0, back);
    return;
  }
  const name = { '#two-sides': 'sides', '#models': 'models', '#collections': 'collections', '#contacts': 'contacts' }[location.hash];
  if (!name) return;
  const y = navTarget(name);
  if (y == null) return;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

// Возврат на главную кнопкой «назад»: браузер сам вернул бы прокрутку раньше, чем собраны сцены
// (и попал бы не туда), поэтому место запоминаем сами и ставим после сборки.
const SCROLL_KEY = 'yoru-scroll';
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pagehide', () => { try { sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY))); } catch {} });
function restoredScroll() {
  const type = performance.getEntriesByType?.('navigation')[0]?.type;
  if (type !== 'back_forward' && type !== 'reload') return null;
  try { const y = Number(sessionStorage.getItem(SCROLL_KEY)); return y > 0 ? y : null; } catch { return null; }
}

wide.addEventListener('change', applyMode);
narrow.addEventListener('change', applyMode);
reduced.addEventListener('change', applyMode);
document.fonts.ready.then(applyMode);
applyMode();

// Мобильное меню: MENU открывает пункты на весь экран, CLOSE — закрывает
const nav = document.querySelector('.nav');
const burger = nav?.querySelector('.nav__burger');
function setMenu(open) {
  if (!burger) return;
  nav.classList.toggle('nav--open', open);
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.textContent = open ? 'CLOSE' : 'MENU';
}
burger?.addEventListener('click', () => setMenu(!nav.classList.contains('nav--open')));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.classList.contains('nav--open')) { setMenu(false); burger.focus(); } });
matchMedia('(min-width: 1200px)').addEventListener('change', () => setMenu(false));

// Переходы по ссылкам [data-nav]: плавно к блоку, с учётом анимаций полного режима
//   sides — «Two sides matter» (куртка садится в блок, как при ручной прокрутке)
//   models — блок моделей уже раскрытым, после сцены «слайдер → поле»
//   collections, contacts (футер), top — начало страницы
function navTarget(name) {
  if (name === 'top') return 0;
  if (name === 'sides' && jacket) return jacket.landingScroll;
  if (name === 'models' && stopJourney) return stopJourney.end();
  const id = { sides: 'two-sides', models: 'models', collections: 'collections', contacts: 'contacts' }[name];
  const el = id && document.getElementById(id);
  if (!el) return null;
  const y = el.getBoundingClientRect().top + window.scrollY;
  return Math.min(y, document.documentElement.scrollHeight - window.innerHeight);   // футер ниже экрана не уедет — до конца страницы
}
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-nav]');
  if (!link) return;
  const y = navTarget(link.dataset.nav);
  if (y == null) return;
  e.preventDefault();
  setMenu(false);
  const distance = Math.abs(y - window.scrollY);
  const duration = Math.min(2.6, 1.2 + distance / 8000);   // длинные переходы — чуть дольше, но не тянутся
  if (lenis) lenis.scrollTo(y, { duration, easing: easeInOut });
  else if (jacket) gsap.to(window, { duration, ease: 'power2.inOut', scrollTo: y });
  else window.scrollTo({ top: y, behavior: reduced.matches ? 'auto' : 'smooth' });
});
