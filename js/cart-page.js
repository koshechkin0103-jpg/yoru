// Корзина: список вещей, сумма и данные для заказа (как стандартная корзина Тильды).
// Заказ никуда не отправляется — после проверки полей показывается подтверждение, корзина очищается.
import { PRODUCTS, money } from './products.js?v=cb0badcd';
import { getCart, setQty, clearCart } from './cart.js?v=5dd84f80';
import { initTopbar } from './shop.js?v=215ca003';

initTopbar();

const root = document.getElementById('cart');
const $ = (s) => root.querySelector(s);
const list = $('.cart__items');

function render() {
  const items = getCart().filter((i) => PRODUCTS[i.id]);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const total = items.reduce((n, i) => n + PRODUCTS[i.id].price * i.qty, 0);
  $('.cart__count').textContent = count ? `${count} ${count === 1 ? 'item' : 'items'}` : '';
  $('.cart__empty').hidden = !!count || !$('.cart__done').hidden;
  $('.cart__layout').hidden = !count;
  $('.cart__subtotal').textContent = money(total);
  $('.cart__total').textContent = money(total);

  list.textContent = '';
  items.forEach((i) => {
    const p = PRODUCTS[i.id];
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <a class="cart-item__img" href="product.html?id=${i.id}"><img src="${p.photos[0].src}" alt="${p.photos[0].alt}"></a>
      <div>
        <h2 class="cart-item__name"><a href="product.html?id=${i.id}">${p.name}</a></h2>
        <p class="shop-text cart-item__meta">Size ${i.size} · ${money(p.price)}</p>
      </div>
      <p class="cart-item__price">${money(p.price * i.qty)}</p>
      <div class="cart-item__controls">
        <div class="qty" aria-label="Quantity">
          <button type="button" data-step="-1" aria-label="Less"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10" stroke="currentColor" stroke-width="1.6"/></svg></button>
          <output>${i.qty}</output>
          <button type="button" data-step="1" aria-label="More"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.6"/></svg></button>
        </div>
        <button class="cart-item__remove" type="button">REMOVE</button>
      </div>`;
    li.querySelectorAll('.qty button').forEach((b) => b.addEventListener('click', () => {
      setQty(i.id, i.size, Math.min(10, i.qty + Number(b.dataset.step)));
    }));
    li.querySelector('.cart-item__remove').addEventListener('click', () => setQty(i.id, i.size, 0));
    list.append(li);
  });
}

window.addEventListener('yoru-cart', render);
window.addEventListener('storage', render);
render();

// ---------- оформление ----------
const form = $('.cart__form');
const status = $('.cart__status');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let bad = null;
  form.querySelectorAll('input[required]').forEach((input) => {
    const ok = input.value.trim() && input.checkValidity();
    input.setAttribute('aria-invalid', String(!ok));
    if (!ok && !bad) bad = input;
  });
  if (bad) {
    status.dataset.state = 'error';
    status.textContent = 'Fill in all fields to place the order.';
    bad.focus();
    return;
  }
  form.reset();
  status.textContent = '';
  $('.cart__done').hidden = false;
  clearCart();
  $('.cart__done').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
form.addEventListener('input', (e) => {
  if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim() && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false');
});
