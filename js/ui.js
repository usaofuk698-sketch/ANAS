/* =========================================================
   ANAS — أدوات الواجهة المشتركة
   بناء HTML آمن، تنبيهات، حوارات، ومساعدات عامة
   ========================================================= */

/* ---------- بناء HTML آمن ----------
   كل قيمة تُدرج داخل قالب `html` تُهرَّب تلقائياً، لأن أسماء
   المستخدمين ورسائلهم قد تحتوي على وسوم. استخدم raw() فقط
   لمحتوى تثق به (مولَّد داخل الكود نفسه).                    */

const RAW = Symbol('raw');

export function raw(str){
  return { [RAW]: String(str) };
}

export function escapeHTML(value){
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(value){
  if (value == null || value === false) return '';
  if (value[RAW] !== undefined) return value[RAW];
  if (Array.isArray(value)) return value.map(interpolate).join('');
  return escapeHTML(value);
}

export function html(strings, ...values){
  let out = strings[0];
  for (let i = 0; i < values.length; i++){
    out += interpolate(values[i]) + strings[i + 1];
  }
  return raw(out);
}

/** يحوّل نتيجة html() إلى نص جاهز لـ innerHTML */
export function render(node){
  return node && node[RAW] !== undefined ? node[RAW] : String(node ?? '');
}

/* ---------- اختصارات DOM ---------- */
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children){
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)){
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()){
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** يفوّض حدثاً على حاوية إلى عناصر تطابق محدِّداً */
export function delegate(root, eventName, selector, handler){
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

/* ---------- التنبيهات ---------- */
const TOAST_ICONS = {
  ok:    '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  error: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5M12 16.2v.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  warn:  '<path d="M12 4.5 2.8 20h18.4L12 4.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17.3v.1" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
  info:  '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 11v5.5M12 7.6v.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
};

export function toast(message, type = 'info', duration = 3600){
  const host = document.getElementById('toaster');
  if (!host) return;

  const node = el('div', { class: `toast toast--${type}` });
  node.innerHTML =
    `<svg class="toast__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</svg>` +
    `<span>${escapeHTML(message)}</span>`;

  host.append(node);

  const remove = () => {
    node.classList.add('is-out');
    node.addEventListener('animationend', () => node.remove(), { once: true });
  };
  const timer = setTimeout(remove, duration);
  node.addEventListener('click', () => { clearTimeout(timer); remove(); });
}

/* ---------- حوار التأكيد ---------- */
export function confirmDialog({ title, text, confirmText = 'تأكيد', cancelText = 'إلغاء', danger = false }){
  return new Promise((resolve) => {
    const backdrop = el('div', { class: 'modal-backdrop' });
    backdrop.innerHTML = render(html`
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <h2 class="modal__title" id="modalTitle">${title}</h2>
        <p class="modal__text">${text}</p>
        <div class="modal__actions">
          <button class="btn ${raw(danger ? 'btn--danger' : 'btn--primary')}" data-act="ok">${confirmText}</button>
          <button class="btn btn--ghost" data-act="cancel">${cancelText}</button>
        </div>
      </div>
    `);

    const lastFocused = document.activeElement;
    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (lastFocused instanceof HTMLElement) lastFocused.focus();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab'){
        // حصر التنقل بالمفاتيح داخل الحوار
        const focusables = $$('button', backdrop);
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
      const btn = e.target.closest('[data-act]');
      if (btn) close(btn.dataset.act === 'ok');
    });
    document.addEventListener('keydown', onKey);

    document.body.append(backdrop);
    $('[data-act="ok"]', backdrop)?.focus();
  });
}

/* ---------- مساعدات عامة ---------- */

/** الأحرف الأولى من الاسم، للصورة الرمزية */
export function initials(name = ''){
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

/** أرقام بالتنسيق العربي */
export function formatNumber(value){
  return new Intl.NumberFormat('ar-EG').format(value);
}

/** تاريخ مقروء بالعربية */
export function formatDate(timestamp){
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' }).format(new Date(timestamp));
}

/** «منذ ٣ أيام» */
export function timeAgo(timestamp){
  const diff = Date.now() - timestamp;
  const units = [
    ['year',   31536000000],
    ['month',   2592000000],
    ['week',     604800000],
    ['day',       86400000],
    ['hour',       3600000],
    ['minute',       60000],
  ];
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  for (const [unit, ms] of units){
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit);
  }
  return 'الآن';
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function debounce(fn, wait = 220){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** معرّف فريد قصير */
export function uid(prefix = 'id'){
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** يظهر العناصر تدريجياً عند دخولها الشاشة */
export function observeReveal(root = document){
  const items = $$('[data-reveal]', root);
  if (!items.length) return;

  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches){
    items.forEach((item) => item.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.reveal) || 0;
      setTimeout(() => entry.target.classList.add('is-revealed'), delay);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });

  items.forEach((item) => observer.observe(item));
}
