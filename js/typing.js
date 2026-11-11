// Пиксельный набор текста: буквы появляются по одной — сначала белый квадрат, затем буква.
// Используется в бейдже первого экрана (js/badge.js) и для текстов блоков (initTyping).

const BLOCK = 45;   // мс — сколько буква держится квадратом
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Текст элемента → буквы в <i class="px">, переносы <br> сохраняются. Возвращает буквы (без пробелов).
export function split(el) {
  if (!el.dataset.html) el.dataset.html = el.innerHTML;
  const lines = el.dataset.html.split(/<br\s*\/?>/i).map((l) => {
    const t = document.createElement('textarea');   // раскодировать &nbsp; и т. п.
    t.innerHTML = l;
    return t.value;
  });
  el.textContent = '';
  const chars = [];
  lines.forEach((line, n) => {
    if (n) el.append(document.createElement('br'));
    for (const ch of line) {
      const i = document.createElement('i');
      i.className = 'px';
      i.textContent = ch;
      el.append(i);
      if (ch.trim()) chars.push(i);
    }
  });
  return chars;
}

export async function pixelIn(chars, total) {
  const step = total / Math.max(1, chars.length);
  chars.forEach((c) => c.classList.remove('is-on', 'is-block'));
  // несколько букв за один шаг таймера, если шаг короче 16 мс — иначе длинный текст набирался бы дольше задуманного
  const batch = Math.max(1, Math.ceil(16 / step));
  for (let i = 0; i < chars.length; i += batch) {
    chars.slice(i, i + batch).forEach((c) => {
      c.classList.add('is-block');
      setTimeout(() => { c.classList.remove('is-block'); c.classList.add('is-on'); }, BLOCK);
    });
    await wait(step * batch);
  }
  await wait(BLOCK);
}

export async function pixelOut(chars, total) {
  const step = total / Math.max(1, chars.length);
  for (const c of [...chars].reverse()) {
    c.classList.remove('is-on');
    c.classList.add('is-block');
    setTimeout(() => c.classList.remove('is-block'), BLOCK);
    await wait(step);
  }
  await wait(BLOCK);
}

// длительность набора: ~7,5 мс на букву, от 0,375 до 0,9 с — успевает и при быстрой прокрутке
const duration = (n) => Math.min(900, Math.max(375, n * 7.5));

// Память анимаций за сеанс: каждый набор текста и каждое пиксельное появление фото проигрывается
// один раз — и при прокрутке назад, и после возврата со страницы товара (sessionStorage, до закрытия вкладки).
const SEEN = 'yoru-seen';
const readSeen = () => { try { return JSON.parse(sessionStorage.getItem(SEEN)) || []; } catch { return []; } };
export const pageKey = () => location.pathname.replace(/index\.html$/, '') + location.search;
export const seen = (key) => readSeen().includes(key);
export function markSeen(key) {
  const list = readSeen();
  if (list.includes(key)) return;
  list.push(key);
  try { sessionStorage.setItem(SEEN, JSON.stringify(list)); } catch { /* приватный режим — только до перезагрузки */ }
}

// Тексты блоков набираются, когда появляются на экране — один раз за сеанс (name — имя набора текстов на странице).
// Текст блока моделей на десктопе ждёт, пока блок раскроется на весь экран (класс .is-open).
export function initTyping(elements, name = 'text') {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const items = [...elements].map((el, i) => ({ el, key: `${pageKey()}|${name}|${i}` }))
    .filter(({ el, key }) => el && !seen(key));   // уже набирались в этом сеансе — показываем как есть
  items.forEach(({ el }) => { el.classList.add('typing'); split(el); });   // буквы скрыты до набора
  const keys = new Map(items.map(({ el, key }) => [el, key]));

  const play = (el) => {
    if (el.dataset.typed) return;
    el.dataset.typed = '1';
    markSeen(keys.get(el));
    const chars = [...el.querySelectorAll('.px')].filter((c) => c.textContent.trim());
    pixelIn(chars, duration(chars.length));
  };
  const start = (el) => {
    const models = el.closest('.models');
    const journey = el.closest('.journey');
    const waiting = () => models && journey?.classList.contains('journey--pinned') && !models.classList.contains('is-open');
    if (!waiting()) { play(el); return; }
    const mo = new MutationObserver(() => { if (!waiting()) { mo.disconnect(); play(el); } });
    mo.observe(models, { attributes: true, attributeFilter: ['class'] });
    mo.observe(journey, { attributes: true, attributeFilter: ['class'] });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); start(e.target); } });
  }, { rootMargin: '0px 0px 10% 0px' });   // начинаем чуть раньше, чем текст покажется
  items.forEach(({ el }) => io.observe(el));
}
