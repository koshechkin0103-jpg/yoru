// Путь после второго экрана: слайдер → поле с куртками → раскрытие блока моделей.
// Десктоп: секция прилипает (ScrollTrigger), вся сцена считается из одного прогресса прокрутки в render().
// Телефон/планшет: секции в потоке, куртки появляются при прокрутке (IntersectionObserver).
import { split, pixelIn, reducedMotion, seen, markSeen, pageKey } from './typing.js?v=75b219fd';

// Куртки в поле: x — от левого края поля в долях ширины экрана, y — центр в долях высоты,
// h — высота в долях высоты экрана, d — глубина (больше 1 — ближе и быстрее), dy — дрейф по вертикали.
const JACKETS = [
  { src: 1, x: 0.10, y: 0.24, h: 0.26, d: 0.75, dy: -0.04 },
  { src: 8, x: 0.15, y: 0.66, h: 0.32, d: 0.95, dy: 0.03 },
  { src: 2, x: 0.38, y: 0.70, h: 0.39, d: 1.15, dy: 0.05 },
  { src: 3, x: 0.62, y: 0.20, h: 0.21, d: 0.65, dy: 0.03 },
  { src: 4, x: 0.86, y: 0.55, h: 0.49, d: 1.35, dy: -0.06 },
  { src: 5, x: 1.14, y: 0.16, h: 0.29, d: 0.85, dy: 0.04 },
  { src: 6, x: 1.30, y: 0.80, h: 0.23, d: 0.70, dy: -0.03 },
  { src: 7, x: 1.56, y: 0.30, h: 0.44, d: 1.25, dy: 0.05 },
  { src: 8, x: 1.78, y: 0.82, h: 0.31, d: 1.05, dy: -0.04 },
  { src: 3, x: 1.96, y: 0.14, h: 0.18, d: 0.60, dy: 0.02 },
  { src: 1, x: 2.12, y: 0.66, h: 0.26, d: 0.90, dy: -0.03 },
];
// версия картинок поля (проставляет tools/stamp.pl при выгрузке — кэш браузера сбрасывается при их замене)
const FIELD = { v: 'd2e3ff4d', // stamp-dir:img/field
};
// адрес — от этого файла, а не от страницы: на странице Тильды картинки лежат на нашем хостинге
const fieldSrc = (n) => new URL(`../img/field/j${n}.webp?v=${FIELD.v}`, import.meta.url).href;
const FIELD_W = 2.4;      // ширина поля в экранах
const CARD_W = 0.22;      // ширина карточки блока моделей в поле, доля экрана (пропорции — как у экрана)

// Доли общей длины прокрутки: лента (слайды + поле), раскрытие карточки до всего экрана
const PHASE = { travel: 0.8, open: 0.2 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);   // easeInOutCubic

export function initLots(root = document) {
  root.querySelectorAll('[data-lot]').forEach((lot) => {
    const strip = lot.querySelector('.lot__strip, .collection-card__strip');
    const dots = [...lot.querySelectorAll('.lot__dot, .collection-card__dot')];
    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      if (dot.getAttribute('aria-current') === 'true') return;
      dots.forEach((d) => d.setAttribute('aria-current', 'false'));
      dot.setAttribute('aria-current', 'true');
      strip.style.transform = `translateX(${-100 * i}%)`;
    }));
  });
}

// Куртки поля грузятся не сразу, а когда до секции остаётся около экрана прокрутки (см. loadWhenNear)
export function buildField(field) {
  const frag = document.createDocumentFragment();
  JACKETS.forEach((j) => {
    const img = new Image();
    img.className = 'field__jacket';
    img.dataset.src = fieldSrc(j.src);
    img.alt = '';
    img.decoding = 'async';
    img.dataset.cfg = JSON.stringify(j);
    frag.append(img);
  });
  (field.querySelector('.field__stage') || field).append(frag);
  loadWhenNear(field.closest('.journey') || field, () => {
    field.querySelectorAll('img[data-src]').forEach((img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
  });
}

// cb — один раз, когда элемент окажется ближе экрана к видимой области
function loadWhenNear(el, cb) {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
  }, { rootMargin: '100% 0px' });
  io.observe(el);
}

// Телефон/планшет: появление курток при прокрутке
export function initReveal(field) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  field.querySelectorAll('.field__jacket').forEach((el) => io.observe(el));
  return () => io.disconnect();
}

// Десктоп: прилипающая сцена
export function initJourney(section, { ScrollTrigger }) {
  const track = section.querySelector('.journey__track');
  const slides = [...section.querySelectorAll('.slide')];
  const field = section.querySelector('.field');
  const models = section.querySelector('.models');
  const jackets = [...field.querySelectorAll('.field__jacket')].map((el) => ({ el, cfg: JSON.parse(el.dataset.cfg) }));
  section.classList.add('journey--pinned');
  // лента сдвигается трансформом, и «ленивые» фото слайдов за правым краем браузер может не успеть догрузить — грузим сразу
  // (фото моделей остаются «ленивыми»: блок лежит поверх экрана и начинает грузиться, когда секция прилипает)
  section.querySelectorAll('.slide img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });

  let vw = 0, vh = 0, slidesW = 0, fieldW = 0, travel = 0, card = null;

  function layout() {
    vw = section.clientWidth;                              // ширина секции = ширина слайда (без полосы прокрутки)
    vh = window.innerHeight;
    slidesW = slides.length * vw;
    fieldW = FIELD_W * vw;
    field.style.width = `${fieldW}px`;
    travel = slidesW + fieldW - vw;                       // на сколько уезжает лента
    jackets.forEach(({ el, cfg }) => {
      const h = cfg.h * vh;
      el.style.height = `${h}px`;
      el.style.width = 'auto';
      el.style.left = `${cfg.x * vw}px`;
      el.style.top = `${cfg.y * vh - h / 2}px`;
    });
    // карточка блока моделей в поле: в конце ленты встаёт по центру экрана
    const w = CARD_W * vw;
    card = { w, cx: vw / 2 };
  }

  function render(p) {
    const t = clamp(p / PHASE.travel, 0, 1);                 // лента
    const o = clamp((p - PHASE.travel) / PHASE.open, 0, 1);  // раскрытие
    const x = -travel * t;
    track.style.transform = `translate3d(${x}px, 0, 0)`;

    // слайд, уходящий за левый край, немного уменьшается (как на референсе)
    slides.forEach((s, i) => {
      const left = i * vw + x;
      const k = clamp(-left / vw, 0, 1);
      s.style.transform = k > 0 ? `scale(${1 - 0.08 * k})` : '';
    });

    // параллакс курток: относительно момента, когда середина поля в центре экрана
    const rel = x + slidesW + fieldW / 2 - vw / 2;           // 0 — середина поля по центру
    jackets.forEach(({ el, cfg }) => {
      const dx = (cfg.d - 1) * rel;
      const dy = cfg.dy * vh * (rel / vw);
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    // карточка — уменьшенная копия блока моделей (пропорции экрана): едет вместе с полем,
    // к концу ленты встаёт в центр и вырастает до всего экрана
    // (пока лента едет, карточка правее центра ровно на оставшийся путь ленты — то есть движется вместе с полем)
    const cx = card.cx + travel * (1 - t);
    const k = ease(o);
    const s = CARD_W + (1 - CARD_W) * k;
    if (k >= 1) {
      models.style.transform = 'none';                       // во весь экран — без трансформа, текст чёткий
    } else {
      models.style.transform = `translate3d(${(cx - vw / 2).toFixed(2)}px, 0, 0) scale(${s.toFixed(4)})`;
    }
    models.style.borderRadius = `${(10 * (1 - k) / s).toFixed(2)}px`;     // в экранных пикселях: 10 → 0
    models.style.setProperty('--outline', `${((1 - k) / s).toFixed(2)}px`);  // тонкая обводка, чтобы карточка читалась на тёмном поле
    models.style.setProperty('--lift', (1 - k).toFixed(3));
    models.style.visibility = cx - card.w / 2 > vw ? 'hidden' : 'visible';
    models.classList.toggle('is-open', k >= 1);
  }

  layout();
  const total = () => travel + vh * 1.4;                     // длина прокрутки всей сцены
  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + total(),
    pin: true,
    scrub: 0.3,
    invalidateOnRefresh: true,
    onRefresh: (self) => { layout(); render(self.progress); },   // вызывается уже при создании — st ещё нет
    onUpdate: (self) => render(self.progress),
  });
  render(0);

  const stop = () => {
    st.kill();
    section.classList.remove('journey--pinned');
    // снять всё, что сцена ставила в style, — иначе раскладка без анимации получит чужие размеры
    [track, field, models, ...slides, ...jackets.map((j) => j.el)].forEach((el) => {
      ['transform', 'width', 'height', 'left', 'top', 'visibility', 'borderRadius', '--outline', '--lift'].forEach((p) => el.style.removeProperty(p.startsWith('--') ? p : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())));
    });
    models.classList.remove('is-open');
  };
  stop.end = () => st.end;   // прокрутка, при которой блок моделей уже раскрыт на весь экран (ссылки «Models»)
  return stop;
}

// Телефон и планшет: сцена Depth Zoom. Поле — высокий блок, внутри — «прилипающая» сцена на весь экран.
// Порядок: сначала только фон с красными иероглифами → из центра одна за другой появляются крошечные куртки
// и расходятся по местам → набирается текст-заголовок → куртки растут и разлетаются за края экрана →
// сцена уезжает вверх, следующий блок въезжает снизу, а текст в это время гаснет.
// x, y — место куртки в долях сцены, w — ширина в долях ширины сцены, z — глубина (больше — ближе и быстрее).
const DEPTH = [
  { src: 1, x: 0.22, y: 0.15, w: 0.50, z: 1.0 },
  { src: 2, x: 0.80, y: 0.13, w: 0.42, z: 0.85 },
  { src: 4, x: 0.85, y: 0.34, w: 0.48, z: 1.2 },
  { src: 5, x: 0.15, y: 0.34, w: 0.40, z: 0.9 },
  { src: 7, x: 0.20, y: 0.70, w: 0.50, z: 1.1 },
  { src: 8, x: 0.82, y: 0.68, w: 0.46, z: 1.0 },
  { src: 6, x: 0.52, y: 0.88, w: 0.48, z: 1.3 },
];
const ZOOM = 5.5;          // во сколько раз (на глубине 1) вырастает куртка к концу разлёта
// доли «прилипшей» части сцены
const T_EMERGE = [0.10, 0.45];   // куртки выходят из центра
const T_TEXT = 0.45;             // набирается текст
const T_FLY = [0.55, 1.0];       // куртки разлетаются за края

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - (1 - t) ** 3;

export function initDepth(field, { ScrollTrigger }) {
  const stage = field.querySelector('.field__stage');
  const text = field.querySelector('.field__text');
  field.classList.add('field--depth');
  const items = DEPTH.map((cfg) => {
    const el = new Image();
    el.className = 'field__depth';
    el.loading = 'lazy';   // грузятся на подходе к сцене
    el.src = fieldSrc(cfg.src);
    el.alt = '';
    el.decoding = 'async';
    stage.append(el);
    return { el, cfg };
  });
  // На подходе к сцене (за полтора экрана) — загрузить и распаковать картинки заранее: иначе телефон
  // распаковывал все семь курток в момент появления сцены, и прокрутка замирала на ~0,25 с.
  if ('IntersectionObserver' in window) {
    const pre = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      pre.disconnect();
      items.forEach(({ el }) => { el.loading = 'eager'; el.decode?.().catch(() => {}); });
    }, { rootMargin: '150% 0px' });
    pre.observe(field);
  }
  const textKey = `${pageKey()}|depth-text`;
  const chars = reducedMotion() || seen(textKey) ? null : split(text);   // уже набирался за сеанс — просто текст
  if (chars) text.classList.add('typing');   // буквы скрыты до набора
  let typed = false;

  let W = 0, H = 0, pinned = 0.7;
  const layout = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    pinned = Math.max(0.1, (field.offsetHeight - H) / field.offsetHeight);   // доля прокрутки, пока сцена «прилипла»
    items.forEach(({ el, cfg }) => { el.style.width = `${cfg.w * W}px`; });
  };

  const render = (q) => {
    const t = q / pinned;   // 0…1 — сцена на месте, больше 1 — уезжает вверх
    items.forEach(({ el, cfg }, i) => {
      const e = easeOut(clamp01((t - T_EMERGE[0] - i * 0.025) / (T_EMERGE[1] - T_EMERGE[0])));   // одна за другой
      const f = clamp01((t - T_FLY[0]) / (T_FLY[1] - T_FLY[0]));
      const k = 1 + ZOOM * cfg.z * f * f;   // разлёт: медленно в начале, быстрее к концу
      const x = W / 2 + (cfg.x - 0.5) * W * e * k;
      const y = H / 2 + (cfg.y - 0.5) * H * e * k;
      const s = (0.04 + 0.96 * e) * k;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      const op = e <= 0 ? 0 : Math.min(1, e * 5) * clamp01((5 - k) / 1.5);
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op > 0.001 ? '' : 'hidden';   // ещё не вышла или уже улетела — не рисовать (на выходе она в 5 раз крупнее экрана)
    });
    // текст: набирается, держится, гаснет, пока сцена уезжает (в это время въезжает следующий блок)
    const fade = clamp01((q - pinned) / ((1 - pinned) * 0.5));
    text.style.opacity = t >= T_TEXT ? (1 - fade).toFixed(3) : '0';
    if (t >= T_TEXT && !typed) {
      typed = true;
      if (chars) { markSeen(textKey); pixelIn(chars, 675); }
    }
  };

  layout();
  render(0);
  const st = ScrollTrigger.create({
    trigger: field,
    start: 'top top',
    end: 'bottom top',   // вместе с уходом сцены за верх экрана
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => { layout(); render(self.progress); field.classList.toggle('is-active', self.isActive); },
    // вне сцены куртки скрыты и не держат слои видеокарты (на телефоне после сцены иначе тормозит прокрутка)
    onToggle: (self) => field.classList.toggle('is-active', self.isActive),
  });

  return () => {
    st.kill();
    items.forEach(({ el }) => el.remove());
    field.classList.remove('field--depth', 'is-active');
    if (text.dataset.html) text.innerHTML = text.dataset.html;
    text.classList.remove('typing');
    text.style.removeProperty('opacity');
  };
}
