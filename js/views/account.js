/* =========================================================
   ANAS — حساب المستكشِف
   الملف الشخصي، التقدّم، الأوسمة، المحفوظات، والإعدادات
   ========================================================= */

import {
  html, raw, render, $, $$, toast, confirmDialog, delegate,
  initials, formatNumber, formatDate, timeAgo, observeReveal,
} from '../ui.js';
import { setCinemaDim } from '../background.js';
import { navigate, refresh } from '../router.js';
import { specimenSVG } from '../art.js';
import { getSpecimen, categoryLabel, formatSize } from '../data/specimens.js';
import { clearAll } from '../store.js';
import {
  currentUser, updateUser, logout, deleteAccount, changePassword,
  getProgress, levelInfo, earnedBadges, validateName,
} from '../auth.js';
import { wireSaveButtons } from './library.js';

const TABS = [
  { key: 'overview', label: 'نظرة عامة', icon: '📊' },
  { key: 'saved',    label: 'مكتبتي',    icon: '🔖' },
  { key: 'badges',   label: 'الأوسمة',   icon: '🏅' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function accountView({ outlet, query }){
  setCinemaDim(1);

  const user = currentUser();
  if (!user){
    outlet.innerHTML = render(html`
      <section class="section"><div class="wrap">
        <div class="empty">
          <div class="empty__icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M7 10.5V8a5 5 0 0 1 10 0v2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" stroke-width="2"/></svg>
          </div>
          <h1 class="empty__title">هذه الصفحة تحتاج تسجيل الدخول</h1>
          <p class="empty__text">أنشئ حساب مستكشِف مجاني ليُحفظ تقدّمك وعيّناتك المفضّلة.</p>
          <div class="row">
            <a class="btn btn--primary" href="#/login">تسجيل الدخول</a>
            <a class="btn btn--secondary" href="#/register">إنشاء حساب</a>
          </div>
        </div>
      </div></section>
    `);
    return;
  }

  const activeTab = TABS.some((t) => t.key === query.get('tab')) ? query.get('tab') : 'overview';
  const progress = getProgress();
  const level = levelInfo(progress.xp);

  outlet.innerHTML = render(html`
    <section class="section account">
      <div class="wrap">

        <!-- ======== ترويسة الحساب ======== -->
        <header class="account__head panel" data-reveal="0">
          <div class="avatar avatar--lg" aria-hidden="true">${initials(user.name)}</div>

          <div class="account__identity">
            <h1 class="account__name">${user.name}</h1>
            <p class="account__email latin">${user.email}</p>
            <div class="row" style="margin-top:10px">
              <span class="badge badge--${level.rank.color}">${level.rank.label}</span>
              <span class="badge">عضو منذ ${formatDate(user.createdAt)}</span>
            </div>
          </div>

          <div class="account__level">
            <div class="account__level-top">
              <span class="account__level-num">المستوى ${formatNumber(level.level)}</span>
              <span class="account__level-xp mono">${formatNumber(level.intoLevel)} / ${formatNumber(level.needed)} XP</span>
            </div>
            <div class="progress"><div class="progress__fill" style="width:${level.percent}%"></div></div>
            <p class="account__level-note">
              ${formatNumber(level.needed - level.intoLevel)} نقطة تفصلك عن المستوى ${formatNumber(level.level + 1)}
            </p>
          </div>
        </header>

        <!-- ======== التبويبات ======== -->
        <nav class="tabs" role="tablist" aria-label="أقسام الحساب">
          ${TABS.map((tab) => html`
            <a class="tabs__tab ${raw(tab.key === activeTab ? 'is-active' : '')}"
               role="tab" aria-selected="${tab.key === activeTab ? 'true' : 'false'}"
               href="#/account?tab=${tab.key}">
              <span aria-hidden="true">${tab.icon}</span> ${tab.label}
            </a>
          `)}
        </nav>

        <div id="tabPanel" role="tabpanel"></div>
      </div>
    </section>
  `);

  const panel = $('#tabPanel', outlet);
  const renderers = { overview, saved, badges, settings };
  renderers[activeTab](panel, user, progress, level);
  observeReveal(outlet);
}

/* =========================================================
   نظرة عامة
   ========================================================= */
function overview(panel, user, progress, level){
  const stats = [
    { icon: '👁️', value: progress.viewed.length,             label: 'عيّنة شوهدت' },
    { icon: '🔖', value: progress.saved.length,              label: 'عيّنة محفوظة' },
    { icon: '🔬', value: progress.microscopeSessions,        label: 'جلسة مجهر' },
    { icon: '🧬', value: progress.modelsExplored.length,     label: 'نموذج ثلاثي الأبعاد' },
    { icon: '✅', value: progress.quizCorrect,               label: 'إجابة صحيحة' },
    { icon: '⚡', value: progress.xp,                         label: 'نقطة خبرة' },
  ];

  const accuracy = progress.quizAnswered
    ? Math.round((progress.quizCorrect / progress.quizAnswered) * 100)
    : null;

  const recentSaved = progress.saved.slice(-4).reverse().map(getSpecimen).filter(Boolean);

  panel.innerHTML = render(html`
    <div class="stack">
      <div class="grid grid--4">
        ${stats.map((stat, i) => html`
          <div class="card stat-tile" data-reveal="${i * 40}">
            <span class="stat-tile__icon" aria-hidden="true">${stat.icon}</span>
            <strong class="stat-tile__value mono">${formatNumber(stat.value)}</strong>
            <span class="stat-tile__label">${stat.label}</span>
          </div>
        `)}
      </div>

      ${accuracy !== null ? html`
        <div class="card" data-reveal="0">
          <h2 class="specimen__section-title">دقّة إجاباتك</h2>
          <div class="row row--between" style="margin-bottom:10px">
            <span class="text-muted">${formatNumber(progress.quizCorrect)} صحيحة من ${formatNumber(progress.quizAnswered)}</span>
            <strong class="mono">${accuracy}%</strong>
          </div>
          <div class="progress"><div class="progress__fill" style="width:${accuracy}%"></div></div>
        </div>
      ` : ''}

      ${recentSaved.length ? html`
        <section class="card" data-reveal="0">
          <div class="row row--between" style="margin-bottom:16px">
            <h2 class="specimen__section-title" style="margin:0">آخر ما حفظت</h2>
            <a class="btn btn--ghost btn--sm" href="#/account?tab=saved">عرض الكل</a>
          </div>
          <ul class="related related--grid">
            ${recentSaved.map((specimen) => html`
              <li>
                <a class="related__item" href="#/library/${specimen.id}">
                  <span class="related__art">${raw(specimenSVG(specimen.art, { size: 44, animate: false }))}</span>
                  <span>
                    <span class="related__name">${specimen.name}</span>
                    <span class="related__latin latin">${specimen.latin}</span>
                  </span>
                </a>
              </li>
            `)}
          </ul>
        </section>
      ` : ''}

      <section class="card" data-reveal="0">
        <h2 class="specimen__section-title">سجلّ النشاط</h2>
        ${progress.activity.length ? html`
          <ul class="activity">
            ${progress.activity.slice(0, 12).map((entry) => html`
              <li class="activity__item">
                <span class="activity__dot" aria-hidden="true"></span>
                <div class="activity__body">
                  <span class="activity__text">${entry.text}</span>
                  <span class="activity__meta">
                    ${timeAgo(entry.at)}
                    ${entry.xp ? html` <span class="activity__xp mono">+${formatNumber(entry.xp)}</span>` : ''}
                  </span>
                </div>
              </li>
            `)}
          </ul>
        ` : html`
          <p class="text-muted">لا يوجد نشاط بعد — افتح أول عيّنة من <a href="#/library" style="color:var(--cyan)">المكتبة</a> ليبدأ سجلّك.</p>
        `}
      </section>
    </div>
  `);
}

/* =========================================================
   مكتبتي
   ========================================================= */
function saved(panel, user, progress){
  const items = progress.saved.map(getSpecimen).filter(Boolean);

  if (!items.length){
    panel.innerHTML = render(html`
      <div class="card">
        <div class="empty">
          <div class="empty__icon"><svg viewBox="0 0 24 24" fill="none"><path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/></svg></div>
          <h2 class="empty__title">مكتبتك فارغة</h2>
          <p class="empty__text">اضغط أيقونة الحفظ على أي عيّنة لتضيفها هنا وتعود إليها متى شئت.</p>
          <a class="btn btn--primary" href="#/library">تصفّح المكتبة</a>
        </div>
      </div>
    `);
    return;
  }

  panel.innerHTML = render(html`
    <div class="grid grid--3">
      ${items.map((specimen, i) => html`
        <article class="card card--hover specimen-card" data-reveal="${i * 40}" style="--glow:${specimen.art.palette[0]}">
          <a class="specimen-card__link" href="#/library/${specimen.id}">
            <div class="specimen-card__art">${raw(specimenSVG(specimen.art, { size: 130 }))}</div>
            <div class="specimen-card__meta"><span class="badge">${categoryLabel(specimen.category)}</span></div>
            <h3 class="specimen-card__name">${specimen.name}</h3>
            <p class="specimen-card__latin latin">${specimen.latin}</p>
            <p class="specimen-card__size mono">${formatSize(specimen.sizeText)}</p>
          </a>
          <button class="specimen-card__save is-saved" type="button" data-save="${specimen.id}"
                  aria-pressed="true" title="إزالة من المحفوظات">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>
            <span class="sr-only">إزالة من المحفوظات</span>
          </button>
        </article>
      `)}
    </div>
  `);

  wireSaveButtons(panel);
}

/* =========================================================
   الأوسمة
   ========================================================= */
function badges(panel, user, progress){
  const list = earnedBadges(progress);
  const earned = list.filter((badge) => badge.earned).length;

  panel.innerHTML = render(html`
    <div class="stack">
      <div class="card" data-reveal="0">
        <div class="row row--between" style="margin-bottom:12px">
          <h2 class="specimen__section-title" style="margin:0">تقدّمك في الأوسمة</h2>
          <strong class="mono">${formatNumber(earned)} / ${formatNumber(list.length)}</strong>
        </div>
        <div class="progress"><div class="progress__fill" style="width:${Math.round((earned / list.length) * 100)}%"></div></div>
      </div>

      <div class="grid grid--3">
        ${list.map((badge, i) => html`
          <div class="card badge-card ${raw(badge.earned ? 'is-earned' : '')}" data-reveal="${i * 40}">
            <span class="badge-card__icon" aria-hidden="true">${badge.icon}</span>
            <h3 class="badge-card__label">${badge.label}</h3>
            <p class="badge-card__desc">${badge.desc}</p>
            <span class="badge badge--${raw(badge.earned ? 'ok' : '')}">${badge.earned ? 'مفتوح ✓' : 'مقفل'}</span>
          </div>
        `)}
      </div>
    </div>
  `);
}

/* =========================================================
   الإعدادات
   ========================================================= */
function settings(panel, user){
  panel.innerHTML = render(html`
    <div class="stack">

      <!-- الملف الشخصي -->
      <section class="card" data-reveal="0">
        <h2 class="specimen__section-title">الملف الشخصي</h2>
        <form class="stack" id="profileForm" novalidate style="gap:16px">
          <div class="field">
            <label class="field__label" for="setName">الاسم</label>
            <input class="input" id="setName" name="name" type="text" value="${user.name}" required />
            <p class="field__error" data-error="name"></p>
          </div>

          <div class="field">
            <label class="field__label" for="setBio">نبذة عنك</label>
            <textarea class="textarea" id="setBio" name="bio" maxlength="240"
                      placeholder="مثال: طالب أحياء مهتم بعلم الفيروسات.">${user.bio ?? ''}</textarea>
            <p class="field__hint">٢٤٠ حرفاً كحد أقصى.</p>
          </div>

          <div class="field">
            <label class="field__label" for="setInterest">اهتمامك الأساسي</label>
            <select class="select" id="setInterest" name="interest">
              <option value="general"  ${raw(user.interest === 'general'  ? 'selected' : '')}>كل شيء في العالم المجهري</option>
              <option value="bacteria" ${raw(user.interest === 'bacteria' ? 'selected' : '')}>البكتيريا والميكروبات</option>
              <option value="virus"    ${raw(user.interest === 'virus'    ? 'selected' : '')}>الفيروسات والمناعة</option>
              <option value="cell"     ${raw(user.interest === 'cell'     ? 'selected' : '')}>الخلايا وعلم الأنسجة</option>
              <option value="genetics" ${raw(user.interest === 'genetics' ? 'selected' : '')}>الوراثة والحمض النووي</option>
            </select>
          </div>

          <div class="row"><button class="btn btn--primary" type="submit">احفظ التعديلات</button></div>
        </form>
      </section>

      <!-- كلمة المرور -->
      <section class="card" data-reveal="0">
        <h2 class="specimen__section-title">تغيير كلمة المرور</h2>
        <form class="stack" id="passwordForm" novalidate style="gap:16px">
          <div class="field">
            <label class="field__label" for="curPass">كلمة المرور الحالية</label>
            <input class="input" id="curPass" name="currentPassword" type="password" autocomplete="current-password" required />
            <p class="field__error" data-error="currentPassword"></p>
          </div>
          <div class="field">
            <label class="field__label" for="newPass">كلمة المرور الجديدة</label>
            <input class="input" id="newPass" name="newPassword" type="password" autocomplete="new-password" required />
            <p class="field__error" data-error="newPassword"></p>
          </div>
          <div class="row"><button class="btn btn--secondary" type="submit">حدّث كلمة المرور</button></div>
        </form>
      </section>

      <!-- البيانات -->
      <section class="card" data-reveal="0">
        <h2 class="specimen__section-title">بياناتك</h2>
        <p class="text-muted" style="margin-bottom:16px;font-size:14px">
          كل بياناتك محفوظة في هذا المتصفح فقط. يمكنك تصديرها كملف احتياطي، أو حذفها نهائياً.
        </p>
        <div class="row">
          <button class="btn btn--secondary" type="button" id="exportBtn">صدّر بياناتي (JSON)</button>
          <button class="btn btn--ghost" type="button" id="logoutBtn">تسجيل الخروج</button>
        </div>
      </section>

      <!-- المنطقة الحساسة -->
      <section class="card danger-zone" data-reveal="0">
        <h2 class="specimen__section-title" style="color:var(--danger)">منطقة الحذف</h2>
        <p class="text-muted" style="margin-bottom:16px;font-size:14px">
          حذف الحساب يمسح تقدّمك ومحفوظاتك نهائياً، ولا يمكن التراجع عنه.
        </p>
        <div class="row">
          <button class="btn btn--danger" type="button" id="deleteBtn">احذف حسابي نهائياً</button>
          <button class="btn btn--ghost" type="button" id="resetBtn">امسح كل بيانات المنصة من المتصفح</button>
        </div>
      </section>
    </div>
  `);

  /* --- حفظ الملف الشخصي --- */
  const profileForm = $('#profileForm', panel);
  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(profileForm));

    const nameError = validateName(data.name);
    $('[data-error="name"]', profileForm).textContent = nameError ?? '';
    if (nameError) return;

    updateUser(() => ({
      name: String(data.name).trim(),
      bio: String(data.bio ?? '').trim(),
      interest: data.interest,
    }));
    toast('تم حفظ التعديلات ✓', 'ok');
    refresh();
  });

  /* --- تغيير كلمة المرور --- */
  const passwordForm = $('#passwordForm', panel);
  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(passwordForm));
    $$('.field__error', passwordForm).forEach((box) => { box.textContent = ''; });

    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      toast('تم تحديث كلمة المرور ✓', 'ok');
    } catch (error){
      const field = /الحالية/.test(error.message) ? 'currentPassword' : 'newPassword';
      $(`[data-error="${field}"]`, passwordForm).textContent = error.message;
    }
  });

  /* --- تصدير البيانات --- */
  $('#exportBtn', panel).addEventListener('click', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'ANAS',
      user: { name: user.name, email: user.email, bio: user.bio, interest: user.interest, createdAt: user.createdAt },
      progress: getProgress(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('تم تنزيل نسخة من بياناتك', 'ok');
  });

  /* --- خروج --- */
  $('#logoutBtn', panel).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'تسجيل الخروج',
      text: 'سيبقى حسابك وتقدّمك محفوظاً في هذا المتصفح، ويمكنك الدخول مجدداً في أي وقت.',
      confirmText: 'خروج',
    });
    if (!ok) return;
    logout();
    toast('تم تسجيل الخروج', 'info');
    navigate('/');
  });

  /* --- حذف الحساب --- */
  $('#deleteBtn', panel).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'حذف الحساب نهائياً',
      text: 'سيُمسح حسابك وكل تقدّمك ومحفوظاتك، ولا يمكن استرجاعها. هل أنت متأكد؟',
      confirmText: 'نعم، احذف حسابي',
      danger: true,
    });
    if (!ok) return;
    deleteAccount();
    toast('تم حذف الحساب', 'info');
    navigate('/');
  });

  /* --- مسح كل البيانات --- */
  $('#resetBtn', panel).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'مسح كل بيانات المنصة',
      text: 'سيُحذف كل الحسابات المخزّنة في هذا المتصفح وكل التفضيلات. لا يمكن التراجع.',
      confirmText: 'امسح كل شيء',
      danger: true,
    });
    if (!ok) return;
    clearAll();
    toast('تم مسح بيانات المنصة', 'info');
    navigate('/');
    location.reload();
  });
}
