// Блоки после «Models from the new collection»: появление при прокрутке, параллакс боковых фото
// в блоке достижений, форма подписки (пока только вид — адрес никуда не отправляется).
import { seen, markSeen, pageKey } from './typing.js?v=75b219fd';

// Появление: элементы .reveal получают .is-in, когда входят в экран — один раз за сеанс
// (уже появлявшиеся, в т. ч. до перехода на страницу товара, сразу на месте).
// При «уменьшить движение» ничего не прячется — всё видно сразу.
export function initReveals(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const items = [...root.querySelectorAll('.reveal')];
  if (!items.length) return;
  const keys = new Map(items.map((el, i) => [el, `${pageKey()}|reveal|${i}`]));
  items.forEach((el) => { if (seen(keys.get(el))) el.classList.add('is-in'); });
  document.documentElement.classList.add('reveals');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      markSeen(keys.get(e.target));
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
}

// Параллакс (только десктоп): фото с data-drift едут по вертикали к центру главного фото.
// data-drift="1" — сверху вниз (левое), "-1" — снизу вверх (правое). В середине прохода блока — места из макета.
const DRIFT = 120;   // размах в единицах макета (u = ширина блока / 1440) в каждую сторону
export function initDrift(section, { ScrollTrigger }) {
  const items = [...section.querySelectorAll('[data-drift]')].map((el) => ({ el, dir: Number(el.dataset.drift) }));
  if (!items.length) return () => {};
  const render = (p) => {
    const a = DRIFT * section.clientWidth / 1440 * (p - 0.5) * 2;
    items.forEach(({ el, dir }) => { el.style.translate = `0 ${(a * dir).toFixed(2)}px`; });
  };
  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => render(self.progress),
  });
  return () => { st.kill(); items.forEach(({ el }) => el.style.removeProperty('translate')); };
}

// Форма подписки: проверка адреса и ответ на месте, без отправки
export function initSignup(form) {
  const input = form.querySelector('input[type="email"]');
  const status = form.querySelector('.signup__status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.checkValidity() || !input.value.trim()) {
      status.dataset.state = 'error';
      status.textContent = 'Enter a valid address.';
      input.focus();
      return;
    }
    status.dataset.state = 'ok';
    status.textContent = "You're on the list. We'll signal you at night.";
    form.reset();
  });
  input.addEventListener('input', () => { if (status.dataset.state === 'error') { status.textContent = ''; delete status.dataset.state; } });
}

// Карточки товаров (блок моделей и «Collections»): клик в любом месте карточки открывает страницу товара —
// туда же ведёт её кнопка SHOP NOW. Квадратики и сама кнопка работают как раньше.
export function initCardLinks(root = document) {
  root.querySelectorAll('.lot, .collection-card').forEach((card) => {
    const link = card.querySelector('.lot__btn, .collection-card__btn');
    if (!link) return;
    card.classList.add('is-link');
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;           // своя кнопка или квадратик
      if (String(window.getSelection?.() || '')) return;   // выделяли текст — не уходим со страницы
      if (e.metaKey || e.ctrlKey) window.open(link.href, '_blank');
      else location.href = link.href;
    });
  });
}
