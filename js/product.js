// Страница товара: product.html?id=hanazaru | sumiryu | dragon-carp | karigane | onami | byakko
// Анимация как в примере OUTFIT: буквы названия поднимаются снизу, фото собираются из пиксельных квадратов, остальное проявляется.
import { PRODUCTS, SIZES, money } from './products.js?v=cb0badcd';
import { addToCart } from './cart.js?v=5dd84f80';
import { initTopbar, reducedMotion } from './shop.js?v=215ca003';
import { initTyping } from './typing.js?v=75b219fd';
import { initPixelReveal } from './pixel-reveal.js?v=70d64e08';
import { initSizeGuide } from './size-guide.js?v=f1ce0f0d';

initTopbar();

const id = new URLSearchParams(location.search).get('id');
const item = PRODUCTS[id];
const page = document.getElementById('product');
if (!item) location.replace('index.html#collections');
else render();

function render() {
  document.title = `${item.name} — YORU`;
  const $ = (s) => page.querySelector(s);
  $('.product__num').textContent = item.num;
  $('.product__price').textContent = money(item.price);
  $('.product__desc').textContent = item.desc;
  initTyping([$('.product__desc')]);   // описание набирается по буквам, как тексты на главной

  // название — по буквам (для анимации), для чтения с экрана — целиком
  const title = $('.product__title');
  title.setAttribute('aria-label', item.name);
  [...item.name].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.style.setProperty('--i', i);
    s.setAttribute('aria-hidden', 'true');
    s.textContent = ch;
    title.append(s);
  });

  // фото
  const gallery = $('.product__gallery');
  item.photos.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'product__shot';
    const img = new Image();
    img.src = p.src;
    img.alt = p.alt;
    img.decoding = 'async';
    if (i > 1) img.loading = 'lazy';
    li.append(img);
    gallery.append(li);
  });

  // DETAILS: стороны куртки — из подписей к фото («cream side», «pink side»)
  const sides = [...new Set(item.photos.map((p) => (p.alt.match(/,\s*([a-z]+) side/i) || [])[1]).filter(Boolean))];
  const details = [
    sides.length === 2 ? `Fully reversible: ${sides[0]} satin one way, ${sides[1]} the other — one seam between them` : 'Fully reversible — two shells, one seam between them',
    'Hand-guided machine embroidery, Kiryu, Japan — about 40,000 stitches a side',
    'Diamond quilting through both layers keeps the satin flat',
    'Ribbed collar, cuffs and hem · two-way zip · two pockets on each side',
    'Numbered: one of 200 per model, never reprinted',
  ];
  $('[data-details]').replaceChildren(...details.map((t) => Object.assign(document.createElement('li'), { textContent: t })));

  const sizeBox = $('.product__size');
  initSize(sizeBox);
  initSizeGuide({ getSize: () => size, choose: (s) => sizeBox.choose(s) });
  stickyInfo($('.product__info'));
  initQty($('.product__qty'));
  initAdd();
  animate();
}

// ---------- размер: выпадающий список ----------
let size = null;
function initSize(box) {
  const btn = box.querySelector('.size__button');
  const value = box.querySelector('.size__value');
  const list = box.querySelector('.size__list');
  SIZES.forEach((s) => {
    const li = document.createElement('li');
    li.className = 'size__option';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.size = s;
    li.textContent = s;
    list.append(li);
  });
  const options = [...list.children];
  let active = 0;

  const open = (on) => {
    box.classList.toggle('size--open', on);
    btn.setAttribute('aria-expanded', String(on));
    if (on) { active = Math.max(0, SIZES.indexOf(size)); mark(); list.focus(); }
  };
  const mark = () => options.forEach((o, i) => o.classList.toggle('is-active', i === active));
  const choose = (s) => {
    size = s;
    options.forEach((o) => o.setAttribute('aria-selected', String(o.dataset.size === s)));
    value.textContent = `SIZE: ${s}`;
    btn.removeAttribute('data-empty');
    status('', '');
    open(false);
    btn.focus();
  };
  box.open = () => open(true);
  box.choose = choose;   // размерная сетка: нажатие на строку выбирает размер

  btn.addEventListener('click', () => open(!box.classList.contains('size--open')));
  options.forEach((o) => o.addEventListener('click', () => choose(o.dataset.size)));
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(options.length - 1, active + 1); mark(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); mark(); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { choose(options[active].dataset.size); e.preventDefault(); }
    else if (e.key === 'Escape') { open(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) open(false); });
}

// ---------- количество ----------
let qty = 1;
function initQty(box) {
  const out = box.querySelector('output');
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    qty = Math.min(10, Math.max(1, qty + Number(b.dataset.step)));
    out.textContent = qty;
  }));
}

// ---------- в корзину ----------
const statusEl = () => page.querySelector('.product__status');
function status(text, state) {
  const el = statusEl();
  el.textContent = text;
  if (state) el.dataset.state = state; else delete el.dataset.state;
}
function initAdd() {
  const btn = page.querySelector('.product__add');
  const label = btn.innerHTML;
  btn.addEventListener('click', () => {
    if (!size) {
      status('Choose a size first.', 'error');
      setTimeout(() => page.querySelector('.product__size').open(), 0);   // после этого клика, иначе он же закроет список
      return;
    }
    addToCart(id, size, qty);
    status(`Added: ${item.name}, size ${size} × ${qty}. `, 'ok');
    const link = document.createElement('a');
    link.href = 'cart.html';
    link.textContent = 'Go to cart →';
    link.style.color = 'inherit';
    statusEl().append(link);
    btn.textContent = 'ADDED ✓';
    setTimeout(() => { btn.innerHTML = label; }, 1600);
  });
}

// ---------- появление ----------
function animate() {
  if (reducedMotion()) { page.classList.remove('shop-anim'); return; }
  const ready = () => page.classList.add('is-ready');
  requestAnimationFrame(() => requestAnimationFrame(ready));
  setTimeout(ready, 120);   // запасной путь: во вкладке в фоне кадры анимации не идут
  // фото собираются из пиксельных квадратов, когда появляются на экране
  // (только на десктопе — на телефоне и планшете фото видны сразу)
  if (!matchMedia('(max-width: 1199.98px)').matches) initPixelReveal(page.querySelectorAll('.product__shot'));
}

// Правая колонка «прилипает» при прокрутке фото. Если вместе с раскрытыми блоками она выше экрана —
// прилипает нижним краем (иначе низ колонки не увидеть, пока не кончатся фото).
function stickyInfo(info) {
  if (!info || !('ResizeObserver' in window)) return;
  const fit = () => {
    const room = window.innerHeight - 90 - 24;
    info.style.top = info.offsetHeight > room ? `${window.innerHeight - info.offsetHeight - 24}px` : '';
  };
  new ResizeObserver(fit).observe(info);
  window.addEventListener('resize', fit);
}
