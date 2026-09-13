/* =========================================================
   ANAS — المكتبة العلمية
   شبكة العيّنات مع بحث وفلترة وترتيب + صفحة تفاصيل كاملة
   ========================================================= */

import { html, raw, render, $, $$, toast, debounce, delegate, observeReveal } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { specimenSVG } from '../art.js';
import {
  SPECIMENS, CATEGORIES, RISK_LEVELS,
  getSpecimen, searchSpecimens, categoryCounts, categoryLabel, formatSize,
} from '../data/specimens.js';
import {
  isLoggedIn, isSaved, toggleSaved, markViewed, getProgress,
  recordQuizAnswer, logActivity,
} from '../auth.js';

const BOOKMARK_ON  = '<path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1Z" fill="currentColor"/>';
const BOOKMARK_OFF = '<path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>';

/** بطاقة عيّنة واحدة في الشبكة */
function specimenCard(specimen, index){
  const saved = isLoggedIn() && isSaved(specimen.id);
  const risk = RISK_LEVELS[specimen.risk];

  return html`
    <article class="card card--hover specimen-card" data-reveal="${Math.min(index, 8) * 45}"
             style="--glow:${specimen.art.palette[0]}">
      <a class="specimen-card__link" href="#/library/${specimen.id}" aria-label="افتح ملف ${specimen.name}">
        <div class="specimen-card__art">${raw(specimenSVG(specimen.art, { size: 150 }))}</div>
        <div class="specimen-card__meta">
          <span class="badge">${categoryLabel(specimen.category)}</span>
          <span class="badge badge--${risk.badge}">${risk.label}</span>
        </div>
        <h3 class="specimen-card__name">${specimen.name}</h3>
        <p class="specimen-card__latin latin">${specimen.latin}</p>
        <p class="specimen-card__summary">${specimen.summary}</p>
        <p class="specimen-card__size mono">${formatSize(specimen.sizeText)}</p>
      </a>
      <button class="specimen-card__save ${raw(saved ? 'is-saved' : '')}" type="button"
              data-save="${specimen.id}" aria-pressed="${saved ? 'true' : 'false'}"
              title="${saved ? 'إزالة من المحفوظات' : 'احفظ في مكتبتي'}">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${raw(saved ? BOOKMARK_ON : BOOKMARK_OFF)}</svg>
        <span class="sr-only">${saved ? 'إزالة من المحفوظات' : 'احفظ في مكتبتي'}</span>
      </button>
    </article>`;
}

/** يفعّل أزرار الحفظ داخل أي حاوية */
export function wireSaveButtons(root){
  delegate(root, 'click', '[data-save]', (event, button) => {
    event.preventDefault();

    if (!isLoggedIn()){
      toast('سجّل الدخول أولاً لتحفظ العيّنات في مكتبتك', 'warn');
      return;
    }

    const id = button.dataset.save;
    const nowSaved = toggleSaved(id);
    const specimen = getSpecimen(id);

    button.classList.toggle('is-saved', nowSaved);
    button.setAttribute('aria-pressed', String(nowSaved));
    button.title = nowSaved ? 'إزالة من المحفوظات' : 'احفظ في مكتبتي';
    $('svg', button).innerHTML = nowSaved ? BOOKMARK_ON : BOOKMARK_OFF;
    const label = $('.sr-only', button);
    if (label) label.textContent = nowSaved ? 'إزالة من المحفوظات' : 'احفظ في مكتبتي';

    if (nowSaved){
      logActivity(`حفظت «${specimen?.name ?? id}» في مكتبتك`, 15);
      toast('أُضيفت إلى مكتبتك ⭐ (+١٥ نقطة)', 'ok');
    } else {
      toast('أُزيلت من مكتبتك', 'info');
    }
  });
}

/* =========================================================
   شبكة المكتبة
   ========================================================= */
export function libraryView({ outlet, query }){
  setCinemaDim(1);

  const counts = categoryCounts();
  const state = {
    query: query.get('q') ?? '',
    category: query.get('cat') ?? 'all',
    sort: query.get('sort') ?? 'name',
    savedOnly: query.get('saved') === '1',
  };

  outlet.innerHTML = render(html`
    <section class="section library">
      <div class="wrap">
        <header class="section__head" data-reveal="0">
          <span class="eyebrow"><span class="eyebrow__dot"></span> المكتبة العلمية</span>
          <h1 class="section__title" style="margin-top:18px">كل عيّنة <span>لها قصة</span></h1>
          <p class="section__lead">
            ابحث بالاسم العربي أو اللاتيني أو حتى بالبيئة التي يعيش فيها الكائن. اضغط أي بطاقة لفتح ملفها العلمي الكامل.
          </p>
        </header>

        <div class="library__controls panel" data-reveal="0">
          <div class="library__search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
              <path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input class="input" id="searchInput" type="search" value="${state.query}"
                   placeholder="ابحث عن كائن، أو بيئة، أو اسم لاتيني…" aria-label="ابحث في المكتبة" />
          </div>

          <div class="library__filters" role="group" aria-label="تصفية حسب التصنيف">
            ${CATEGORIES.map((category) => html`
              <button class="chip ${raw(state.category === category.key ? 'is-active' : '')}"
                      type="button" data-cat="${category.key}">
                <span aria-hidden="true">${category.icon}</span>
                ${category.label}
                <span class="chip__count">${counts[category.key] ?? 0}</span>
              </button>
            `)}
          </div>

          <div class="library__tools">
            <label class="sr-only" for="sortSelect">ترتيب النتائج</label>
            <select class="select" id="sortSelect">
              <option value="name"      ${raw(state.sort === 'name' ? 'selected' : '')}>ترتيب أبجدي</option>
              <option value="sizeAsc"   ${raw(state.sort === 'sizeAsc' ? 'selected' : '')}>الأصغر حجماً أولاً</option>
              <option value="sizeDesc"  ${raw(state.sort === 'sizeDesc' ? 'selected' : '')}>الأكبر حجماً أولاً</option>
              <option value="category"  ${raw(state.sort === 'category' ? 'selected' : '')}>حسب التصنيف</option>
            </select>

            <button class="chip ${raw(state.savedOnly ? 'is-active' : '')}" type="button" id="savedToggle">
              <span aria-hidden="true">🔖</span> محفوظاتي فقط
            </button>
          </div>
        </div>

        <p class="library__count" id="resultCount" aria-live="polite"></p>
        <div class="grid grid--3" id="results"></div>
      </div>
    </section>
  `);

  const resultsEl = $('#results', outlet);
  const countEl = $('#resultCount', outlet);

  function paint(){
    let results = searchSpecimens(state);
    if (state.savedOnly){
      const saved = getProgress().saved;
      results = results.filter((specimen) => saved.includes(specimen.id));
    }

    countEl.textContent = results.length
      ? `${results.length} عيّنة`
      : '';

    if (!results.length){
      resultsEl.innerHTML = render(html`
        <div class="empty" style="grid-column:1/-1">
          <div class="empty__icon">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </div>
          <h2 class="empty__title">${state.savedOnly ? 'مكتبتك فارغة بعد' : 'لا توجد نتائج'}</h2>
          <p class="empty__text">
            ${state.savedOnly
              ? 'اضغط أيقونة الحفظ على أي بطاقة لتضيفها هنا.'
              : 'جرّب كلمة بحث أخرى أو اختر تصنيفاً مختلفاً.'}
          </p>
          <button class="btn btn--secondary" type="button" id="resetFilters">أعد ضبط البحث</button>
        </div>
      `);
      $('#resetFilters', resultsEl)?.addEventListener('click', () => {
        state.query = ''; state.category = 'all'; state.savedOnly = false;
        $('#searchInput', outlet).value = '';
        $$('[data-cat]', outlet).forEach((chip) => chip.classList.toggle('is-active', chip.dataset.cat === 'all'));
        $('#savedToggle', outlet).classList.remove('is-active');
        syncUrl(); paint();
      });
      return;
    }

    resultsEl.innerHTML = render(html`${results.map(specimenCard)}`);
    observeReveal(resultsEl);
  }

  function syncUrl(){
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.category !== 'all') params.set('cat', state.category);
    if (state.sort !== 'name') params.set('sort', state.sort);
    if (state.savedOnly) params.set('saved', '1');
    const suffix = params.toString();
    history.replaceState(null, '', '#/library' + (suffix ? '?' + suffix : ''));
  }

  $('#searchInput', outlet).addEventListener('input', debounce((event) => {
    state.query = event.target.value;
    syncUrl(); paint();
  }, 180));

  delegate(outlet, 'click', '[data-cat]', (_event, chip) => {
    state.category = chip.dataset.cat;
    $$('[data-cat]', outlet).forEach((other) => other.classList.toggle('is-active', other === chip));
    syncUrl(); paint();
  });

  $('#sortSelect', outlet).addEventListener('change', (event) => {
    state.sort = event.target.value;
    syncUrl(); paint();
  });

  $('#savedToggle', outlet).addEventListener('click', (event) => {
    if (!isLoggedIn()){
      toast('سجّل الدخول لعرض محفوظاتك', 'warn');
      return;
    }
    state.savedOnly = !state.savedOnly;
    event.currentTarget.classList.toggle('is-active', state.savedOnly);
    syncUrl(); paint();
  });

  wireSaveButtons(outlet);
  observeReveal(outlet);
  paint();
}

/* =========================================================
   صفحة العيّنة
   ========================================================= */
export function specimenView({ outlet, params }){
  setCinemaDim(1);

  const specimen = getSpecimen(params.id);
  if (!specimen){
    outlet.innerHTML = render(html`
      <section class="section"><div class="wrap">
        <div class="empty">
          <div class="empty__icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5M12 16.2v.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></div>
          <h1 class="empty__title">لم نجد هذه العيّنة</h1>
          <p class="empty__text">ربما تغيّر الرابط. عُد إلى المكتبة واختر عيّنة أخرى.</p>
          <a class="btn btn--primary" href="#/library">عودة إلى المكتبة</a>
        </div>
      </div></section>
    `);
    return;
  }

  // منح نقاط أول مشاهدة
  if (markViewed(specimen.id)){
    logActivity(`شاهدت «${specimen.name}» لأول مرة`, 10);
    setTimeout(() => toast('عيّنة جديدة في سجلّك ✨ (+١٠ نقاط)', 'ok'), 500);
  }

  const risk = RISK_LEVELS[specimen.risk];
  const saved = isLoggedIn() && isSaved(specimen.id);
  const related = SPECIMENS
    .filter((s) => s.category === specimen.category && s.id !== specimen.id)
    .slice(0, 3);

  // مقارنة الحجم: العيّنة مقابل شعرة الإنسان (70 ميكرومتر)
  const hairUm = 70;
  const ratio = specimen.sizeUm / hairUm;
  const sizeNote = ratio >= 1
    ? `أكبر من سُمك شعرة الإنسان بنحو ${(ratio).toFixed(1)} مرة`
    : `يلزم نحو ${Math.round(1 / ratio)} منها جنباً إلى جنب لتعادل سُمك شعرة واحدة`;

  outlet.innerHTML = render(html`
    <article class="section specimen">
      <div class="wrap">
        <nav class="breadcrumb" aria-label="مسار التنقل">
          <a href="#/library">المكتبة العلمية</a>
          <span aria-hidden="true">‹</span>
          <span>${categoryLabel(specimen.category)}</span>
        </nav>

        <header class="specimen__head panel" style="--glow:${specimen.art.palette[0]}">
          <div class="specimen__intro">
            <div class="row">
              <span class="badge">${categoryLabel(specimen.category)}</span>
              <span class="badge badge--${risk.badge}">${risk.label}</span>
            </div>

            <h1 class="specimen__name">${specimen.name}</h1>
            <p class="specimen__latin latin">${specimen.latin}</p>
            <p class="specimen__summary">${specimen.summary}</p>

            <div class="row">
              <button class="btn ${raw(saved ? 'btn--secondary' : 'btn--primary')}" type="button" data-save="${specimen.id}">
                <svg class="btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">${raw(saved ? BOOKMARK_ON : BOOKMARK_OFF)}</svg>
                <span class="sr-only"></span>
                ${saved ? 'محفوظة في مكتبتك' : 'احفظ في مكتبتي'}
              </button>
              <a class="btn btn--secondary" href="#/microscope?specimen=${specimen.id}">افحصها تحت المجهر</a>
            </div>
          </div>

          <div class="specimen__portrait">
            ${raw(specimenSVG(specimen.art, { size: 260 }))}
          </div>
        </header>

        <div class="specimen__grid">
          <div class="specimen__main stack">
            <section class="card">
              <h2 class="specimen__section-title">نظرة تفصيلية</h2>
              <p class="specimen__body">${specimen.body}</p>
            </section>

            <section class="card">
              <h2 class="specimen__section-title">حقائق مدهشة</h2>
              <ul class="facts">
                ${specimen.facts.map((fact) => html`
                  <li class="facts__item">
                    <span class="facts__bullet" aria-hidden="true">◆</span>
                    <span>${fact}</span>
                  </li>
                `)}
              </ul>
            </section>

            ${specimen.quiz ? html`
              <section class="card quiz" id="quizCard">
                <h2 class="specimen__section-title">اختبر معلوماتك</h2>
                <p class="quiz__question">${specimen.quiz.question}</p>
                <div class="quiz__options">
                  ${specimen.quiz.options.map((option, i) => html`
                    <button class="quiz__option" type="button" data-option="${i}">${option}</button>
                  `)}
                </div>
                <p class="quiz__feedback" id="quizFeedback" role="status"></p>
              </section>
            ` : ''}
          </div>

          <aside class="specimen__aside stack">
            <section class="card">
              <h2 class="specimen__section-title">البطاقة التعريفية</h2>
              <dl class="datalist">
                <div><dt>الحجم</dt><dd class="mono">${formatSize(specimen.sizeText)}</dd></div>
                <div><dt>التصنيف</dt><dd>${categoryLabel(specimen.category)}</dd></div>
                <div><dt>البيئة</dt><dd>${specimen.habitat}</dd></div>
                <div><dt>الاكتشاف</dt><dd>${specimen.discovered}</dd></div>
                <div><dt>الخطورة</dt><dd>${risk.label}</dd></div>
              </dl>
            </section>

            <section class="card scale-card">
              <h2 class="specimen__section-title">مقارنة الحجم</h2>
              <div class="scale">
                <div class="scale__row">
                  <span class="scale__label">${specimen.name}</span>
                  <div class="scale__bar"><span style="width:${Math.max(2, Math.min(100, ratio * 100))}%"></span></div>
                </div>
                <div class="scale__row scale__row--ref">
                  <span class="scale__label">شعرة إنسان</span>
                  <div class="scale__bar scale__bar--ref"><span style="width:100%"></span></div>
                </div>
              </div>
              <p class="scale__note">${sizeNote}.</p>
            </section>

            ${related.length ? html`
              <section class="card">
                <h2 class="specimen__section-title">عيّنات قريبة</h2>
                <ul class="related">
                  ${related.map((item) => html`
                    <li>
                      <a class="related__item" href="#/library/${item.id}">
                        <span class="related__art">${raw(specimenSVG(item.art, { size: 44, animate: false }))}</span>
                        <span>
                          <span class="related__name">${item.name}</span>
                          <span class="related__latin latin">${item.latin}</span>
                        </span>
                      </a>
                    </li>
                  `)}
                </ul>
              </section>
            ` : ''}
          </aside>
        </div>
      </div>
    </article>
  `);

  wireSaveButtons(outlet);
  wireQuiz(outlet, specimen);
}

/** يفعّل سؤال الاختبار */
function wireQuiz(root, specimen){
  if (!specimen.quiz) return;

  const card = $('#quizCard', root);
  const feedback = $('#quizFeedback', card);
  let answered = false;

  delegate(card, 'click', '[data-option]', (_event, button) => {
    if (answered) return;
    answered = true;

    const chosen = Number(button.dataset.option);
    const correct = chosen === specimen.quiz.answer;

    $$('[data-option]', card).forEach((option, i) => {
      option.disabled = true;
      if (i === specimen.quiz.answer) option.classList.add('is-correct');
      else if (i === chosen) option.classList.add('is-wrong');
    });

    feedback.textContent = (correct ? '✅ إجابة صحيحة — ' : '❌ ليست الإجابة الصحيحة — ') + specimen.quiz.explain;
    feedback.classList.add(correct ? 'is-correct' : 'is-wrong');

    if (isLoggedIn()){
      recordQuizAnswer(correct);
      if (correct){
        logActivity(`أجبت بشكل صحيح على سؤال «${specimen.name}»`, 25);
        toast('إجابة صحيحة! (+٢٥ نقطة)', 'ok');
      }
    } else {
      toast('سجّل الدخول لتُحتسب إجاباتك في تقدّمك', 'info');
    }
  });
}
