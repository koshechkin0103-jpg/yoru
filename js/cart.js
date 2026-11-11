// Корзина: хранится в браузере посетителя (localStorage), заказ никуда не отправляется.
// Позиция — { id, size, qty }; одна и та же модель разного размера — разные позиции.

const KEY = 'yoru-cart';
const EVENT = 'yoru-cart';

export function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items.filter((i) => i && i.id && i.size && i.qty > 0) : [];
  } catch { return []; }
}

export function writeCart(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* приватный режим — корзина живёт до перезагрузки */ }
  memory = items;
  window.dispatchEvent(new CustomEvent(EVENT));
}

// запасной вариант, если localStorage недоступен
let memory = null;
const current = () => {
  const stored = readCart();
  return stored.length || !memory ? stored : memory;
};

export function getCart() { return current(); }

export function addToCart(id, size, qty = 1) {
  const items = current().slice();
  const same = items.find((i) => i.id === id && i.size === size);
  if (same) same.qty = Math.min(99, same.qty + qty);
  else items.push({ id, size, qty });
  writeCart(items);
}

export function setQty(id, size, qty) {
  const items = current().map((i) => (i.id === id && i.size === size ? { ...i, qty } : i)).filter((i) => i.qty > 0);
  writeCart(items);
}

export function clearCart() { writeCart([]); }

export function cartCount() { return current().reduce((n, i) => n + i.qty, 0); }

// Ссылки CART на всех страницах: «CART (2)», пустая корзина — просто «CART»
let counting = false;
export function initCartCount() {
  if (counting) return;   // один раз на страницу
  counting = true;
  const update = () => {
    const n = cartCount();
    document.querySelectorAll('[data-cart-link]').forEach((a) => { a.textContent = n ? `CART (${n})` : 'CART'; });
  };
  update();
  window.addEventListener(EVENT, update);
  window.addEventListener('storage', (e) => { if (e.key === KEY) update(); });   // изменения из другой вкладки
}
