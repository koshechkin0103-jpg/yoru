// Пиксельное появление фото: поверх фото — сетка квадратов цвета фона; когда фото входит в экран,
// квадраты исчезают в случайном порядке, и снимок «собирается» из пикселей (около 0,45 с).
// Фото в Brand philosophy, в блоке достижений и на страницах товаров.
// Квадраты рисуются на одном canvas (а не сотнями элементов): на телефоне сотни слоёв с текстурой
// перерисовывались каждый кадр, и прокрутка у «Brand philosophy» дёргалась.
import { reducedMotion, seen, markSeen, pageKey } from './typing.js?v=75b219fd';

const DURATION = 450;   // мс — до последнего квадрата
const CELLS = 20;       // квадратов по ширине (по высоте — сколько поместится таких же)
const BG = '#0A0A0F';
const NOISE_TILE = 256; // px — размер плитки шума, как у фона страницы

// текстура шума — та же, что у фона (img/noise.webp); пока не загрузилась — сплошной цвет фона
const noise = new Image();
noise.src = new URL('../img/noise.webp?v=94dc0e2c', import.meta.url).href;

function build(el) {
  const ov = document.createElement('div');
  ov.className = 'pxr';
  ov.setAttribute('aria-hidden', 'true');
  el.append(ov);
  return ov;
}

function reveal(ov) {
  const { width, height } = ov.getBoundingClientRect();
  const size = Math.max(7, width / CELLS);
  const cols = Math.max(1, Math.round(width / size));
  const rows = Math.max(1, Math.round(height / size));

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (noise.complete && noise.naturalWidth) {
    const pattern = ctx.createPattern(noise, 'repeat');
    const k = (NOISE_TILE * dpr) / noise.naturalWidth;
    pattern.setTransform(new DOMMatrix().scale(k, k));
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ov.append(canvas);
  ov.classList.add('pxr--grid');   // сплошной фон слоя → квадраты на canvas

  // клетки сетки в пикселях canvas; края — по целым пикселям, без щелей между соседями
  const cw = canvas.width / cols, ch = canvas.height / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * cw), y0 = Math.floor(r * ch);
      cells.push([x0, y0, Math.ceil((c + 1) * cw) - x0, Math.ceil((r + 1) * ch) - y0]);
    }
  }
  // случайный порядок; в начале квадраты уходят реже, к концу — гуще (как на видео)
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const t0 = performance.now();
  let k = 0;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / DURATION);
    const upto = Math.floor(cells.length * p ** 0.7);
    for (; k < upto; k++) ctx.clearRect(...cells[k]);
    if (p < 1) requestAnimationFrame(step);
    else ov.remove();
  };
  requestAnimationFrame(step);
  // запасной путь (вкладка в фоне — кадры не идут): через секунду фото открыто в любом случае
  setTimeout(() => ov.remove(), DURATION + 300);
}

// Один раз за сеанс: уже открытые в этом сеансе фото (в т. ч. до перехода на страницу товара) показываются сразу.
export function initPixelReveal(elements, name = 'photo') {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const items = [...elements].map((el, i) => ({ el, key: `${pageKey()}|${name}|${i}` }))
    .filter(({ el, key }) => el && !seen(key))
    .map((i) => ({ ...i, ov: build(i.el) }));
  const map = new Map(items.map((i) => [i.el, i]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const { ov, key } = map.get(e.target);
      markSeen(key);
      reveal(ov);
    });
  }, { threshold: 0.2 });
  items.forEach(({ el }) => io.observe(el));
}
