/* =========================================================
   ANAS — الصفحة الرئيسية
   الهيرو السينمائي (مبني على الواجهة الأصلية) + أقسام المنصة
   ========================================================= */

import { html, raw, render, observeReveal, formatNumber } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { SPECIMENS, categoryCounts, formatSize } from '../data/specimens.js';
import { specimenSVG } from '../art.js';
import { currentUser } from '../auth.js';

const FEATURES = [
  {
    icon: '🔬',
    title: 'المكتبة العلمية',
    text: 'أكثر من عشرين عيّنة مجهرية موثّقة: بكتيريا وفيروسات وخلايا وطفيليات، مع بطاقة تفصيلية وحقائق مدهشة لكل عيّنة.',
    href: '#/library',
    cta: 'تصفّح المكتبة',
  },
  {
    icon: '🦠',
    title: 'المجهر الافتراضي',
    text: 'مجهر كامل في متصفحك: تحكّم في التكبير والإضاءة والتبئير والأصباغ، مع مسطرة قياس حقيقية بالميكرومتر.',
    href: '#/microscope',
    cta: 'ادخل المختبر',
  },
  {
    icon: '🧬',
    title: 'قسم الـ3D',
    text: 'نماذج ثلاثية الأبعاد تفاعلية للحمض النووي والفيروس والخلية — قم بتدويرها وتقريبها واستكشف بنيتها بنفسك.',
    href: '#/lab3d',
    cta: 'استكشف النماذج',
  },
  {
    icon: '🤖',
    title: 'المساعد الذكي',
    text: 'اسأل عن أي كائن مجهري أو مفهوم علمي واحصل على إجابة مبسّطة، مع اقتراح العيّنات المرتبطة بسؤالك.',
    href: '#/assistant',
    cta: 'ابدأ محادثة',
  },
];

const STEPS = [
  { n: '١', title: 'أنشئ حسابك', text: 'حساب مستكشِف مجاني يحفظ تقدّمك وعيّناتك المفضّلة.' },
  { n: '٢', title: 'استكشف وتعلّم', text: 'تصفّح المكتبة، شغّل المجهر، ودوّر النماذج ثلاثية الأبعاد.' },
  { n: '٣', title: 'اجمع نقاط الخبرة', text: 'كل عيّنة تشاهدها وكل سؤال تجيبه يرفع مستواك ويفتح أوسمة جديدة.' },
];

export default function homeView({ outlet }){
  setCinemaDim(0);

  const counts = categoryCounts();
  const user = currentUser();
  const featured = SPECIMENS.filter((s) => ['tardigrade', 'bacteriophage', 'paramecium', 'red-blood-cell'].includes(s.id));

  outlet.innerHTML = render(html`
    <!-- ============ الهيرو ============ -->
    <section class="hero">
      <div class="hero__inner wrap">
        <div class="hero__copy">
          <span class="eyebrow"><span class="eyebrow__dot"></span> استكشف العالم غير المرئي</span>

          <h1 class="hero__title">
            <span>العِلم</span>
            <span>يَنبِض أمامك.</span>
          </h1>

          <p class="hero__lead">
            منصة علمية غامرة تجمع التحليل والعلوم المتقدمة داخل تجربة بصرية حديثة،
            واضحة، ومصممة لتجعل العالم المجهري قريباً من المستخدم.
          </p>

          <div class="hero__actions">
            <a class="btn btn--primary btn--lg" href="#/library">
              ابدأ الاستكشاف
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a class="btn btn--secondary btn--lg" href="#/microscope">شغّل المجهر الافتراضي</a>
          </div>

          <dl class="hero__stats">
            <div class="hero__stat">
              <dt>${formatNumber(counts.all)}</dt>
              <dd>عيّنة موثّقة</dd>
            </div>
            <div class="hero__stat">
              <dt>4</dt>
              <dd>أدوات تفاعلية</dd>
            </div>
            <div class="hero__stat">
              <dt>3D</dt>
              <dd>نماذج قابلة للتدوير</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="hero__scroll">
        <span class="hero__scroll-line" aria-hidden="true"></span>
        <span>مرّر للاكتشاف</span>
      </div>
    </section>

    <!-- ============ الأدوات ============ -->
    <section class="section" id="features">
      <div class="wrap">
        <header class="section__head" data-reveal="0">
          <h2 class="section__title">أربع أدوات <span>تفتح لك العالم المجهري</span></h2>
          <p class="section__lead">
            كل أداة مصمّمة لتجيب على سؤال مختلف: ما هذا الكائن؟ كيف يبدو عن قرب؟ كيف يتكوّن في الفراغ؟ ولماذا يهمّني؟
          </p>
        </header>

        <div class="grid grid--2">
          ${FEATURES.map((feature, i) => html`
            <article class="card card--hover feature" data-reveal="${i * 70}">
              <span class="feature__icon" aria-hidden="true">${feature.icon}</span>
              <h3 class="feature__title">${feature.title}</h3>
              <p class="feature__text">${feature.text}</p>
              <a class="feature__link" href="${feature.href}">
                ${feature.cta}
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </article>
          `)}
        </div>
      </div>
    </section>

    <!-- ============ عيّنات مختارة ============ -->
    <section class="section section--tight" id="featured">
      <div class="wrap">
        <header class="section__head row row--between" data-reveal="0" style="max-width:none;align-items:flex-end">
          <div style="max-width:620px">
            <h2 class="section__title">عيّنات <span>مختارة</span></h2>
            <p class="section__lead">لمحة سريعة من المكتبة — كل بطاقة تفتح ملفاً علمياً كاملاً.</p>
          </div>
          <a class="btn btn--secondary" href="#/library">كل العيّنات</a>
        </header>

        <div class="grid grid--4">
          ${featured.map((specimen, i) => html`
            <a class="card card--hover specimen-card" href="#/library/${specimen.id}" data-reveal="${i * 60}"
               style="--glow:${specimen.art.palette[0]}">
              <div class="specimen-card__art">${raw(specimenSVG(specimen.art, { size: 130 }))}</div>
              <h3 class="specimen-card__name">${specimen.name}</h3>
              <p class="specimen-card__latin latin">${specimen.latin}</p>
              <p class="specimen-card__size mono">${formatSize(specimen.sizeText)}</p>
            </a>
          `)}
        </div>
      </div>
    </section>

    <!-- ============ كيف تبدأ ============ -->
    <section class="section" id="how">
      <div class="wrap">
        <div class="how">
          <header class="section__head" data-reveal="0">
            <h2 class="section__title">ابدأ في <span>ثلاث خطوات</span></h2>
            <p class="section__lead">حسابك يحفظ تقدّمك وعيّناتك المفضّلة، ويمنحك نقاط خبرة وأوسمة كلما تعمّقت أكثر.</p>
          </header>

          <ol class="steps">
            ${STEPS.map((step, i) => html`
              <li class="steps__item" data-reveal="${i * 90}">
                <span class="steps__num" aria-hidden="true">${step.n}</span>
                <div>
                  <h3 class="steps__title">${step.title}</h3>
                  <p class="steps__text">${step.text}</p>
                </div>
              </li>
            `)}
          </ol>

          ${user ? html`
            <div class="how__cta" data-reveal="0">
              <a class="btn btn--primary btn--lg" href="#/account">تابع من حسابك</a>
            </div>
          ` : html`
            <div class="how__cta" data-reveal="0">
              <a class="btn btn--primary btn--lg" href="#/register">أنشئ حساب مستكشِف مجاناً</a>
              <a class="btn btn--ghost" href="#/login">لديك حساب؟ سجّل الدخول</a>
            </div>
          `}
        </div>
      </div>
    </section>

    <!-- ============ نداء أخير ============ -->
    <section class="section section--tight">
      <div class="wrap">
        <div class="cta-panel panel" data-reveal="0">
          <div class="cta-panel__text">
            <h2 class="section__title" style="margin-bottom:10px">ما لا تراه العين <span>ينتظرك</span></h2>
            <p class="section__lead">افتح المجهر الافتراضي الآن وابدأ رحلتك داخل قطرة ماء واحدة.</p>
          </div>
          <a class="btn btn--primary btn--lg" href="#/microscope">افتح المجهر</a>
        </div>
      </div>
    </section>
  `);

  observeReveal(outlet);
}
