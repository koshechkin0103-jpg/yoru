// Общее для страниц магазина: шапка (MENU на телефоне) и счётчик CART.
import { initCartCount } from './cart.js?v=5dd84f80';

// BACK: возвращает туда, откуда пришли (модели, коллекции, корзина), а не всегда к коллекциям.
// Пришли не с сайта (по ссылке, из закладки) — обычный переход по href.
function initBackLinks() {
  document.querySelectorAll('.shop-back').forEach((a) => a.addEventListener('click', (e) => {
    let same = false;
    try { same = new URL(document.referrer).origin === location.origin; } catch {}
    if (!same || history.length < 2 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    history.back();
  }));
}

export function initTopbar() {
  initCartCount();
  initBackLinks();
  const bar = document.querySelector('.topbar');
  const btn = bar?.querySelector('.topbar__menu');
  if (!btn) return;
  const set = (open) => {
    bar.classList.toggle('topbar--open', open);
    document.documentElement.classList.toggle('bar-open', open);   // прокрутка под меню стоит
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'CLOSE' : 'MENU';
  };
  btn.addEventListener('click', () => set(!bar.classList.contains('topbar--open')));
  bar.querySelectorAll('.topbar__links a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bar.classList.contains('topbar--open')) { set(false); btn.focus(); } });
  matchMedia('(min-width: 1200px)').addEventListener('change', () => set(false));
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Главная: закреплённая шапка. При прокрутке вниз скрыта, стоит чуть прокрутить вверх — появляется.
// В первом экране её нет — там своя шапка.
export function initFloatingBar() {
  const bar = document.querySelector('.topbar--float');
  const hero = document.getElementById('hero');
  if (!bar) return;
  let last = window.scrollY, shown = false;
  // высота первого экрана — измеряется при изменении окна, а не при каждом событии прокрутки
  // (замер заставлял браузер пересчитывать раскладку всей страницы прямо во время прокрутки)
  let heroH = 0;
  const measure = () => { heroH = hero?.offsetHeight || window.innerHeight; };
  measure();
  window.addEventListener('resize', measure);
  if (hero && 'ResizeObserver' in window) new ResizeObserver(measure).observe(hero);   // догрузились шрифты и т. п.
  const set = (on) => {
    if (on === shown) return;
    shown = on;
    bar.classList.toggle('is-shown', on);
    if (!on) {   // спрятали — закрыть и мобильное меню
      bar.classList.remove('topbar--open');
      document.documentElement.classList.remove('bar-open');
      const btn = bar.querySelector('.topbar__menu');
      if (btn) { btn.textContent = 'MENU'; btn.setAttribute('aria-expanded', 'false'); }
    }
  };
  const onScroll = () => {
    if (bar.classList.contains('topbar--open')) return;   // открыто меню — не трогаем
    const y = window.scrollY;
    const top = heroH * 0.8;
    if (y < top) set(false);
    else if (y < last - 6) set(true);     // чуть прокрутили вверх
    else if (y > last + 6) set(false);    // прокручивают вниз
    if (Math.abs(y - last) > 6) last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  bar.addEventListener('focusin', () => set(true));   // с клавиатуры — видна
}
