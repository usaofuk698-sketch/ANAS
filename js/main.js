/* =========================================================
   ANAS — نقطة الإقلاع
   تركيب الموجّه، الشريط العلوي، حالة الحساب، والخلفية
   ========================================================= */

import { $, html, render, initials, toast } from './ui.js';
import { route, setNotFound, startRouter, navigate } from './router.js';
import { initBackground, setCinemaDim } from './background.js';
import { currentUser, logout, onAuthChange, levelInfo, getProgress } from './auth.js';
import { storageAvailable } from './store.js';

import homeView from './views/home.js';
import { loginView, registerView } from './views/auth.js';
import accountView from './views/account.js';
import { libraryView, specimenView } from './views/library.js';
import microscopeView from './views/microscope.js';
import assistantView from './views/assistant.js';
import lab3dView from './views/lab3d.js';

/* =========================================================
   المسارات
   ========================================================= */
route('/',              homeView);
route('/library',       libraryView);
route('/library/:id',   specimenView);
route('/microscope',    microscopeView);
route('/lab3d',         lab3dView);
route('/assistant',     assistantView);
route('/login',         loginView);
route('/register',      registerView);
route('/account',       accountView);

setNotFound(({ outlet }) => {
  setCinemaDim(1);
  outlet.innerHTML = render(html`
    <section class="section"><div class="wrap">
      <div class="empty">
        <div class="empty__icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="empty__title">لا توجد صفحة على هذا الرابط</h1>
        <p class="empty__text">ربما تغيّر الرابط أو كُتب بشكل خاطئ. عُد إلى الرئيسية وتابع الاستكشاف.</p>
        <div class="row">
          <a class="btn btn--primary" href="#/">الصفحة الرئيسية</a>
          <a class="btn btn--secondary" href="#/library">المكتبة العلمية</a>
        </div>
      </div>
    </div></section>
  `);
});

/* =========================================================
   حالة الحساب في الشريط العلوي
   ========================================================= */
let authSlotListeners = null;

function paintAuthSlot(){
  const slot = $('#authSlot');
  if (!slot) return;

  const user = currentUser();

  if (!user){
    slot.innerHTML = render(html`
      <a class="btn btn--ghost btn--sm topbar__login" href="#/login">دخول</a>
      <a class="btn btn--primary btn--sm" href="#/register">إنشاء حساب</a>
    `);
    return;
  }

  const level = levelInfo(getProgress().xp);

  slot.innerHTML = render(html`
    <div class="usermenu" id="usermenu">
      <button class="usermenu__trigger" type="button" id="usermenuBtn" aria-expanded="false" aria-haspopup="true">
        <span class="avatar avatar--sm" aria-hidden="true">${initials(user.name)}</span>
        <span class="usermenu__trigger-text">${user.name.split(' ')[0]}</span>
        <span class="badge badge--${level.rank.color} usermenu__level">${level.level}</span>
      </button>

      <div class="usermenu__panel" role="menu">
        <div class="usermenu__head">
          <div class="usermenu__name">${user.name}</div>
          <div class="usermenu__mail">${user.email}</div>
        </div>

        <a class="usermenu__item" role="menuitem" href="#/account">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.6" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 20c.7-3.6 3.7-5.6 7.2-5.6s6.5 2 7.2 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          حسابي
        </a>
        <a class="usermenu__item" role="menuitem" href="#/account?tab=saved">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          مكتبتي
        </a>
        <a class="usermenu__item" role="menuitem" href="#/account?tab=badges">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="5.2" stroke="currentColor" stroke-width="1.8"/><path d="m8.6 13.4-1.4 7 4.8-2.6 4.8 2.6-1.4-7" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          الأوسمة
        </a>
        <a class="usermenu__item" role="menuitem" href="#/account?tab=settings">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.9 6.1l-1.4 1.4M7.5 16.5l-1.4 1.4M17.9 17.9l-1.4-1.4M7.5 7.5 6.1 6.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          الإعدادات
        </a>

        <div class="usermenu__sep"></div>

        <button class="usermenu__item usermenu__item--danger" role="menuitem" type="button" id="menuLogout">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 7V5.5a2 2 0 0 0-2-2H6.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2H12a2 2 0 0 0 2-2V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.5 12h11m0 0-3-3m3 3-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          تسجيل الخروج
        </button>
      </div>
    </div>
  `);

  const menu = $('#usermenu');
  const trigger = $('#usermenuBtn');

  // كل إعادة رسم تُلغي مستمعات النسخة السابقة على document،
  // وإلا تراكمت مع كل تغيّر في حالة الحساب
  authSlotListeners?.abort();
  authSlotListeners = new AbortController();
  const { signal } = authSlotListeners;

  const close = () => {
    menu.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  };

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) close();
  }, { signal });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  }, { signal });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  $('#menuLogout').addEventListener('click', () => {
    close();
    logout();
    toast('تم تسجيل الخروج', 'info');
    navigate('/');
  });
}

/* =========================================================
   الشريط العلوي — القائمة والتصاق التمرير
   ========================================================= */
function initTopbar(){
  const topbar = $('#topbar');
  const burger = $('#burger');
  const nav = $('#nav');

  // تغيير مظهر الشريط عند التمرير
  const onScroll = () => {
    topbar.classList.toggle('is-stuck', window.scrollY > 24);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // قائمة الجوال
  const closeNav = () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'فتح القائمة');
  };

  burger.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNav();
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !burger.contains(event.target)) closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  addEventListener('hashchange', closeNav);
}

/* =========================================================
   الإقلاع
   ========================================================= */
function boot(){
  // سنة التذييل
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  initBackground();
  initTopbar();
  paintAuthSlot();
  onAuthChange(paintAuthSlot);

  // مسار افتراضي عند فتح الصفحة بلا hash
  if (!location.hash) navigate('/', { replace: true });

  startRouter();

  // تنبيه إذا كان التخزين المحلي معطّلاً (تصفّح خاص مثلاً)
  if (!storageAvailable){
    setTimeout(() => {
      toast('التخزين المحلي معطّل في متصفحك — لن يُحفظ تقدّمك بعد إغلاق الصفحة', 'warn', 7000);
    }, 1200);
  }

  console.info(
    '%cANAS%c — ANalysis & Advanced Sciences\n' +
    'منصة تعمل بالكامل في المتصفح. البيانات محفوظة محلياً على جهازك.',
    'font-weight:800;letter-spacing:.18em;color:#64d9ff',
    'color:#a9c4db',
  );
}

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
