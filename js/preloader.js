// Прелоудер главной (по примеру hatamex.agency, в фирменном стиле): только при первом заходе за сеанс.
// 1) красные пиксели в случайном порядке заливают экран сверху вниз;
// 2) знак YORU, тонкая полоса и счётчик процентов — проценты идут за настоящей загрузкой
//    (шрифты, страница, первый кадр куртки), не меньше MIN_UI мс и не дольше MAX_TOTAL мс от начала;
// 3) на 100 % рядом со знаком по буквам набирается «YORU»;
// 4) пиксели исчезают снизу вверх — сквозь них проступает первый экран.
// Класс .intro на <html> ставит скрипт в <head>; без него (повторный заход, «уменьшить движение») заставки нет.
import { split, pixelIn } from './typing.js?v=75b219fd';

const FILL = 900;        // мс — заливка пикселями
const MIN_UI = 900;      // мс — счётчик виден не меньше
const MAX_TOTAL = 6500;  // мс — дольше заставка не держит, даже если что-то не догрузилось
const HOLD = 600;        // мс — логотип целиком
const CLEAR = 850;       // мс — уход пикселей
const RED = '#B53031';

const root = document.documentElement;
const pre = document.getElementById('preloader');
const active = () => root.classList.contains('intro') && !!pre;

// Сайт: что запускать только после заставки (анимации первого экрана)
export const introActive = active;
export function onIntroDone(cb) {
  if (!active()) cb();
  else window.addEventListener('yoru:intro-done', cb, { once: true });
}

// Что ждём для 100 %: шрифты, загрузку страницы и первый кадр куртки (его объявляет js/jacket.js или js/main.js)
const tasks = [
  document.fonts?.ready ?? Promise.resolve(),
  document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true })),
  new Promise((r) => window.addEventListener('yoru:first-frame', r, { once: true })),
];
let done = 0;
tasks.forEach((t) => t.then(() => { done++; }));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(r));

if (active()) run();

async function run() {
  try { sessionStorage.setItem('yoru-intro', '1'); } catch { /* приватный режим — покажем и в следующий раз */ }
  const t0 = performance.now();
  const canvas = pre.querySelector('.preloader__canvas');
  const ctx = canvas.getContext('2d');
  const W = window.innerWidth, H = window.innerHeight;
  const cell = Math.max(12, Math.round(W / 72));
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  canvas.width = W; canvas.height = H;
  const cells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push({ x, y });

  // 1. заливка сверху вниз: порядок — по строке с разбросом
  ctx.fillStyle = RED;
  await animate(cells.map((c) => ({ c, k: c.y / rows + Math.random() * 0.45 })).sort((a, b) => a.k - b.k).map((o) => o.c), FILL,
    (c) => ctx.fillRect(c.x * cell, c.y * cell, cell + 1, cell + 1));
  ctx.fillRect(0, 0, W, H);   // без щелей
  pre.classList.add('is-full', 'is-ui');

  // 2. счётчик загрузки
  const count = pre.querySelector('.preloader__count');
  const bar = pre.querySelector('.preloader__bar');
  const shown = performance.now();
  let p = 0;
  for (;;) {
    const now = performance.now();
    const timeUp = now - t0 > MAX_TOTAL;
    const ready = (done === tasks.length || timeUp) && now - shown > MIN_UI;
    // цель — доля готового; пока ждём, понемногу ползём вперёд, но не дальше 90 %
    const target = ready ? 1 : Math.max(done / tasks.length * 0.9, Math.min(0.9, (now - shown) / 4000));
    p += (target - p) * (ready ? 0.18 : 0.06);
    if (ready && p > 0.995) p = 1;
    count.textContent = `${Math.round(p * 100)}%`;
    bar.style.setProperty('--p', p.toFixed(3));
    if (p >= 1) break;
    await Promise.race([frame(), wait(50)]);   // во вкладке в фоне кадров нет — не застреваем
  }

  // 3. логотип: знак раскрывается в «YORU», буквы набираются
  const word = pre.querySelector('.preloader__word');
  word.classList.add('typing');
  const chars = split(word);
  pre.classList.add('is-logo');
  await wait(250);
  await pixelIn(chars, 450);
  await wait(HOLD);

  // 4. уход: логотип гаснет, пиксели исчезают снизу вверх
  pre.classList.add('is-out');
  await wait(200);
  await animate(cells.map((c) => ({ c, k: (rows - 1 - c.y) / rows + Math.random() * 0.45 })).sort((a, b) => a.k - b.k).map((o) => o.c), CLEAR,
    (c) => ctx.clearRect(c.x * cell, c.y * cell, cell + 1, cell + 1));
  root.classList.remove('intro');
  pre.remove();
  window.dispatchEvent(new Event('yoru:intro-done'));
}

// Рисует клетки по порядку за duration мс (сначала реже, к концу гуще)
async function animate(list, duration, draw) {
  const start = performance.now();
  let k = 0;
  while (k < list.length) {
    const t = Math.min(1, (performance.now() - start) / duration);
    const upto = Math.floor(list.length * t ** 0.8);
    for (; k < upto; k++) draw(list[k]);
    if (t >= 1) { for (; k < list.length; k++) draw(list[k]); break; }
    await Promise.race([frame(), wait(50)]);
  }
}
