/* =========================================================
   ANAS — موجّه المسارات
   يعتمد على الـ hash (#/library) ليعمل على أي استضافة ثابتة
   مثل GitHub Pages دون أي إعدادات خادم.
   ========================================================= */

import { $, $$, observeReveal } from './ui.js';

const routes = [];
let notFoundHandler = null;
let currentCleanup = null;
let currentPath = null;

/**
 * يسجّل مساراً.
 * النمط يدعم المعاملات: '/library/:id'
 */
export function route(pattern, view, options = {}){
  const keys = [];
  const source = pattern
    .replace(/\/$/, '')
    // نهرّب رموز التعابير النمطية، مع إبقاء "/" و ":" كما هما
    // لأن الخطوة التالية تعتمد عليهما في التقاط المعاملات
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:(\w+)/g, (_, key) => { keys.push(key); return '/([^/]+)'; });

  const regex = new RegExp('^' + source + '/?$');
  routes.push({ pattern, regex, keys, view, options });
}

export function setNotFound(view){
  notFoundHandler = view;
}

/** المسار الحالي من الـ hash */
export function getPath(){
  const hash = location.hash.replace(/^#/, '');
  return (hash || '/').split('?')[0] || '/';
}

/** معاملات الاستعلام من الـ hash: #/library?q=خلية */
export function getQuery(){
  const hash = location.hash.replace(/^#/, '');
  const queryIndex = hash.indexOf('?');
  return new URLSearchParams(queryIndex === -1 ? '' : hash.slice(queryIndex + 1));
}

export function navigate(path, { replace = false } = {}){
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) location.replace(target);
  else location.hash = target;
}

function match(path){
  for (const entry of routes){
    const result = entry.regex.exec(path);
    if (!result) continue;
    const params = {};
    entry.keys.forEach((key, i) => { params[key] = decodeURIComponent(result[i + 1]); });
    return { entry, params };
  }
  return null;
}

/** يحدّث تمييز الرابط النشط في الشريط العلوي */
function highlightNav(path){
  $$('.nav__link').forEach((link) => {
    const target = link.dataset.route;
    const active = target === '/' ? path === '/' : path.startsWith(target);
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function resolve(){
  const path = getPath();
  const outlet = $('#main');
  if (!outlet) return;

  // استدعاء منظِّف الصفحة السابقة (إيقاف مؤقّتات، حلقات رسم، مستمعات)
  if (typeof currentCleanup === 'function'){
    try { currentCleanup(); } catch (error){ console.error('[router] cleanup failed', error); }
    currentCleanup = null;
  }

  const matched = match(path);
  const view = matched ? matched.entry.view : notFoundHandler;
  const params = matched?.params ?? {};

  if (!view){
    outlet.innerHTML = '<div class="wrap section"><p>الصفحة غير موجودة.</p></div>';
    return;
  }

  document.body.dataset.route = matched?.entry.pattern ?? 'not-found';
  highlightNav(path);

  /*
     نبني حاوية جديدة لكل صفحة بدل إعادة استخدام #main نفسه.
     السبب: الصفحات تربط مستمعات مفوَّضة على الحاوية، ولو بقيت
     الحاوية نفسها لتراكمت المستمعات مع كل تنقّل فنُفِّذ الحدث
     الواحد مرات متعددة (مثال: زر الحفظ يحفظ ثم يلغي الحفظ فوراً).
     الحاوية الجديدة تموت معها كل مستمعاتها تلقائياً.
   */
  const container = document.createElement('div');
  container.className = 'view__page';
  outlet.replaceChildren(container);

  try {
    const result = await view({ params, query: getQuery(), path, outlet: container });
    if (typeof result === 'function') currentCleanup = result;
  } catch (error){
    console.error('[router] view failed', error);
    container.innerHTML = `
      <div class="wrap section">
        <div class="empty">
          <div class="empty__icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5M12 16.2v.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
          <h2 class="empty__title">حدث خطأ أثناء تحميل الصفحة</h2>
          <p class="empty__text">حاول تحديث الصفحة. إذا تكرّر الخطأ فافتح وحدة التحكم لمعرفة التفاصيل.</p>
        </div>
      </div>`;
  }

  /* تفعيل الظهور التدريجي على مستوى الموجّه: أي عنصر يحمل
     data-reveal يبقى شفافاً تماماً حتى يُراقَب، فنضمن هنا أن
     كل صفحة تُراقَب ولو نسيت استدعاء observeReveal بنفسها. */
  observeReveal(container);

  // التمرير للأعلى عند تغيّر الصفحة فعلياً (لا عند تغيّر الاستعلام فقط)
  if (path !== currentPath){
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    currentPath = path;
  }

  // تركيز منطقة المحتوى لقارئات الشاشة
  outlet.focus({ preventScroll: true });
}

export function startRouter(){
  window.addEventListener('hashchange', resolve);
  resolve();
}

/** يفرض إعادة بناء الصفحة الحالية */
export function refresh(){
  resolve();
}
