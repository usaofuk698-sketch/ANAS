/* =========================================================
   ANAS — قسم الـ3D

   محرّك ثلاثي الأبعاد مصغّر مكتوب من الصفر على canvas ثنائي
   الأبعاد — بلا أي مكتبة خارجية. السبب: المنصة تبقى خفيفة،
   تعمل بلا إنترنت، ولا تعتمد على CDN قد يتعطّل.

   الطريقة: دوران بمصفوفتين حول محوري Y و X، ثم إسقاط
   منظوري، ثم ترتيب العناصر حسب العمق ورسمها من الأبعد
   إلى الأقرب (خوارزمية الرسّام).

   ملاحظة علمية: النماذج تخطيطية تعليمية — تُظهر البنية
   والعلاقات بين الأجزاء، لا الأبعاد الذرية الدقيقة.
   ========================================================= */

import { html, raw, render, $, $$, toast, clamp, delegate } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { recordModelExplored, isLoggedIn } from '../auth.js';

/* =========================================================
   بناء النماذج
   كل نموذج يعيد { points, bonds, scale, caption, parts }
   ========================================================= */

const MODELS = {

  /* ---------------- اللولب المزدوج للحمض النووي ---------------- */
  dna: {
    label: 'الحمض النووي',
    latin: 'DNA Double Helix',
    icon: '🧬',
    blurb: 'سلّم ملتوٍ من شريطين متعاكسين، ودرجاته أزواج القواعد النيتروجينية.',
    parts: [
      { color: '#64d9ff', label: 'الشريط السكري الفوسفاتي' },
      { color: '#ff8a80', label: 'زوج القواعد A–T' },
      { color: '#b388ff', label: 'زوج القواعد G–C' },
    ],
    build(){
      const points = [], bonds = [];
      const turns = 3.2, perTurn = 14, total = Math.round(turns * perTurn);
      const radius = 46, rise = 4.6;

      for (let i = 0; i < total; i++){
        const angle = (i / perTurn) * Math.PI * 2;
        const y = (i - total / 2) * rise;

        const a = points.push({ x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, r: 5.4, color: '#64d9ff' }) - 1;
        const b = points.push({ x: Math.cos(angle + Math.PI) * radius, y, z: Math.sin(angle + Math.PI) * radius, r: 5.4, color: '#4fc3f7' }) - 1;

        // ربط الشريطين على طولهما
        if (i > 0){
          bonds.push({ a: a - 2, b: a, color: '#3aa7d8', width: 3.2 });
          bonds.push({ a: b - 2, b: b, color: '#3aa7d8', width: 3.2 });
        }

        // درجات السلّم: زوج القواعد كل خطوة
        const pairColor = i % 2 ? '#ff8a80' : '#b388ff';
        const midA = points.push({ x: Math.cos(angle) * radius * .48, y, z: Math.sin(angle) * radius * .48, r: 3.4, color: pairColor }) - 1;
        const midB = points.push({ x: Math.cos(angle + Math.PI) * radius * .48, y, z: Math.sin(angle + Math.PI) * radius * .48, r: 3.4, color: pairColor }) - 1;
        bonds.push({ a, b: midA, color: pairColor, width: 2.2 });
        bonds.push({ a: midA, b: midB, color: pairColor, width: 2.2 });
        bonds.push({ a: midB, b, color: pairColor, width: 2.2 });
      }
      return { points, bonds, scale: 1 };
    },
  },

  /* ---------------- فيروس كروي بأشواك ---------------- */
  virus: {
    label: 'فيروس',
    latin: 'Enveloped Virus',
    icon: '☣️',
    blurb: 'غلاف كروي مرصّع بأشواك بروتينية تلتصق بمستقبِلات الخلية المضيفة.',
    parts: [
      { color: '#ff8a80', label: 'الغلاف الدهني' },
      { color: '#ffd180', label: 'الأشواك البروتينية' },
      { color: '#82b1ff', label: 'المادة الوراثية' },
    ],
    build(){
      const points = [], bonds = [];
      const radius = 52;

      // توزيع متساوٍ على سطح كرة بطريقة حلزون فيبوناتشي
      const shell = 220;
      for (let i = 0; i < shell; i++){
        const y = 1 - (i / (shell - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * radius,
          y: y * radius,
          z: Math.sin(theta) * r * radius,
          r: 3.4, color: '#ff8a80',
        });
      }

      // الأشواك
      const spikes = 34;
      for (let i = 0; i < spikes; i++){
        const y = 1 - (i / (spikes - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963 + .6;
        const dir = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };

        const base = points.push({ x: dir.x * radius, y: dir.y * radius, z: dir.z * radius, r: 3, color: '#ffab91' }) - 1;
        const mid  = points.push({ x: dir.x * (radius + 12), y: dir.y * (radius + 12), z: dir.z * (radius + 12), r: 2.8, color: '#ffd180' }) - 1;
        const tip  = points.push({ x: dir.x * (radius + 22), y: dir.y * (radius + 22), z: dir.z * (radius + 22), r: 6, color: '#ffd180' }) - 1;
        bonds.push({ a: base, b: mid, color: '#ffab91', width: 2.6 });
        bonds.push({ a: mid, b: tip, color: '#ffc46b', width: 2.6 });
      }

      // المادة الوراثية ملتفّة في الداخل
      let previous = null;
      for (let i = 0; i < 90; i++){
        const t = i / 90 * Math.PI * 8;
        const shrink = 26 * (1 - i / 260);
        const index = points.push({
          x: Math.cos(t) * shrink,
          y: (i - 45) * .5,
          z: Math.sin(t) * shrink,
          r: 2.6, color: '#82b1ff',
        }) - 1;
        if (previous !== null) bonds.push({ a: previous, b: index, color: '#5b8fe0', width: 1.8 });
        previous = index;
      }

      return { points, bonds, scale: 1 };
    },
  },

  /* ---------------- خلية حيوانية ---------------- */
  cell: {
    label: 'الخلية الحيوانية',
    latin: 'Animal Cell',
    icon: '🔵',
    blurb: 'غشاء خارجي يحيط بالنواة والميتوكوندريا وبقية العضيات السابحة في السيتوبلازم.',
    parts: [
      { color: '#4dd0e1', label: 'الغشاء الخلوي' },
      { color: '#b388ff', label: 'النواة' },
      { color: '#ffab40', label: 'الميتوكوندريا' },
      { color: '#69f0ae', label: 'الريبوسومات' },
    ],
    build(){
      const points = [], bonds = [];
      const radius = 74;

      // الغشاء — نقاط شفافة على السطح
      for (let i = 0; i < 260; i++){
        const y = 1 - (i / 259) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * radius,
          y: y * radius,
          z: Math.sin(theta) * r * radius,
          r: 2.6, color: '#4dd0e1', alpha: .5,
        });
      }

      // النواة
      const nucleusR = 26;
      for (let i = 0; i < 120; i++){
        const y = 1 - (i / 119) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * nucleusR - 10,
          y: y * nucleusR + 6,
          z: Math.sin(theta) * r * nucleusR,
          r: 3.6, color: '#b388ff', alpha: .95,
        });
      }
      points.push({ x: -10, y: 6, z: 0, r: 12, color: '#7c4dff', alpha: 1 });   // النوية

      // الميتوكوندريا — كبسولات موزّعة
      const mitoSpots = [
        { x:  38, y: -26, z:  14, angle:  .6 },
        { x: -42, y:  30, z: -18, angle: -.9 },
        { x:  14, y:  44, z:  26, angle:  1.4 },
        { x: -20, y: -44, z:  30, angle:  .2 },
        { x:  44, y:  10, z: -34, angle: -.4 },
      ];
      for (const spot of mitoSpots){
        let previous = null;
        for (let i = 0; i < 7; i++){
          const offset = (i - 3) * 5;
          const index = points.push({
            x: spot.x + Math.cos(spot.angle) * offset,
            y: spot.y + Math.sin(spot.angle) * offset,
            z: spot.z,
            r: 5.6 - Math.abs(i - 3) * .5,
            color: '#ffab40', alpha: 1,
          }) - 1;
          if (previous !== null) bonds.push({ a: previous, b: index, color: '#ff8f00', width: 4 });
          previous = index;
        }
      }

      // الريبوسومات
      for (let i = 0; i < 46; i++){
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 30 + Math.random() * 36;
        points.push({
          x: Math.sin(phi) * Math.cos(theta) * r,
          y: Math.cos(phi) * r,
          z: Math.sin(phi) * Math.sin(theta) * r,
          r: 2.4, color: '#69f0ae', alpha: .9,
        });
      }

      return { points, bonds, scale: 1 };
    },
  },

  /* ---------------- بكتيريا عصوية ---------------- */
  bacterium: {
    label: 'خلية بكتيرية',
    latin: 'Bacillus Cell',
    icon: '🦠',
    blurb: 'خلية بدائية النواة: جدار صلب، ومادة وراثية حلقية طليقة، وأسواط للحركة.',
    parts: [
      { color: '#80deea', label: 'جدار الخلية' },
      { color: '#ffd54f', label: 'الحمض النووي الحلقي' },
      { color: '#f48fb1', label: 'الريبوسومات' },
      { color: '#a5d6a7', label: 'السوط' },
    ],
    build(){
      const points = [], bonds = [];
      const length = 78, radius = 32;

      // جسم كبسولي
      for (let i = 0; i < 300; i++){
        const t = i / 299;
        const y = (t - .5) * 2 * length;
        const capped = Math.abs(y) > length - radius;
        const r = capped
          ? Math.sqrt(Math.max(0, radius * radius - (Math.abs(y) - (length - radius)) ** 2))
          : radius;
        const theta = i * 2.399963;
        points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r, r: 2.8, color: '#80deea', alpha: .55 });
      }

      // النوكليويد — حمض نووي حلقي
      let first = null, previous = null;
      for (let i = 0; i < 54; i++){
        const t = (i / 54) * Math.PI * 2;
        const index = points.push({
          x: Math.cos(t) * 17 + Math.sin(t * 3) * 5,
          y: Math.sin(t) * 26,
          z: Math.sin(t * 2) * 13,
          r: 3, color: '#ffd54f', alpha: 1,
        }) - 1;
        if (previous !== null) bonds.push({ a: previous, b: index, color: '#ffb300', width: 2.4 });
        if (first === null) first = index;
        previous = index;
      }
      bonds.push({ a: previous, b: first, color: '#ffb300', width: 2.4 });

      // ريبوسومات
      for (let i = 0; i < 40; i++){
        points.push({
          x: (Math.random() - .5) * 46,
          y: (Math.random() - .5) * 130,
          z: (Math.random() - .5) * 46,
          r: 2.2, color: '#f48fb1', alpha: .9,
        });
      }

      // أسواط
      for (let f = 0; f < 3; f++){
        let prev = null;
        const baseAngle = (f / 3) * Math.PI * 2;
        for (let i = 0; i < 20; i++){
          const t = i / 19;
          const index = points.push({
            x: Math.cos(baseAngle + t * 6) * (10 + t * 16),
            y: -length - t * 54,
            z: Math.sin(baseAngle + t * 6) * (10 + t * 16),
            r: 2, color: '#a5d6a7', alpha: .85,
          }) - 1;
          if (prev !== null) bonds.push({ a: prev, b: index, color: '#81c784', width: 2 });
          prev = index;
        }
      }

      return { points, bonds, scale: 1 };
    },
  },
};

/* =========================================================
   الصفحة
   ========================================================= */
export default function lab3dView({ outlet, query }){
  setCinemaDim(1);

  const startKey = MODELS[query.get('model')] ? query.get('model') : 'dna';

  const state = {
    key: startKey,
    model: MODELS[startKey].build(),
    rotX: -.35,
    rotY: .6,
    zoom: 1,
    autoSpin: true,
    showLabels: true,
  };

  outlet.innerHTML = render(html`
    <section class="section lab3d">
      <div class="wrap">
        <header class="section__head" style="max-width:760px">
          <span class="eyebrow"><span class="eyebrow__dot"></span> قسم الـ3D</span>
          <h1 class="section__title" style="margin-top:18px">أمسك البنية <span>وأدِرها بيدك</span></h1>
          <p class="section__lead">
            نماذج تخطيطية تفاعلية تُظهر كيف تترتّب أجزاء الكائن في الفراغ. اسحب للتدوير، وقرّب بعجلة الفأرة.
          </p>
        </header>

        <div class="lab3d__picker" role="group" aria-label="اختر النموذج">
          ${Object.entries(MODELS).map(([key, model]) => html`
            <button class="lab3d__pick ${raw(key === state.key ? 'is-active' : '')}" type="button" data-model="${key}">
              <span class="lab3d__pick-icon" aria-hidden="true">${model.icon}</span>
              <span class="lab3d__pick-label">${model.label}</span>
              <span class="lab3d__pick-latin latin">${model.latin}</span>
            </button>
          `)}
        </div>

        <div class="lab3d__layout">
          <div class="lab3d__viewport" id="viewport">
            <canvas id="lab3dCanvas" aria-label="عارض ثلاثي الأبعاد"></canvas>
            <p class="lab3d__hint">اسحب للتدوير · عجلة الفأرة للتقريب</p>
          </div>

          <aside class="lab3d__side panel">
            <h2 class="lab3d__title" id="modelTitle"></h2>
            <p class="lab3d__latin latin" id="modelLatin"></p>
            <p class="lab3d__blurb" id="modelBlurb"></p>

            <h3 class="lab3d__legend-title">مفتاح الألوان</h3>
            <ul class="lab3d__legend" id="legend"></ul>

            <div class="lab3d__controls">
              <label class="checkbox">
                <input type="checkbox" id="spinToggle" checked />
                <span>دوران تلقائي</span>
              </label>

              <div class="field">
                <label class="field__label" for="zoomRange">التقريب</label>
                <input class="range" id="zoomRange" type="range" min="50" max="220" step="1" value="100" />
              </div>

              <div class="row">
                <button class="btn btn--secondary btn--sm" type="button" id="resetView">إعادة الضبط</button>
                <button class="btn btn--primary btn--sm" type="button" id="shot3d">التقط صورة</button>
              </div>
            </div>

            <p class="lab3d__note">
              النماذج تخطيطية لأغراض تعليمية: تُظهر البنية والترتيب، لا الأبعاد الذرية الدقيقة.
            </p>
          </aside>
        </div>
      </div>
    </section>
  `);

  const canvas = $('#lab3dCanvas', outlet);
  const ctx = canvas.getContext('2d');
  const viewport = $('#viewport', outlet);

  let width = 0, height = 0, dpr = 1, raf = null, destroyed = false;

  function resize(){
    const rect = viewport.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- حلقة الرسم ---------------- */

  const projected = [];

  function draw(){
    if (destroyed) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden) return;

    if (state.autoSpin) state.rotY += .004;

    const cosY = Math.cos(state.rotY), sinY = Math.sin(state.rotY);
    const cosX = Math.cos(state.rotX), sinX = Math.sin(state.rotX);

    const focal = 460;
    const baseScale = Math.min(width, height) / 230;
    const scale = baseScale * state.zoom;

    // إسقاط كل النقاط
    projected.length = 0;
    for (let i = 0; i < state.model.points.length; i++){
      const point = state.model.points[i];

      // دوران حول Y ثم X
      const x1 = point.x * cosY - point.z * sinY;
      const z1 = point.x * sinY + point.z * cosY;
      const y2 = point.y * cosX - z1 * sinX;
      const z2 = point.y * sinX + z1 * cosX;

      const depth = focal / (focal + z2);
      projected.push({
        x: width / 2 + x1 * depth * scale,
        y: height / 2 + y2 * depth * scale,
        z: z2,
        r: Math.max(.6, point.r * depth * scale * .5),
        color: point.color,
        alpha: point.alpha ?? 1,
        depth,
      });
    }

    ctx.clearRect(0, 0, width, height);

    // الروابط أولاً، من الأبعد إلى الأقرب
    const bonds = state.model.bonds
      .map((bond) => ({ bond, z: (projected[bond.a].z + projected[bond.b].z) / 2 }))
      .sort((a, b) => b.z - a.z);

    ctx.lineCap = 'round';
    for (const { bond } of bonds){
      const a = projected[bond.a], b = projected[bond.b];
      const fade = clamp((a.depth + b.depth) / 2 - .45, .12, 1);
      ctx.globalAlpha = fade * .8;
      ctx.strokeStyle = bond.color;
      ctx.lineWidth = Math.max(.5, bond.width * ((a.depth + b.depth) / 2) * state.zoom * .7);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // ثم الكرات
    const order = projected
      .map((point, i) => ({ point, i }))
      .sort((a, b) => b.point.z - a.point.z);

    for (const { point } of order){
      const fade = clamp(point.depth - .4, .1, 1);
      ctx.globalAlpha = point.alpha * fade;

      const gradient = ctx.createRadialGradient(
        point.x - point.r * .35, point.y - point.r * .35, point.r * .1,
        point.x, point.y, point.r,
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(.35, point.color);
      gradient.addColorStop(1, shade(point.color, -.45));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /** يعتم أو يفتح لوناً سداسياً */
  function shade(hex, amount){
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const num = parseInt(full, 16);
    const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((channel) => {
      const next = amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount;
      return clamp(Math.round(next), 0, 255);
    });
    return `rgb(${channels.join(',')})`;
  }

  /* ---------------- تبديل النموذج ---------------- */

  function selectModel(key){
    if (!MODELS[key]) return;
    state.key = key;
    state.model = MODELS[key].build();
    state.rotX = -.35;
    state.rotY = .6;

    const model = MODELS[key];
    $('#modelTitle', outlet).textContent = model.label;
    $('#modelLatin', outlet).textContent = model.latin;
    $('#modelBlurb', outlet).textContent = model.blurb;
    $('#legend', outlet).innerHTML = render(html`
      ${model.parts.map((part) => html`
        <li class="lab3d__legend-item">
          <span class="lab3d__swatch" style="background:${part.color}"></span>
          ${part.label}
        </li>
      `)}
    `);

    $$('[data-model]', outlet).forEach((button) => {
      button.classList.toggle('is-active', button.dataset.model === key);
    });

    history.replaceState(null, '', `#/lab3d?model=${key}`);

    if (isLoggedIn()) recordModelExplored(key);
  }

  delegate(outlet, 'click', '[data-model]', (_event, button) => selectModel(button.dataset.model));

  /* ---------------- التفاعل ---------------- */

  let dragging = false, lastX = 0, lastY = 0;

  viewport.addEventListener('pointerdown', (event) => {
    dragging = true;
    state.autoSpin = false;
    $('#spinToggle', outlet).checked = false;
    lastX = event.clientX; lastY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    state.rotY += (event.clientX - lastX) * .008;
    state.rotX = clamp(state.rotX + (event.clientY - lastY) * .008, -1.45, 1.45);
    lastX = event.clientX; lastY = event.clientY;
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (event.pointerId != null && viewport.hasPointerCapture?.(event.pointerId)){
      viewport.releasePointerCapture(event.pointerId);
    }
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    setZoom(state.zoom * (event.deltaY > 0 ? .92 : 1.08));
  }, { passive: false });

  function setZoom(value){
    state.zoom = clamp(value, .5, 2.2);
    $('#zoomRange', outlet).value = Math.round(state.zoom * 100);
  }

  $('#zoomRange', outlet).addEventListener('input', (event) => {
    state.zoom = clamp(Number(event.target.value) / 100, .5, 2.2);
  });

  $('#spinToggle', outlet).addEventListener('change', (event) => {
    state.autoSpin = event.target.checked;
  });

  $('#resetView', outlet).addEventListener('click', () => {
    state.rotX = -.35; state.rotY = .6;
    setZoom(1);
    state.autoSpin = true;
    $('#spinToggle', outlet).checked = true;
  });

  $('#shot3d', outlet).addEventListener('click', () => {
    const shot = document.createElement('canvas');
    shot.width = canvas.width;
    shot.height = canvas.height;
    const shotCtx = shot.getContext('2d');
    shotCtx.fillStyle = '#040f1e';
    shotCtx.fillRect(0, 0, shot.width, shot.height);
    shotCtx.drawImage(canvas, 0, 0);

    shot.toBlob((blob) => {
      if (!blob){
        toast('تعذّر التقاط الصورة في هذا المتصفح', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anas-3d-${state.key}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('تم حفظ صورة النموذج 📸', 'ok');
    }, 'image/png');
  });

  /* ---------------- الإقلاع ---------------- */

  const observer = new ResizeObserver(resize);
  observer.observe(viewport);

  resize();
  selectModel(state.key);
  draw();

  return () => {
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
  };
}
