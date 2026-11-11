// Загрузка секвенции кадров в память и отрисовка кадра (или смеси двух соседних) на canvas.

const pad = (n) => String(n).padStart(3, '0');

export class Sequence {
  // need — сколько пикселей кадра нужно на пиксель сцены при текущем размере куртки на экране (с учётом плотности).
  // Берём самый лёгкий комплект, которого хватает без растягивания; если не хватает ни одного — самый тяжёлый.
  constructor({ dir, density, count, rect, v }, need) {
    this.v = v;
    this.count = count;
    this.rect = rect;
    const sets = Object.keys(dir).map(Number).sort((a, b) => a - b);
    const fit = sets.find((s) => density[s] >= need * 0.97);
    this.base = dir[fit ?? sets[sets.length - 1]];
    this.frames = new Array(count).fill(null);
  }

  loadFrame(i) {
    if (this.frames[i]) return Promise.resolve(this.frames[i]);
    const img = new Image();
    img.decoding = 'async';
    img.src = `${this.base}/${pad(i)}.webp?v=${this.v}`;
    return img.decode().then(() => { this.loaded = (this.loaded || 0) + 1; return (this.frames[i] = img); }).catch(() => null);
  }

  // Сначала указанный кадр (чтобы сразу было что показать), затем «от грубого к точному»:
  // каждый 16-й кадр по всей длине, потом каждый 8-й, 4-й, 2-й и остальные. Так уже через мгновение
  // есть кадры по всему ролику, и ближайший загруженный (nearest) всегда рядом с нужным — без откатов
  // к началу ролика, пока секвенция догружается. Одновременно — не больше 6 запросов, строго по очереди.
  // onFirst вызывается, как только первый кадр готов.
  load(first = 0, onFirst) {
    return this.loadFrame(first).then((img) => {
      this.firstReady = img;
      onFirst?.();
      const order = [];
      const seen = new Set([first]);
      for (const stride of [16, 8, 4, 2, 1]) {
        for (let i = 0; i < this.count; i += stride) if (!seen.has(i)) { seen.add(i); order.push(i); }
      }
      if (!seen.has(this.count - 1)) order.unshift(this.count - 1);
      let next = 0;
      const worker = () => (next < order.length ? this.loadFrame(order[next++]).then(worker) : null);
      return Promise.all(Array.from({ length: 6 }, worker));
    });
  }

  // Ближайший уже загруженный кадр к i (пока секвенция догружается)
  nearest(i) {
    i = Math.max(0, Math.min(this.count - 1, i));
    for (let d = 0; d < this.count; d++) {
      if (this.frames[i - d]) return this.frames[i - d];
      if (this.frames[i + d]) return this.frames[i + d];
    }
    return null;
  }

  get(i) {
    return this.frames[Math.max(0, Math.min(this.count - 1, i))];
  }

  // Рисует ближайший целый кадр к позиции pos с весом weight.
  // Соседние кадры не смешиваются: они заметно различаются, и смесь даёт двоящуюся, мутную картинку.
  draw(ctx, pos, weight, toCanvas) {
    if (weight <= 0.0005) return;
    const img = this.nearest(Math.round(pos));
    if (!img) return;
    const r = toCanvas(this.rect);
    ctx.globalAlpha = weight;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  }
}
