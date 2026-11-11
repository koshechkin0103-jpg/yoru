// Размерная сетка на странице товара: окно <dialog id="size-guide"> (product.html).
// Открывается ссылкой SIZE GUIDE над выбором размера и кнопкой в блоке SIZE & FIT.
// Таблица — в сантиметрах или дюймах; нажатие на строку выбирает этот размер в списке и закрывает окно.

// Замеры изделия, разложенного на столе, см. Крой один на все модели.
const CHART = [
  { size: 'S',  chest: 54, length: 63, shoulder: 46, sleeve: 59, height: [160, 170] },
  { size: 'M',  chest: 57, length: 65, shoulder: 48, sleeve: 61, height: [168, 176] },
  { size: 'L',  chest: 60, length: 67, shoulder: 50, sleeve: 63, height: [175, 184] },
  { size: 'XL', chest: 63, length: 69, shoulder: 52, sleeve: 65, height: [182, 192] },
];
const COLS = ['chest', 'length', 'shoulder', 'sleeve'];

const inch = (cm) => (cm / 2.54).toFixed(1).replace(/\.0$/, '');
const feet = (cm) => { const i = Math.round(cm / 2.54); return `${Math.floor(i / 12)}′${i % 12}″`; };

// getSize — текущий выбранный размер; choose(size) — выбрать размер в списке на странице
export function initSizeGuide({ getSize, choose }) {
  const dialog = document.getElementById('size-guide');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const body = dialog.querySelector('tbody');
  const units = [...dialog.querySelectorAll('[data-unit]')];
  let unit = 'cm';
  let opener = null;

  const render = () => {
    const current = getSize();
    body.textContent = '';
    CHART.forEach((row) => {
      const tr = document.createElement('tr');
      tr.dataset.size = row.size;
      if (row.size === current) tr.setAttribute('aria-current', 'true');
      const th = document.createElement('th');
      th.scope = 'row';
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.textContent = row.size;
      pick.setAttribute('aria-label', `Choose size ${row.size}`);
      th.append(pick);
      tr.append(th);
      COLS.forEach((k) => {
        const td = document.createElement('td');
        td.textContent = unit === 'cm' ? row[k] : inch(row[k]);
        tr.append(td);
      });
      const h = document.createElement('td');
      h.textContent = unit === 'cm' ? `${row.height[0]}–${row.height[1]}` : `${feet(row.height[0])}–${feet(row.height[1])}`;
      tr.append(h);
      tr.addEventListener('click', () => { choose(row.size); close(); });
      body.append(tr);
    });
  };

  units.forEach((b) => b.addEventListener('click', () => {
    unit = b.dataset.unit;
    units.forEach((u) => u.setAttribute('aria-pressed', String(u === b)));
    render();
  }));

  // открытие и закрытие — с анимацией: панель выезжает (класс is-in), затем окно закрывается
  const open = (from) => {
    opener = from;
    render();
    document.documentElement.classList.add('guide-open');   // страница под окном не прокручивается
    dialog.showModal();
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-in')));
  };
  const close = () => {
    if (!dialog.open) return;
    const done = () => { dialog.close(); document.documentElement.classList.remove('guide-open'); opener?.focus(); };
    if (!dialog.classList.contains('is-in')) { done(); return; }   // закрыли раньше, чем панель выехала
    dialog.classList.remove('is-in');
    const panel = dialog.querySelector('.guide__panel');
    const fallback = setTimeout(done, 450);
    panel.addEventListener('transitionend', () => { clearTimeout(fallback); done(); }, { once: true });
  };

  document.querySelectorAll('[data-guide]').forEach((b) => b.addEventListener('click', () => open(b)));
  dialog.querySelector('.guide__close').addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });                // Esc
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });           // тёмный фон вокруг панели
}
