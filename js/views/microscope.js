/* =========================================================
   ANAS — المجهر الافتراضي

   مبني على بصريات حقيقية لا على أرقام تقريبية:

   • برج العدسات يحمل العدسات الشيئية المعيارية الأربع
     بفتحاتها العددية (NA) الحقيقية.
   • حقل الرؤية = رقم حقل العينية ÷ قوة الشيئية
     (FN = 20 مم وهو المعياري) — فيعطي 5 مم عند 4× و 0.2 مم عند 100×.
   • حدّ التمييز يُحسب بمعادلة آبي:  d = 0.61 λ / NA
     عند λ = 550 نانومتر (ذروة حساسية العين).
   • ما هو أصغر من d لا يُحلّ بصرياً مهما زاد التكبير — ولهذا
     لا تُرى الفيروسات بالمجهر الضوئي، والمنصة تُظهر ذلك بدل
     أن تتجاهله.
   • «التكبير الفارغ»: التقريب الرقمي يكبّر الصورة ولا يضيف
     تفاصيل، فتزداد نعومتها — وهذا مُحاكى فعلياً هنا.
   • الصبغات تتبع تصنيف الكائن: موجب الجرام بنفسجي، سالبه
     وردي، والصامد للحمض لا يستجيب لجرام أصلاً.

   الحركة العشوائية محاكاة بصرية للحركة البراونية، لا نمذجة
   فيزيائية دقيقة.
   ========================================================= */

import { html, raw, render, $, $$, toast, clamp, delegate } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { specimenSVG } from '../art.js';
import { SPECIMENS, getSpecimen, categoryLabel, formatSize, GRAM_BEHAVIOUR } from '../data/specimens.js';
import { recordMicroscopeSession, isLoggedIn } from '../auth.js';

/* ---------------------------------------------------------
   البصريات
   --------------------------------------------------------- */

/** رقم حقل العينية المعياري (مليمتر) */
const FIELD_NUMBER = 20;

/** طول موجة الضوء المستخدم في حساب حدّ التمييز (نانومتر) */
const WAVELENGTH_NM = 550;

/** العدسات الشيئية المعيارية بفتحاتها العددية الحقيقية */
const OBJECTIVES = [
  { power: 4,   na: 0.10, label: '٤×',   note: 'مسح عام',          immersion: false },
  { power: 10,  na: 0.25, label: '١٠×',  note: 'عدسة منخفضة',      immersion: false },
  { power: 40,  na: 0.65, label: '٤٠×',  note: 'عدسة عالية جافة',  immersion: false },
  { power: 100, na: 1.25, label: '١٠٠×', note: 'غمر زيتي',         immersion: true  },
];

/** حقل الرؤية بالميكرومتر لعدسة شيئية معيّنة */
const fieldOfView = (power) => (FIELD_NUMBER / power) * 1000;

/** حدّ التمييز بمعادلة آبي، بالميكرومتر */
const resolutionLimit = (na) => (0.61 * WAVELENGTH_NM / na) / 1000;

/** التكبير الكلي = شيئية × عينية (10×) */
const totalMagnification = (power) => power * 10;

/* ---------------------------------------------------------
   الصبغات — تتبع تصنيف الكائن لا لوناً واحداً للجميع
   --------------------------------------------------------- */

/** يحيّد لون الرسم ثم يصبغه بلون ثابت مهما كان لونه الأصلي */
const tint = (hueDeg, saturate = 5, brightness = 1) =>
  `grayscale(1) sepia(1) saturate(${saturate}) hue-rotate(${hueDeg}deg) brightness(${brightness})`;

const STAINS = {
  none: {
    label: 'بدون صبغة',
    bg: '#eaf6ff',
    resolve: () => ({
      filter: 'contrast(1.05)',
      note: 'العيّنة غير مصبوغة — معظم الخلايا شبه شفافة تحت الضوء النافذ، والتباين ضعيف.',
    }),
  },

  gram: {
    label: 'صبغة جرام',
    bg: '#f4eeff',
    resolve: (specimen) => {
      if (specimen.gram === 'positive') return {
        filter: tint(232, 5, 0.9),
        note: 'موجبة الجرام: الجدار السميك احتجز البنفسجي البلوري، فبقيت الخلايا بنفسجية داكنة.',
        tone: 'violet',
      };
      if (specimen.gram === 'negative') return {
        filter: tint(300, 4.6, 1.02),
        note: 'سالبة الجرام: الجدار الرقيق فقَد البنفسجي عند الغسل بالكحول، فصبغها السفرانين المضاد بالوردي.',
        tone: 'pink',
      };
      if (specimen.gram === 'acid-fast') return {
        filter: 'grayscale(1) sepia(.4) brightness(1.1) contrast(.9)',
        note: 'صامدة للحمض: الجدار الشمعي يمنع دخول صبغة جرام أصلاً، فتظهر باهتة. الصبغة الصحيحة لها هي زيل-نيلسن.',
        tone: 'none',
        warn: true,
      };
      return {
        filter: 'contrast(1.05)',
        note: 'صبغة جرام تخصّ البكتيريا. هذه العيّنة ليست بكتيريا، فلا معنى لتطبيقها عليها.',
        tone: 'none',
        warn: true,
      };
    },
  },

  ziehl: {
    label: 'زيل-نيلسن (صمود الحمض)',
    bg: '#e7f0ff',
    resolve: (specimen) => (specimen.gram === 'acid-fast'
      ? {
        filter: tint(345, 6, 1),
        note: 'إيجابية لصمود الحمض: احتفظت بالفوكسين الأحمر رغم الغسل بالحمض والكحول — العلامة المميّزة للمتفطّرات.',
        tone: 'red',
      }
      : {
        filter: tint(178, 4, .92),
        note: 'سلبية لصمود الحمض: فقدت الفوكسين وصبغها الأزرق المضاد. هذا هو السلوك الطبيعي لغير المتفطّرات.',
        tone: 'blue',
      }),
  },

  methylene: {
    label: 'أزرق الميثيلين',
    bg: '#e8f1ff',
    resolve: () => ({
      filter: tint(178, 4.5, .95),
      note: 'صبغة بسيطة تبرز النواة والمادة النووية بلون أزرق موحّد. لا تفرّق بين أنواع الجدران.',
      tone: 'blue',
    }),
  },

  eosin: {
    label: 'هيماتوكسيلين وإيوسين (H&E)',
    bg: '#fff0f4',
    resolve: () => ({
      filter: tint(298, 4.4, 1.02),
      note: 'الصبغة النسيجية الأشهر: الإيوسين يصبغ السيتوبلازم والبروتينات بالوردي، والهيماتوكسيلين يصبغ النوى بالأزرق البنفسجي.',
      tone: 'pink',
    }),
  },

  darkfield: {
    label: 'الحقل المظلم',
    bg: '#03080f',
    resolve: () => ({
      filter: 'brightness(1.8) saturate(1.45) contrast(1.15)',
      note: 'لا يدخل الضوء المباشر العدسة — يُرى فقط ما تشتّته العيّنة، فتبدو مضيئة على سواد. مثالي للكائنات الحيّة غير المصبوغة.',
      tone: 'bright',
    }),
  },
};

/** أطوال مسطرة القياس المقبولة (ميكرومتر) */
const BAR_STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/* =========================================================
   الصفحة
   ========================================================= */
export default function microscopeView({ outlet, query }){
  setCinemaDim(1);

  const startSpecimen = getSpecimen(query.get('specimen')) ?? getSpecimen('paramecium') ?? SPECIMENS[0];
  const startStain = STAINS[query.get('stain')] ? query.get('stain') : 'none';

  const state = {
    specimen: startSpecimen,
    objective: pickObjective(startSpecimen.sizeUm),
    digital: 1,       // التقريب الرقمي ١×–٨×
    focus: 0,         // −١٠٠ إلى ١٠٠، الصفر = تبئير مثالي
    light: 100,       // ٤٠ إلى ١٦٠
    stain: startStain,
    labels: false,
    panX: 0,
    panY: 0,
    counted: false,
  };

  /** يختار العدسة التي تعرض الكائن بحجم مناسب */
  function pickObjective(sizeUm){
    // نستهدف أن يشغل الكائن نحو ربع حقل الرؤية
    const ideal = OBJECTIVES.filter((o) => sizeUm / fieldOfView(o.power) < 0.45);
    return ideal.length ? ideal[ideal.length - 1] : OBJECTIVES[0];
  }

  outlet.innerHTML = render(html`
    <section class="section scope">
      <div class="wrap">
        <header class="section__head" style="max-width:780px">
          <span class="eyebrow"><span class="eyebrow__dot"></span> المجهر الافتراضي</span>
          <h1 class="section__title" style="margin-top:18px">بصريات حقيقية <span>لا رسوم متحركة</span></h1>
          <p class="section__lead">
            العدسات بفتحاتها العددية المعيارية، وحقل الرؤية محسوب من رقم حقل العينية،
            وحدّ التمييز من معادلة آبي. ما لا يستطيع المجهر الضوئي حلّه لن تراه هنا أيضاً.
          </p>
        </header>

        <div class="scope__layout">

          <!-- ============ حقل الرؤية ============ -->
          <div class="scope__stage-wrap">
            <div class="scope__stage" id="stage">
              <canvas id="scopeCanvas" aria-label="حقل رؤية المجهر"></canvas>
              <div class="scope__labels" id="labels" aria-hidden="true"></div>
              <div class="scope__ring" aria-hidden="true"></div>
              <div class="scope__reticle" aria-hidden="true"></div>

              <div class="scope__hud">
                <span class="scope__hud-item mono" id="hudMag"></span>
                <span class="scope__hud-item mono" id="hudNA"></span>
                <span class="scope__hud-item" id="hudName">${startSpecimen.name}</span>
              </div>

              <div class="scope__scalebar" aria-hidden="true">
                <span class="scope__scalebar-line" id="barLine"></span>
                <span class="scope__scalebar-text mono" id="barText"></span>
              </div>

              <p class="scope__alert" id="scopeAlert" hidden></p>
            </div>

            <p class="scope__hint">اسحب لتحريك الشريحة · عجلة الفأرة للتقريب الرقمي</p>

            <!-- شريط القراءات البصرية -->
            <div class="optics" id="opticsBar"></div>
          </div>

          <!-- ============ لوحة التحكم ============ -->
          <aside class="scope__controls panel">

            <div class="scope__control">
              <label class="field__label" for="specimenSelect">العيّنة على الشريحة</label>
              <select class="select" id="specimenSelect">
                ${SPECIMENS.map((specimen) => html`
                  <option value="${specimen.id}" ${raw(specimen.id === startSpecimen.id ? 'selected' : '')}>
                    ${specimen.name} — ${categoryLabel(specimen.category)}
                  </option>
                `)}
              </select>
              <p class="field__hint" id="specimenHint">${formatSize(startSpecimen.sizeText)}</p>
            </div>

            <div class="scope__control">
              <span class="field__label">برج العدسات الشيئية</span>
              <div class="turret" role="group" aria-label="العدسة الشيئية">
                ${OBJECTIVES.map((objective) => html`
                  <button class="turret__lens" type="button" data-power="${objective.power}"
                          title="${objective.note} — الفتحة العددية ${objective.na}">
                    <span class="turret__power">${objective.label}</span>
                    <span class="turret__na mono">NA ${objective.na}</span>
                  </button>
                `)}
              </div>
              <p class="field__hint" id="objectiveHint"></p>
            </div>

            <div class="scope__control">
              <label class="field__label" for="digitalRange">
                التقريب الرقمي <span class="mono" id="digitalValue">١٫٠×</span>
              </label>
              <input class="range" id="digitalRange" type="range" min="10" max="80" step="1" value="10" />
              <p class="field__hint" id="digitalHint">يكبّر الصورة الملتقطة ولا يضيف تفاصيل جديدة.</p>
            </div>

            <div class="scope__control">
              <label class="field__label" for="focusRange">مقبض التبئير الدقيق</label>
              <input class="range" id="focusRange" type="range" min="-100" max="100" step="1" value="0" />
              <p class="field__hint" id="focusHint">التبئير مضبوط</p>
            </div>

            <div class="scope__control">
              <label class="field__label" for="lightRange">شدّة الإضاءة</label>
              <input class="range" id="lightRange" type="range" min="40" max="160" step="1" value="100" />
              <p class="field__hint mono" id="lightHint">١٠٠٪</p>
            </div>

            <div class="scope__control">
              <label class="field__label" for="stainSelect">الصبغة</label>
              <select class="select" id="stainSelect">
                ${Object.entries(STAINS).map(([key, stain]) => html`
                  <option value="${key}" ${raw(key === startStain ? 'selected' : '')}>${stain.label}</option>
                `)}
              </select>
              <p class="field__hint" id="stainHint"></p>
            </div>

            <label class="checkbox">
              <input type="checkbox" id="labelsToggle" />
              <span>إظهار أسماء الأجزاء على العيّنة</span>
            </label>

            <div class="scope__actions">
              <button class="btn btn--secondary btn--sm" type="button" id="resetBtn">إعادة الضبط</button>
              <button class="btn btn--primary btn--sm" type="button" id="captureBtn">التقط صورة</button>
            </div>

            <a class="scope__link" id="fileLink" href="#/library/${startSpecimen.id}">
              افتح الملف العلمي لهذه العيّنة ←
            </a>
          </aside>
        </div>
      </div>
    </section>
  `);

  /* =======================================================
     اللوحة والرسم
     ======================================================= */
  const canvas = $('#scopeCanvas', outlet);
  const ctx = canvas.getContext('2d');
  const stage = $('#stage', outlet);
  const labelLayer = $('#labels', outlet);

  let width = 0, height = 0, dpr = 1;
  let sprite = null;
  let population = [];
  let raf = null;
  let destroyed = false;

  function loadSprite(specimen){
    return new Promise((resolve) => {
      const svg = specimenSVG(specimen.art, { size: 400, animate: false });
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /* ---------- القياسات البصرية الحالية ---------- */

  function optics(){
    const { power, na } = state.objective;
    const opticalFov = fieldOfView(power);           // ميكرومتر
    const fovUm = opticalFov / state.digital;        // بعد التقريب الرقمي
    const limitUm = resolutionLimit(na);             // حدّ التمييز
    const pxPerUm = width / fovUm;

    // التكبير المفيد الأقصى ≈ 1000 × الفتحة العددية (قاعدة معيارية)
    const usefulMax = 1000 * na;
    const effective = totalMagnification(power) * state.digital;

    return {
      power, na, opticalFov, fovUm, limitUm, pxPerUm,
      total: totalMagnification(power),
      effective,
      usefulMax,
      empty: effective > usefulMax * 1.05,
      resolved: state.specimen.sizeUm >= limitUm,
    };
  }

  /* ---------- توزيع الكائنات ---------- */

  function spawnOrganism(){
    return {
      x: (Math.random() - .5) * 3,
      y: (Math.random() - .5) * 3,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * .0035,
      driftX: (Math.random() - .5) * .00045,
      driftY: (Math.random() - .5) * .00045,
      scale: .8 + Math.random() * .42,
      depth: Math.random(),
      phase: Math.random() * Math.PI * 2,
      opacity: .74 + Math.random() * .26,
    };
  }

  /** الكثافة تتبع نسبة حجم الكائن إلى حقل الرؤية */
  function targetCount(){
    const o = optics();
    const widthFraction = (state.specimen.sizeUm / o.fovUm) / .7;
    const areaFraction = Math.max(1e-4, (Math.PI / 4) * widthFraction ** 2);
    return clamp(Math.round((.45 / areaFraction) * 9), 12, 170);
  }

  function syncPopulation(){
    const target = targetCount();
    while (population.length < target) population.push(spawnOrganism());
    if (population.length > target) population.length = target;
  }

  function resize(){
    const rect = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- المسطرة ---------- */

  function updateScaleBar(){
    const { pxPerUm } = optics();
    const maxBarPx = width * .3;

    let chosen = BAR_STEPS[0];
    for (const step of BAR_STEPS){
      if (step * pxPerUm <= maxBarPx) chosen = step;
    }

    $('#barLine', outlet).style.width = Math.round(chosen * pxPerUm) + 'px';
    $('#barText', outlet).textContent = chosen >= 1000
      ? `${chosen / 1000} مم`
      : `${chosen} ميكرومتر`;
  }

  /* ---------- المرشّحات ---------- */

  function applyFilters(){
    const stain = STAINS[state.stain];
    const result = stain.resolve(state.specimen);
    const o = optics();

    // ضبابية التبئير اليدوي
    const focusBlur = (Math.abs(state.focus) / 100) * 7;

    // نعومة فيزيائية: حدّ التمييز محوّلاً إلى بكسلات.
    // مع التقريب الرقمي تكبر هذه النعومة ولا تتحسّن — «التكبير الفارغ».
    const opticalBlur = Math.min(9, o.limitUm * o.pxPerUm * .5);

    const blur = Math.hypot(focusBlur, opticalBlur);

    canvas.style.filter = [
      blur > .05 ? `blur(${blur.toFixed(2)}px)` : '',
      `brightness(${(state.light / 100).toFixed(2)})`,
      result.filter,
    ].filter(Boolean).join(' ');

    stage.style.setProperty('--field-bg', stain.bg);
    stage.classList.toggle('is-darkfield', state.stain === 'darkfield');

    $('#stainHint', outlet).textContent = result.note;
    $('#stainHint', outlet).classList.toggle('is-warn', Boolean(result.warn));

    updateAlert(o);
    paintOptics(o);
  }

  /** رسالة الحالة داخل الحقل */
  function updateAlert(o){
    const alert = $('#scopeAlert', outlet);
    let message = null;
    let kind = 'warn';

    if (!o.resolved){
      message = `هذا الكائن (${state.specimen.sizeUm} ميكرومتر) أصغر من حدّ تمييز هذه العدسة `
              + `(${o.limitUm.toFixed(2)} ميكرومتر). لا يمكن للمجهر الضوئي حلّه مهما زاد التكبير — يلزم مجهر إلكتروني.`;
      kind = 'danger';
    } else if (Math.abs(state.focus) >= 62){
      message = 'الصورة خارج التبئير — اضبط المقبض الدقيق.';
    } else if (o.empty){
      message = `تكبير فارغ: تجاوزت ${Math.round(o.usefulMax)}× وهو أقصى تكبير مفيد لهذه الفتحة العددية. `
              + 'الصورة تكبر والتفاصيل لا تزيد.';
    }

    alert.hidden = !message;
    alert.textContent = message ?? '';
    alert.className = 'scope__alert scope__alert--' + kind;
  }

  /** شريط القراءات البصرية أسفل الحقل */
  function paintOptics(o){
    $('#opticsBar', outlet).innerHTML = render(html`
      <div class="optics__cell">
        <span class="optics__label">التكبير الكلي</span>
        <strong class="optics__value mono">${o.total}×</strong>
        <span class="optics__sub">شيئية ${o.power}× × عينية ١٠×</span>
      </div>
      <div class="optics__cell">
        <span class="optics__label">الفتحة العددية</span>
        <strong class="optics__value mono">${o.na}</strong>
        <span class="optics__sub">${state.objective.immersion ? 'غمر زيتي' : 'جافة'}</span>
      </div>
      <div class="optics__cell">
        <span class="optics__label">حدّ التمييز</span>
        <strong class="optics__value mono">${o.limitUm.toFixed(2)} ميكرومتر</strong>
        <span class="optics__sub">d = 0.61 λ / NA</span>
      </div>
      <div class="optics__cell">
        <span class="optics__label">حقل الرؤية</span>
        <strong class="optics__value mono">${Math.round(o.fovUm)} ميكرومتر</strong>
        <span class="optics__sub">${state.digital > 1 ? `بعد تقريب رقمي ${state.digital.toFixed(1)}×` : 'بصري خالص'}</span>
      </div>
      <div class="optics__cell ${raw(o.empty ? 'is-warn' : '')}">
        <span class="optics__label">التكبير المفيد الأقصى</span>
        <strong class="optics__value mono">${Math.round(o.usefulMax)}×</strong>
        <span class="optics__sub">≈ 1000 × NA</span>
      </div>
    `);
  }

  /* ---------- أسماء الأجزاء فوق العيّنة ---------- */

  function paintLabels(){
    if (!state.labels || !state.specimen.anatomy.length){
      labelLayer.innerHTML = '';
      return;
    }

    const o = optics();
    const drawSize = clamp((state.specimen.sizeUm * o.pxPerUm) / .7, 4, width * 1.5);

    // نعلّم الكائن الأقرب إلى المركز فقط، وإلا ازدحم الحقل
    labelLayer.innerHTML = render(html`
      <div class="scope__label-anchor" style="width:${drawSize}px;height:${drawSize}px">
        ${state.specimen.anatomy.map((part, i) => html`
          <span class="scope__label" style="left:${part.x / 2}%; top:${part.y / 2}%">
            <span class="scope__label-dot">${i + 1}</span>
            <span class="scope__label-text">${part.label}</span>
          </span>
        `)}
      </div>
    `);
  }

  /* ---------- حلقة الرسم ---------- */

  function draw(){
    if (destroyed) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden || !sprite) return;

    const o = optics();
    const drawSize = clamp((state.specimen.sizeUm * o.pxPerUm) / .7, 4, width * 1.5);

    ctx.clearRect(0, 0, width, height);

    for (const organism of population){
      organism.x += organism.driftX + Math.sin(organism.phase) * .00012;
      organism.y += organism.driftY + Math.cos(organism.phase * .8) * .00012;
      organism.phase += .01;
      organism.rotation += organism.spin;

      if (organism.x >  1.5) organism.x = -1.5;
      if (organism.x < -1.5) organism.x =  1.5;
      if (organism.y >  1.5) organism.y = -1.5;
      if (organism.y < -1.5) organism.y =  1.5;

      const screenX = width  / 2 + (organism.x * width  + state.panX);
      const screenY = height / 2 + (organism.y * height + state.panY);
      const size = drawSize * organism.scale;

      if (screenX + size < 0 || screenX - size > width)  continue;
      if (screenY + size < 0 || screenY - size > height) continue;

      // عمق الميدان يضيق كلما ارتفعت الفتحة العددية — سلوك حقيقي
      const depthPenalty = Math.abs(organism.depth - .5) * 2 * Math.min(1, o.na / 1.25);
      let alpha = organism.opacity * (1 - depthPenalty * .55);

      // ما دون حدّ التمييز يظهر كأثر باهت لا كشكل واضح
      if (!o.resolved) alpha *= .3;

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(organism.rotation);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  /* =======================================================
     التحكم
     ======================================================= */

  function setObjective(power){
    const objective = OBJECTIVES.find((o) => o.power === power);
    if (!objective) return;
    state.objective = objective;

    $$('[data-power]', outlet).forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.power) === power);
    });

    const o = optics();
    $('#hudMag', outlet).textContent = `${o.total}×`;
    $('#hudNA', outlet).textContent = `NA ${o.na}`;
    $('#objectiveHint', outlet).textContent =
      `${objective.note}${objective.immersion ? ' — تحتاج قطرة زيت أرز بين العدسة والشريحة' : ''}`;

    syncPopulation();
    updateScaleBar();
    applyFilters();
    paintLabels();
    countSession();
  }

  function setDigital(value){
    state.digital = clamp(value, 1, 8);
    $('#digitalRange', outlet).value = Math.round(state.digital * 10);
    $('#digitalValue', outlet).textContent = state.digital.toFixed(1).replace('.', '٫') + '×';
    syncPopulation();
    updateScaleBar();
    applyFilters();
    paintLabels();
  }

  function countSession(){
    if (state.counted || !isLoggedIn()) return;
    state.counted = true;
    recordMicroscopeSession();
    toast('جلسة مجهر مسجّلة (+٢٠ نقطة)', 'ok');
  }

  async function setSpecimen(id){
    const specimen = getSpecimen(id);
    if (!specimen) return;

    state.specimen = specimen;
    sprite = await loadSprite(specimen);
    population = [];

    $('#hudName', outlet).textContent = specimen.name;
    $('#specimenHint', outlet).textContent = formatSize(specimen.sizeText);
    $('#fileLink', outlet).setAttribute('href', `#/library/${specimen.id}`);

    setObjective(pickObjective(specimen.sizeUm).power);
  }

  $('#specimenSelect', outlet).addEventListener('change', (event) => setSpecimen(event.target.value));

  delegate(outlet, 'click', '[data-power]', (_event, button) => setObjective(Number(button.dataset.power)));

  $('#digitalRange', outlet).addEventListener('input', (event) => setDigital(Number(event.target.value) / 10));

  $('#focusRange', outlet).addEventListener('input', (event) => {
    state.focus = Number(event.target.value);
    const abs = Math.abs(state.focus);
    $('#focusHint', outlet).textContent =
      abs < 8  ? 'التبئير مضبوط ✓'
    : abs < 40 ? 'تبئير تقريبي'
    : abs < 70 ? 'الصورة مشوّشة'
    :            'خارج التبئير تماماً';
    applyFilters();
  });

  $('#lightRange', outlet).addEventListener('input', (event) => {
    state.light = Number(event.target.value);
    $('#lightHint', outlet).textContent = `${state.light}٪`;
    applyFilters();
  });

  $('#stainSelect', outlet).addEventListener('change', (event) => {
    state.stain = event.target.value;
    applyFilters();
  });

  $('#labelsToggle', outlet).addEventListener('change', (event) => {
    state.labels = event.target.checked;
    stage.classList.toggle('has-labels', state.labels);
    paintLabels();
  });

  $('#resetBtn', outlet).addEventListener('click', () => {
    state.focus = 0; state.light = 100; state.stain = 'none';
    state.panX = 0; state.panY = 0; state.labels = false;
    $('#focusRange', outlet).value = 0;
    $('#lightRange', outlet).value = 100;
    $('#stainSelect', outlet).value = 'none';
    $('#labelsToggle', outlet).checked = false;
    $('#focusHint', outlet).textContent = 'التبئير مضبوط';
    $('#lightHint', outlet).textContent = '١٠٠٪';
    stage.classList.remove('has-labels');
    setDigital(1);
    setObjective(pickObjective(state.specimen.sizeUm).power);
    toast('أُعيد ضبط المجهر', 'info');
  });

  /* --- التقاط صورة --- */
  $('#captureBtn', outlet).addEventListener('click', () => {
    const shot = document.createElement('canvas');
    shot.width = canvas.width;
    shot.height = canvas.height;
    const shotCtx = shot.getContext('2d');

    shotCtx.fillStyle = STAINS[state.stain].bg;
    shotCtx.fillRect(0, 0, shot.width, shot.height);
    shotCtx.filter = canvas.style.filter || 'none';
    shotCtx.drawImage(canvas, 0, 0);

    shot.toBlob((blob) => {
      if (!blob){
        toast('تعذّر التقاط الصورة في هذا المتصفح', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anas-${state.specimen.id}-${optics().total}x.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('تم حفظ صورة الحقل 📸', 'ok');
    }, 'image/png');
  });

  /* --- السحب --- */
  let dragging = false, lastX = 0, lastY = 0;

  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX; lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    state.panX += event.clientX - lastX;
    state.panY += event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    if (event.pointerId != null && stage.hasPointerCapture?.(event.pointerId)){
      stage.releasePointerCapture(event.pointerId);
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    setDigital(state.digital * (event.deltaY > 0 ? .9 : 1.1));
  }, { passive: false });

  /* --- لوحة المفاتيح --- */
  const onKey = (event) => {
    if (event.target.matches('input, select, textarea')) return;
    const step = 26;
    if (event.key === 'ArrowRight'){ state.panX -= step; }
    else if (event.key === 'ArrowLeft'){ state.panX += step; }
    else if (event.key === 'ArrowUp'){ state.panY += step; }
    else if (event.key === 'ArrowDown'){ state.panY -= step; }
    else if (event.key === '+' || event.key === '='){ setDigital(state.digital * 1.15); }
    else if (event.key === '-'){ setDigital(state.digital * .87); }
    else return;
    event.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  const observer = new ResizeObserver(() => {
    resize(); updateScaleBar(); applyFilters(); paintLabels();
  });
  observer.observe(stage);

  /* ---------- الإقلاع ---------- */
  resize();
  loadSprite(state.specimen).then((image) => {
    sprite = image;
    if (!image) toast('تعذّر تحميل رسم العيّنة', 'error');
  });
  setObjective(state.objective.power);
  setDigital(1);
  draw();

  return () => {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener('keydown', onKey);
  };
}
