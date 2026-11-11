// Бейджи первого экрана «SHIPS FROM TOKYO…» и «200 PER MODEL ONLY…». Буквы появляются по одной «пикселем»:
// сначала белый квадрат, затем буква (0,5 с).
// Телефон и планшет: один бейдж справа — тексты сменяют друг друга каждые 5 с.
// Десктоп: бейджи на своих местах — при первом заходе за сеанс оба набираются один раз.

import { split, pixelIn, pixelOut, seen, markSeen, pageKey } from './typing.js?v=75b219fd';

const PERIOD = 5000;   // мс между сменами
const IN = 500;        // мс — появление всех букв
const OUT = 250;       // мс — исчезновение

export function initBadgeSwap(hero) {
  const narrow = matchMedia('(max-width: 1199.98px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const badges = [hero.querySelector('.badge--ships'), hero.querySelector('.badge--limit')].filter(Boolean);
  if (badges.length < 2) return;
  const spans = badges.map((b) => b.querySelector('span'));
  let timer = null, run = 0, current = 0;

  async function swap(id) {
    const from = current, to = 1 - current;
    if (!reduced.matches) {
      const out = split(spans[from]);
      out.forEach((c) => c.classList.add('is-on'));   // текст на экране — гасим буквы с конца
      await pixelOut(out, OUT);
    }
    if (id !== run) return;
    badges[from].classList.remove('is-shown');
    const chars = split(spans[to]);
    badges[to].classList.add('is-shown');
    current = to;
    if (reduced.matches) chars.forEach((c) => c.classList.add('is-on'));
    else await pixelIn(chars, IN);
  }

  function start() {
    stop();
    const id = ++run;
    hero.classList.add('badge-swap');
    current = 0;
    badges[0].classList.add('is-shown');
    badges[1].classList.remove('is-shown');
    timer = setInterval(() => swap(id), PERIOD);
  }
  function stop() {
    run++;
    clearInterval(timer);
    hero.classList.remove('badge-swap');
    badges.forEach((b) => b.classList.remove('is-shown'));
    spans.forEach((s) => { if (s.dataset.html) s.innerHTML = s.dataset.html; });   // исходный текст для десктопа
  }
  // десктоп: оба бейджа набираются один раз — при первом заходе за сеанс, без повторов
  function startDesktop() {
    stop();
    const key = `${pageKey()}|badges`;
    if (reduced.matches || seen(key)) return;
    markSeen(key);
    spans.forEach((s) => pixelIn(split(s), IN));
  }
  const apply = () => (narrow.matches ? start() : startDesktop());
  narrow.addEventListener('change', apply);
  apply();
}
