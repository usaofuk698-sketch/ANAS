/* =========================================================
   ANAS — المجهر الافتراضي

   محاكاة مجهر ضوئي داخل المتصفح:
   • التكبير يتحكّم في حقل الرؤية بقيم واقعية
     (مجهر حقيقي عند ٤٠× يرى نحو ٥٠٠ ميكرومتر عرضاً)
   • التبئير يحاكي عمق الميدان الضيّق عند التكبير العالي
   • الأصباغ تحاكي صبغات مخبرية شائعة
   • مسطرة القياس تُحسب من التكبير الفعلي فتبقى صادقة دائماً

   الحركة العشوائية للعيّنات محاكاة للحركة البراونية —
   وهي تقريب بصري وليست نمذجة فيزيائية دقيقة.
   ========================================================= */

import { html, raw, render, $, $$, toast, clamp, delegate } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { specimenSVG } from '../art.js';
import { SPECIMENS, getSpecimen, categoryLabel, formatSize } from '../data/specimens.js';
import { recordMicroscopeSession, isLoggedIn } from '../auth.js';

/** عرض حقل الرؤية بالميكرومتر عند تكبير معيّن */
const fovForMagnification = (mag) => 20000 / mag;

const PRESETS = [
  { mag: 20,   label: '٢٠×',   note: 'مسح واسع' },
  { mag: 40,   label: '٤٠×',   note: 'مسح عام' },
  { mag: 100,  label: '١٠٠×',  note: 'عدسة منخفضة' },
  { mag: 400,  label: '٤٠٠×',  note: 'عدسة عالية' },
  { mag: 1000, label: '١٠٠٠×', note: 'غمر زيتي' },
];

const STAINS = {
  none:      { label: 'بدون صبغة',     filter: '',                                                     bg: '#eaf6ff' },
  // نحيّد لون الرسم (grayscale) ثم نصبغه بلون ثابت، وإلا اختلفت
  // نتيجة hue-rotate من عيّنة لأخرى حسب لونها الأصلي
  gram:      { label: 'صبغة جرام',     filter: 'grayscale(1) sepia(1) saturate(5) hue-rotate(232deg) brightness(.92)', bg: '#f3ecff' },
  eosin:     { label: 'إيوسين',         filter: 'grayscale(1) sepia(1) saturate(5) hue-rotate(298deg) brightness(1.02)', bg: '#fff0f4' },
  methylene: { label: 'أزرق الميثيلين', filter: 'grayscale(1) sepia(1) saturate(6) hue-rotate(178deg) brightness(.95)', bg: '#e8f1ff' },
  darkfield: { label: 'الحقل المظلم',   filter: 'brightness(1.75) saturate(1.5) contrast(1.15)',        bg: '#03080f' },
};

/**
 * التكبير المناسب لعرض عيّنة بحجم معيّن بوضوح.
 * نستهدف أن يشغل الكائن نحو ثلث حقل الرؤية.
 */
function recommendedMagnification(sizeUm){
  const ideal = 4600 / sizeUm;
  return clamp(Math.round(ideal / 10) * 10, 20, 1000);
}

/** أطوال مسطرة القياس المقبولة (ميكرومتر) */
const BAR_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

export default function microscopeView({ outlet, query }){
  setCinemaDim(1);

  const initialId = query.get('specimen');
  const startSpecimen = getSpecimen(initialId) ?? getSpecimen('paramecium') ?? SPECIMENS[0];

  const state = {
    specimen: startSpecimen,
    mag: recommendedMagnification(startSpecimen.sizeUm),
    focus: 0,        // −١٠٠ إلى ١٠٠، الصفر = تبئير مثالي
    light: 100,      // ٤٠ إلى ١٦٠
    stain: 'none',
    panX: 0,
    panY: 0,
    counted: false,  // هل احتُسبت الجلسة؟
  };

  outlet.innerHTML = render(html`
    <section class="section scope">
      <div class="wrap">
        <header class="section__head" style="max-width:760px">
          <span class="eyebrow"><span class="eyebrow__dot"></span> المجهر الافتراضي</span>
          <h1 class="section__title" style="margin-top:18px">اضبط العدسة <span>وادخل العيّنة</span></h1>
          <p class="section__lead">
            غيّر التكبير والتبئير والإضاءة تماماً كما تفعل في المختبر. مسطرة القياس أسفل الحقل تتغيّر مع التكبير
            لتخبرك بالحجم الحقيقي لما تراه.
          </p>
        </header>

        <div class="scope__layout">

          <!-- ============ حقل الرؤية ============ -->
          <div class="scope__stage-wrap">
            <div class="scope__stage" id="stage">
              <canvas id="scopeCanvas" aria-label="حقل رؤية المجهر"></canvas>
              <div class="scope__ring" aria-hidden="true"></div>
              <div class="scope__reticle" aria-hidden="true"></div>

              <div class="scope__hud">
                <span class="scope__hud-item mono" id="hudMag"></span>
                <span class="scope__hud-item" id="hudName">${startSpecimen.name}</span>
              </div>

              <div class="scope__scalebar" aria-hidden="true">
                <span class="scope__scalebar-line" id="barLine"></span>
                <span class="scope__scalebar-text mono" id="barText"></span>
              </div>

              <p class="scope__focus-warn" id="focusWarn" hidden>الصورة خارج التبئير — اضبط مقبض التبئير</p>
            </div>

            <p class="scope__hint">
              اسحب داخل الحقل لتحريك الشريحة · استخدم عجلة الفأرة للتكبير
            </p>
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
              <span class="field__label">قوة التكبير</span>
              <div class="scope__presets" role="group" aria-label="تكبيرات جاهزة">
                ${PRESETS.map((preset) => html`
                  <button class="chip" type="button" data-mag="${preset.mag}" title="${preset.note}">${preset.label}</button>
                `)}
              </div>
              <input class="range" id="magRange" type="range" min="20" max="1000" step="10" value="${state.mag}"
                     aria-label="قوة التكبير" />
              <p class="field__hint mono" id="magHint"></p>
            </div>

            <div class="scope__control">
              <label class="field__label" for="focusRange">مقبض التبئير</label>
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
                  <option value="${key}">${stain.label}</option>
                `)}
              </select>
            </div>

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
     إعداد اللوحة والرسم
     ======================================================= */
  const canvas = $('#scopeCanvas', outlet);
  const ctx = canvas.getContext('2d');
  const stage = $('#stage', outlet);

  let width = 0, height = 0, dpr = 1;
  let sprite = null;          // صورة العيّنة المرسومة
  let population = [];        // الكائنات داخل الشريحة
  let raf = null;
  let destroyed = false;

  /** يبني صورة العيّنة من الـ SVG الإجرائي */
  function loadSprite(specimen){
    return new Promise((resolve) => {
      const svg = specimenSVG(specimen.art, { size: 400, animate: false });
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /** يبني كائناً واحداً في موضع عشوائي داخل العالم */
  function spawnOrganism(){
    return {
      // إحداثيات نسبية من −1.5 إلى 1.5 (بوحدات حقل الرؤية)
      x: (Math.random() - .5) * 3,
      y: (Math.random() - .5) * 3,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * .0035,
      driftX: (Math.random() - .5) * .00045,
      driftY: (Math.random() - .5) * .00045,
      scale: .78 + Math.random() * .48,
      depth: Math.random(),          // يحدّد مدى ضبابيته عند اختلال التبئير
      phase: Math.random() * Math.PI * 2,
      opacity: .72 + Math.random() * .28,
    };
  }

  /**
     عدد الكائنات المطلوب لتبدو الشريحة مأهولة عند التكبير الحالي.

     الكائن الكبير يشغل مساحة أكبر من الحقل فيكفي عدد قليل منه،
     والكائن الصغير يحتاج عدداً كبيراً وإلا بدا الحقل فارغاً —
     ولهذا لا يصلح عدد ثابت. نستهدف تغطية ~٤٥٪ من مساحة الحقل.
     نضرب ×٩ لأن «العالم» يساوي ثلاثة أضعاف الحقل في كل بُعد.
   */
  function targetCount(){
    const fovUm = fovForMagnification(state.mag);
    const widthFraction = (state.specimen.sizeUm / fovUm) / .7;
    const areaFraction = Math.max(1e-4, (Math.PI / 4) * widthFraction ** 2);
    const visible = .45 / areaFraction;
    return clamp(Math.round(visible * 9), 12, 160);
  }

  /**
     يوائم عدد الكائنات مع التكبير الحالي دون إعادة توزيعها،
     فلا «تقفز» العيّنات أمام المستخدم أثناء تحريك مقبض التكبير.
   */
  function syncPopulation(){
    const target = targetCount();
    while (population.length < target) population.push(spawnOrganism());
    if (population.length > target) population.length = target;
  }

  function seedPopulation(){
    population = [];
    syncPopulation();
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

  /** يحسب مسطرة القياس المناسبة للتكبير الحالي */
  function updateScaleBar(){
    const fovUm = fovForMagnification(state.mag);
    const pxPerUm = width / fovUm;
    const maxBarPx = width * .3;

    let chosen = BAR_STEPS[0];
    for (const step of BAR_STEPS){
      if (step * pxPerUm <= maxBarPx) chosen = step;
    }

    const barPx = Math.round(chosen * pxPerUm);
    $('#barLine', outlet).style.width = barPx + 'px';
    $('#barText', outlet).textContent = chosen >= 1000
      ? `${chosen / 1000} مم`
      : `${chosen} ميكرومتر`;
  }

  /** يطبّق الصبغة والإضاءة والضبابية كمرشّح CSS على اللوحة */
  function applyFilters(){
    const stain = STAINS[state.stain];
    const blurPx = (Math.abs(state.focus) / 100) * 7;
    const brightness = state.light / 100;

    canvas.style.filter = [
      blurPx > .05 ? `blur(${blurPx.toFixed(2)}px)` : '',
      `brightness(${brightness.toFixed(2)})`,
      stain.filter,
    ].filter(Boolean).join(' ');

    stage.style.setProperty('--field-bg', stain.bg);
    stage.classList.toggle('is-darkfield', state.stain === 'darkfield');

    $('#focusWarn', outlet).hidden = Math.abs(state.focus) < 62;
  }

  function draw(){
    if (destroyed) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden || !sprite) return;

    const fovUm = fovForMagnification(state.mag);
    const pxPerUm = width / fovUm;

    // الحجم المعروض: قياس الكائن الحقيقي، معدّلاً لأن الرسم يشغل ~٧٠٪ من مربّعه
    const drawSize = clamp((state.specimen.sizeUm * pxPerUm) / .7, 4, width * 1.5);

    ctx.clearRect(0, 0, width, height);

    for (const organism of population){
      // حركة براونية بطيئة
      organism.x += organism.driftX + Math.sin(organism.phase) * .00012;
      organism.y += organism.driftY + Math.cos(organism.phase * .8) * .00012;
      organism.phase += .01;
      organism.rotation += organism.spin;

      // الالتفاف داخل حدود العالم
      if (organism.x >  1.5) organism.x = -1.5;
      if (organism.x < -1.5) organism.x =  1.5;
      if (organism.y >  1.5) organism.y = -1.5;
      if (organism.y < -1.5) organism.y =  1.5;

      const screenX = width  / 2 + (organism.x * width  + state.panX);
      const screenY = height / 2 + (organism.y * height + state.panY);
      const size = drawSize * organism.scale;

      // تجاهل ما هو خارج الشاشة تماماً
      if (screenX + size < 0 || screenX - size > width)  continue;
      if (screenY + size < 0 || screenY - size > height) continue;

      // عمق الميدان: كلما زاد التكبير قلّ عدد ما يظهر واضحاً
      const depthPenalty = Math.abs(organism.depth - .5) * 2 * (state.mag / 1000);
      ctx.globalAlpha = organism.opacity * (1 - depthPenalty * .55);

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(organism.rotation);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  /* =======================================================
     ربط عناصر التحكم
     ======================================================= */

  function setMagnification(value){
    state.mag = clamp(Math.round(value), 20, 1000);
    $('#magRange', outlet).value = state.mag;
    $('#hudMag', outlet).textContent = `${state.mag}×`;
    $('#magHint', outlet).textContent =
      `حقل الرؤية ≈ ${Math.round(fovForMagnification(state.mag))} ميكرومتر`;
    $$('[data-mag]', outlet).forEach((chip) => {
      chip.classList.toggle('is-active', Number(chip.dataset.mag) === state.mag);
    });
    updateScaleBar();
    syncPopulation();
    countSession();
  }

  /** تُحتسب جلسة واحدة عند أول تفاعل حقيقي */
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
    seedPopulation();
    $('#hudName', outlet).textContent = specimen.name;
    $('#specimenHint', outlet).textContent = formatSize(specimen.sizeText);
    $('#fileLink', outlet).setAttribute('href', `#/library/${specimen.id}`);
    // نضبط التكبير تلقائياً ليظهر الكائن بحجم مناسب بدل أن
    // يملأ الحقل كلّه (أو يختفي) عند تبديل عيّنة مختلفة الحجم
    setMagnification(recommendedMagnification(specimen.sizeUm));
    countSession();
  }

  $('#specimenSelect', outlet).addEventListener('change', (event) => setSpecimen(event.target.value));

  delegate(outlet, 'click', '[data-mag]', (_event, chip) => setMagnification(Number(chip.dataset.mag)));

  $('#magRange', outlet).addEventListener('input', (event) => setMagnification(Number(event.target.value)));

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

  $('#resetBtn', outlet).addEventListener('click', () => {
    state.focus = 0; state.light = 100; state.stain = 'none';
    state.panX = 0; state.panY = 0;
    $('#focusRange', outlet).value = 0;
    $('#lightRange', outlet).value = 100;
    $('#stainSelect', outlet).value = 'none';
    $('#focusHint', outlet).textContent = 'التبئير مضبوط';
    $('#lightHint', outlet).textContent = '١٠٠٪';
    setMagnification(recommendedMagnification(state.specimen.sizeUm));
    applyFilters();
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
      link.download = `anas-${state.specimen.id}-${state.mag}x.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('تم حفظ صورة الحقل 📸', 'ok');
    }, 'image/png');
  });

  /* --- السحب لتحريك الشريحة --- */
  let dragging = false, lastX = 0, lastY = 0;

  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    state.panX += event.clientX - lastX;
    state.panY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
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

  /* --- عجلة الفأرة للتكبير --- */
  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    setMagnification(state.mag * (event.deltaY > 0 ? .9 : 1.1));
  }, { passive: false });

  /* --- مفاتيح لوحة المفاتيح --- */
  const onKey = (event) => {
    if (event.target.matches('input, select, textarea')) return;
    const step = 26;
    if (event.key === 'ArrowRight'){ state.panX -= step; }
    else if (event.key === 'ArrowLeft'){ state.panX += step; }
    else if (event.key === 'ArrowUp'){ state.panY += step; }
    else if (event.key === 'ArrowDown'){ state.panY -= step; }
    else if (event.key === '+' || event.key === '='){ setMagnification(state.mag * 1.15); }
    else if (event.key === '-'){ setMagnification(state.mag * .87); }
    else return;
    event.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  /* --- الاستجابة لتغيّر الحجم --- */
  const observer = new ResizeObserver(() => { resize(); updateScaleBar(); });
  observer.observe(stage);

  /* =======================================================
     الإقلاع
     ======================================================= */
  resize();
  seedPopulation();
  setMagnification(state.mag);
  applyFilters();
  loadSprite(state.specimen).then((image) => {
    sprite = image;
    if (!image) toast('تعذّر تحميل رسم العيّنة', 'error');
  });
  draw();

  /* --- التنظيف عند مغادرة الصفحة --- */
  return () => {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener('keydown', onKey);
  };
}
