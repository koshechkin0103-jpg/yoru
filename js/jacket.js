// Куртка: поворот за курсором на первом экране и переезд со сменой стороны во второй блок.
// Телефон и планшет (mobile): поворота нет — куртка стоит, а при прокрутке переворачивается и едет
// по центру экрана во второй блок (облегчённый комплект кадров FLIP_M).
import { STAGE, HERO, FLIP, FLIP_M, TIMING } from './config.js?v=a3f37343';
import { Sequence } from './sequence.js?v=c85d15b6';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// первый кадр куртки готов — прелоудер (js/preloader.js) может дойти до 100 %
const firstFrame = () => window.dispatchEvent(new Event('yoru:first-frame'));

export class Jacket {
  constructor(page, { mobile = false } = {}) {
    this.page = page;
    this.mobile = mobile;
    this.el = page.querySelector('#jacket');
    this.canvas = this.el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.anchorHero = page.querySelector('[data-anchor="hero"]');
    this.anchorSides = page.querySelector('[data-anchor="sides"]');
    this.sides = page.querySelector('.sides-screen');   // второй экран 100vh

    // плотность холста: на телефоне — как у экрана (до ×3: iPhone), иначе куртка растягивается и мылится;
    // на компьютере хватает ×2
    this.dpr = Math.min(mobile ? 3 : 2, window.devicePixelRatio || 1);
    this.hero = null;   // секвенции создаются в start(), когда известен размер куртки на экране
    this.flip = null;

    // состояние
    this.heroPos = HERO.front;   // дробный номер кадра поворота
    this.heroVel = 0;
    this.heroTarget = HERO.front;
    this.flipPos = 0;            // дробный номер кадра смены стороны
    this.mix = 0;                // 0 — показываем hero, 1 — flip
    this.proxy = { p: 0 };       // прогресс переезда (сглаженный ScrollTrigger)
    this.pointer = { x: 0, nx: 0.5, inside: false };
    this.flipReady = false;
    this.last = '';

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onResize = this.onResize.bind(this);
    this.tick = this.tick.bind(this);
  }

  start() {
    this.layout();

    // Комплект кадров — по фактическому размеру куртки на экране (this.scale = пикселей canvas на пиксель сцены),
    // а не только по retina: на мониторе 1920 без масштабирования лёгкого комплекта уже мало.
    if (this.mobile) {
      // только смена стороны: её первый кадр — та же куртка в покое
      this.flip = new Sequence(FLIP_M, this.scale);
      this.mix = 1;
      this.flip.load(0, () => { this.flipReady = true; firstFrame(); });
    } else {
      this.hero = new Sequence(HERO, this.scale);
      this.flip = new Sequence(FLIP, this.scale);

    // Фронтальный кадр — первым, чтобы не было пустого места; затем весь поворот; затем flip по порядку.
    // Flip можно показывать, как только есть его первый кадр: недогруженные кадры заменяются ближайшими
    // загруженными (Sequence.draw), поэтому ранний скролл не ждёт всю секвенцию и не «перескакивает» потом.
      this.hero.load(HERO.front, firstFrame)
        .then(() => this.flip.load(0, () => { this.flipReady = true; }));
    }

    this.tween = gsap.to(this.proxy, { p: 1, ease: 'none', paused: true });
    this.st = ScrollTrigger.create({
      // десктоп: второй экран целиком заполнил окно; телефон: место куртки во втором блоке — по центру экрана
      trigger: this.mobile ? this.anchorSides : this.sides,
      start: 0,                 // верх страницы
      end: this.mobile ? 'center center' : 'bottom bottom',
      scrub: TIMING.scrub,
      animation: this.tween,
      invalidateOnRefresh: true,
    });

    if (!this.mobile) {
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
      window.addEventListener('blur', this.onPointerLeave);
    }
    window.addEventListener('resize', this.onResize);

    this.prevT = performance.now();
    gsap.ticker.add(this.tick);
  }

  stop() {
    gsap.ticker.remove(this.tick);
    this.st?.kill();
    this.tween?.kill();
    window.removeEventListener('pointermove', this.onPointerMove);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('blur', this.onPointerLeave);
    window.removeEventListener('resize', this.onResize);
    this.el.style.removeProperty('transform');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  get landingScroll() { return this.st ? this.st.end : 0; }

  // ----- геометрия: всё берётся из якорей в разметке -----
  rectOf(node) {
    const r = node.getBoundingClientRect();
    const p = this.page.getBoundingClientRect();
    return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
  }

  layout() {
    const a = this.rectOf(this.anchorHero);
    const b = this.rectOf(this.anchorSides);
    Object.assign(this.el.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${a.w}px`, height: `${a.h}px` });
    this.move = { dx: b.x - a.x, dy: b.y - a.y, sc: b.w / a.w };
    const w = Math.round(a.w * this.dpr), h = Math.round(a.h * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.scale = this.canvas.width / STAGE.w;
    this.last = '';
  }

  onResize() {
    this.layout();
    this.applyTransform(this.proxy.p);
  }

  // ----- курсор -----
  onPointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    this.pointer.inside = true;
    const nx = clamp(e.clientX / window.innerWidth, 0, 1);
    // мелкое дрожание мыши (≈ 4 px) не меняет цель
    if (Math.abs(nx - this.pointer.nx) > 0.003) this.pointer.nx = nx;
  }

  onPointerLeave() { this.pointer.inside = false; }

  // левый край → крайний левый кадр, центр → фронт, правый край → крайний правый
  frameForX(nx) {
    return nx < 0.5
      ? HERO.left + (HERO.front - HERO.left) * (nx / 0.5)
      : HERO.front + (HERO.right - HERO.front) * ((nx - 0.5) / 0.5);
  }

  // ----- кадр анимации -----
  tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.prevT) / 1000);
    this.prevT = now;
    const p = this.proxy.p;
    const atTop = p <= 0.0005;

    if (this.mobile) {   // только смена стороны — по прогрессу прокрутки
      const q = clamp((p - TIMING.flipFrom) / (TIMING.flipTo - TIMING.flipFrom), 0, 1);
      const target = q * (FLIP_M.count - 1);
      this.flipPos += (target - this.flipPos) * (1 - Math.exp(-dt / 0.08));
      if (Math.abs(target - this.flipPos) < 0.002) this.flipPos = target;
      this.applyTransform(p);
      this.draw();
      return;
    }

    // 1. Поворот за курсором — только наверху и пока показывается hero
    const cursorOn = atTop && this.mix === 0;
    // Цель — всегда исходный кадр ролика (кратный HERO.step): промежуточные показываются только в движении.
    // Гистерезис: цель меняется, только когда курсор ушёл дальше чем на 0.6 шага, — без мигания на границе.
    if (cursorOn && this.pointer.inside) {
      const want = this.frameForX(this.pointer.nx);
      const step = HERO.step || 1;
      if (Math.abs(want - this.heroTarget) > 0.6 * step) this.heroTarget = Math.round(want / step) * step;
    } else {
      this.heroTarget = HERO.front;
    }

    // Плавно: скорость стремится к (цель − позиция)/τ, ограничены ускорение и максимальная скорость.
    // За курсором — не быстрее HERO.fps; доворот при скролле укладывается в ~0.35 с.
    const returning = !atTop;
    const span = HERO.right - HERO.left;
    const tau = returning ? 0.07 : 0.08;
    const vmax = returning ? span / TIMING.frontReturn : HERO.fps;   // возврат из любого положения ≈ frontReturn
    const accel = returning ? span * 60 : HERO.fps * 6.7;
    const want = clamp((this.heroTarget - this.heroPos) / tau, -vmax, vmax);
    this.heroVel += clamp(want - this.heroVel, -accel * dt, accel * dt);
    this.heroPos = clamp(this.heroPos + this.heroVel * dt, HERO.left, HERO.right);
    // при возврате кадр уже показан, когда до цели меньше половины кадра (рисуется ближайший) — не ждём «хвост»
    const near = returning ? Math.abs(this.heroTarget - this.heroPos) < 0.5
      : Math.abs(this.heroTarget - this.heroPos) < 0.01 && Math.abs(this.heroVel) < HERO.fps / 48;
    if (near) { this.heroPos = this.heroTarget; this.heroVel = 0; }

    // 2. Переход hero → flip: только когда куртка уже во фронте и секвенция flip в памяти
    const frontReached = this.heroPos === HERO.front;
    if (!atTop && frontReached && this.flipReady) this.mix = Math.min(1, this.mix + dt / TIMING.crossfade);
    else if (atTop && this.flipPos < 0.02) this.mix = Math.max(0, this.mix - dt / TIMING.crossfade);

    // 3. Смена стороны — от прогресса скролла; пока идёт переход, держим первый кадр
    const q = clamp((p - TIMING.flipFrom) / (TIMING.flipTo - TIMING.flipFrom), 0, 1);
    const flipTarget = this.mix >= 1 ? q * (FLIP.count - 1) : 0;
    // Сглаживание + предельная скорость: если flip включился, когда скролл уже далеко,
    // куртка догоняет плавно (не быстрее всей смены стороны за 0.8 с), а не прыгает к раскрытому кадру.
    const flipMax = (FLIP.count - 1) / 0.8 * dt;
    this.flipPos += clamp((flipTarget - this.flipPos) * (1 - Math.exp(-dt / 0.08)), -flipMax, flipMax);
    if (Math.abs(flipTarget - this.flipPos) < 0.002) this.flipPos = flipTarget;

    this.applyTransform(p);
    this.draw();
  }

  applyTransform(p) {
    const { dx, dy, sc } = this.move;
    this.el.style.transform = `translate3d(${dx * p}px, ${dy * p}px, 0) scale(${1 + (sc - 1) * p})`;
  }

  toCanvas = (r) => ({
    x: (r.x - STAGE.x) * this.scale,
    y: (r.y - STAGE.y) * this.scale,
    w: r.w * this.scale,
    h: r.h * this.scale,
  });

  draw() {
    const key = `${Math.round(this.heroPos)}|${Math.round(this.flipPos)}|${this.hero?.loaded}|${this.flip.loaded}|${this.mix.toFixed(4)}|${this.hero?.firstReady ? 1 : 0}|${this.canvas.width}`;
    if (key === this.last) return;
    this.last = key;
    const { ctx, canvas } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'lighter';
    this.hero?.draw(ctx, this.heroPos, 1 - this.mix, this.toCanvas);
    this.flip.draw(ctx, this.flipPos, this.mix, this.toCanvas);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
}
