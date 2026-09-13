/* =========================================================
   ANAS — قسم الـ3D

   محرّك ثلاثي الأبعاد مصغّر مكتوب من الصفر على canvas ثنائي
   الأبعاد — بلا أي مكتبة خارجية. السبب: المنصة تبقى خفيفة،
   تعمل بلا إنترنت، ولا تعتمد على CDN قد يتعطّل.

   الطريقة: دوران بمصفوفتين حول محوري Y و X، ثم إسقاط
   منظوري، ثم ترتيب العناصر حسب العمق ورسمها من الأبعد
   إلى الأقرب (خوارزمية الرسّام).

   ملاحظة علمية: النماذج مبنية على قياسات منشورة (النِّسَب،
   الأعداد، الأبعاد) وتُعرض أرقامها بجانب كل نموذج مع مصادرها.
   لكنها تبقى تمثيلاً هندسياً للبنية لا إحداثيات ذرية: لعرض
   الذرّات الفعلية تُفتح البنية في بنك بيانات البروتين PDB
   من روابط المصادر.
   ========================================================= */

import { html, raw, render, $, $$, toast, clamp, delegate } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { recordModelExplored, isLoggedIn } from '../auth.js';

/* =========================================================
   النماذج — مبنية من قياسات منشورة لا من تقدير بصري

   كل نموذج يعلن الأرقام التي بُني عليها في حقل specs،
   وتُعرض للمستخدم بجانب النموذج ليتحقّق منها.
   ========================================================= */

const MODELS = {

  /* ---------------- اللولب المزدوج B-DNA ----------------
     القياسات المعيارية لشكل B:
     • 10.5 زوج قاعدي لكل دورة كاملة
     • ارتفاع 3.4 أنغستروم لكل زوج (خطوة الدورة ≈ 35.7 Å)
     • قطر 20 أنغستروم (2 نانومتر)
     • حلزون أيمن — وهذا ما تخطئ فيه معظم الرسوم
     • الشريطان ليسا متقابلين بـ 180°: إزاحتهما الزاويّة
       (نحو 144°) هي ما يولّد الأخدود الكبير والصغير
     ---------------------------------------------------- */
  dna: {
    label: 'الحمض النووي',
    latin: 'B-DNA Double Helix',
    icon: '🧬',
    blurb: 'اللولب المزدوج بشكله الفيزيولوجي B: حلزون أيمن، عشرة أزواج ونصف لكل دورة، وأخدودان غير متساويين.',
    parts: [
      { color: '#64d9ff', label: 'الشريط السكري الفوسفاتي' },
      { color: '#ff8a80', label: 'زوج A–T (رابطتان هيدروجينيتان)' },
      { color: '#b388ff', label: 'زوج G–C (ثلاث روابط)' },
      { color: '#ffd54f', label: 'الأخدود الكبير' },
    ],
    specs: [
      { label: 'أزواج القواعد لكل دورة', value: '10.5' },
      { label: 'الارتفاع لكل زوج', value: '3.4 أنغستروم' },
      { label: 'خطوة الحلزون', value: '≈ 35.7 أنغستروم' },
      { label: 'القطر', value: '20 أنغستروم (2 نانومتر)' },
      { label: 'الاتجاه', value: 'حلزون أيمن' },
      { label: 'الأخدود الكبير / الصغير', value: '≈ 22 / 12 أنغستروم عرضاً' },
    ],
    sources: [
      { label: 'البنية 1BNA — دوديكامير درو-ديكرسون', url: 'https://www.rcsb.org/structure/1BNA' },
      { label: 'Molecular Biology of the Cell — Alberts et al.', url: 'https://www.ncbi.nlm.nih.gov/books/NBK21054/' },
    ],
    build(){
      const points = [], bonds = [];

      const BP_PER_TURN = 10.5;
      const RISE = 5.0;
      const RADIUS = 44;
      const GROOVE_OFFSET = (144 * Math.PI) / 180;
      const TURNS = 2.6;
      const total = Math.round(TURNS * BP_PER_TURN);

      // الشريطان يُرسمان بدقّة أعلى من أزواج القواعد (أربع نقاط
      // لكل زوج) فيقرأهما العين شريطين ملتفّين متصلين لا كرات
      const SUB = 4;
      const strandA = [], strandB = [];

      for (let i = 0; i <= total * SUB; i++){
        const bp = i / SUB;
        const angle = (bp / BP_PER_TURN) * Math.PI * 2;   // موجب = حلزون أيمن
        const y = (bp - total / 2) * RISE;
        const isNode = i % SUB === 0;

        strandA.push(points.push({
          x: Math.cos(angle) * RADIUS, y, z: Math.sin(angle) * RADIUS,
          r: isNode ? 4.6 : 2.9, color: '#64d9ff',
        }) - 1);

        strandB.push(points.push({
          x: Math.cos(angle + GROOVE_OFFSET) * RADIUS, y, z: Math.sin(angle + GROOVE_OFFSET) * RADIUS,
          r: isNode ? 4.6 : 2.9, color: '#3aa7d8',
        }) - 1);

        if (i > 0){
          bonds.push({ a: strandA[i - 1], b: strandA[i], color: '#4bb8e4', width: 4.4 });
          bonds.push({ a: strandB[i - 1], b: strandB[i], color: '#2f8fc2', width: 4.4 });
        }
      }

      // درجات السلّم: زوج قاعدي واحد عند كل عقدة
      for (let bp = 0; bp <= total; bp++){
        const i = bp * SUB;
        const isGC = bp % 3 === 0;
        const color = isGC ? '#b388ff' : '#ff8a80';
        bonds.push({
          a: strandA[i], b: strandB[i],
          color,
          // ثلاث روابط هيدروجينية في G–C مقابل رابطتين في A–T
          width: isGC ? 3.6 : 2.4,
        });
      }

      return { points, bonds };
    },
  },

  /* ---------------- فيروس الإنفلونزا ----------------
     • القطر 80–120 نانومتر
     • نحو 500 شوكة، بنسبة تقارب 4 هيماغلوتينين : 1 نورامينيداز
     • الهيماغلوتينين ثلاثي عصوي، والنورامينيداز رباعي فطري الشكل
     • ثماني قطع من RNA سالب الاتجاه
     نرسم عيّنة ممثّلة من الأشواك لا الخمسمئة كاملة حفاظاً
     على وضوح الشكل وسرعة العرض، والعدد الحقيقي مذكور.
     ---------------------------------------------------- */
  influenza: {
    label: 'فيروس الإنفلونزا',
    latin: 'Influenza A virion',
    icon: '🦠',
    blurb: 'غلاف دهني كثيف الأشواك: عصيّات الهيماغلوتينين الثلاثية وفطريات النورامينيداز الرباعية، وثماني قطع وراثية منفصلة.',
    parts: [
      { color: '#ff8a80', label: 'الغلاف الدهني' },
      { color: '#ffd180', label: 'الهيماغلوتينين HA (ثلاثي)' },
      { color: '#69f0ae', label: 'النورامينيداز NA (رباعي)' },
      { color: '#82b1ff', label: 'قطع RNA الثماني' },
    ],
    specs: [
      { label: 'القطر', value: '80 – 120 نانومتر' },
      { label: 'عدد الأشواك الحقيقي', value: '≈ 500 لكل جسيم' },
      { label: 'نسبة HA إلى NA', value: '≈ 4 : 1' },
      { label: 'ارتفاع HA', value: '≈ 13.5 نانومتر' },
      { label: 'الجينوم', value: '8 قطع RNA سالب، ≈ 13.5 ألف قاعدة' },
      { label: 'المعروض هنا', value: '48 شوكة ممثّلة للتوضيح' },
    ],
    sources: [
      { label: 'البنية 1RUZ — هيماغلوتينين إنفلونزا 1918', url: 'https://www.rcsb.org/structure/1RUZ' },
      { label: 'الإنفلونزا الموسمية — منظمة الصحة العالمية', url: 'https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)' },
    ],
    build(){
      const points = [], bonds = [];
      const RADIUS = 50;

      // الغلاف الدهني
      const shell = 240;
      for (let i = 0; i < shell; i++){
        const y = 1 - (i / (shell - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;                 // حلزون فيبوناتشي — توزيع متساوٍ
        points.push({
          x: Math.cos(theta) * r * RADIUS,
          y: y * RADIUS,
          z: Math.sin(theta) * r * RADIUS,
          r: 3.2, color: '#ff8a80', alpha: .85,
        });
      }

      // الأشواك بنسبة 4 HA : 1 NA
      const SPIKES = 48;
      for (let i = 0; i < SPIKES; i++){
        const y = 1 - (i / (SPIKES - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963 + .5;
        const dir = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
        const isNA = i % 5 === 0;                   // واحد من كل خمسة

        const at = (d) => ({
          x: dir.x * (RADIUS + d), y: dir.y * (RADIUS + d), z: dir.z * (RADIUS + d),
        });

        if (isNA){
          // النورامينيداز: ساق رفيع ورأس رباعي عريض — شكل الفطر
          const base = points.push({ ...at(1),  r: 2.6, color: '#69f0ae' }) - 1;
          const stalk= points.push({ ...at(11), r: 2.4, color: '#69f0ae' }) - 1;
          const head = points.push({ ...at(18), r: 6.4, color: '#69f0ae' }) - 1;
          bonds.push({ a: base, b: stalk, color: '#43c98a', width: 2.2 });
          bonds.push({ a: stalk, b: head, color: '#43c98a', width: 2.6 });
        } else {
          // الهيماغلوتينين: عصا ثلاثية أطول وأنحف رأساً
          const base = points.push({ ...at(1),  r: 2.8, color: '#ffab91' }) - 1;
          const mid  = points.push({ ...at(10), r: 2.6, color: '#ffd180' }) - 1;
          const tip  = points.push({ ...at(20), r: 4.4, color: '#ffd180' }) - 1;
          bonds.push({ a: base, b: mid, color: '#ffab91', width: 2.6 });
          bonds.push({ a: mid, b: tip, color: '#ffc46b', width: 2.6 });
        }
      }

      // ثماني قطع وراثية منفصلة — سمة الإنفلونزا المميّزة
      for (let segment = 0; segment < 8; segment++){
        const angle = (segment / 8) * Math.PI * 2;
        const cx = Math.cos(angle) * 20;
        const cz = Math.sin(angle) * 20;
        const length = 10 + segment;               // الأطوال متفاوتة كما في الواقع
        let previous = null;
        for (let i = 0; i < length; i++){
          const t = i / length;
          const index = points.push({
            x: cx + Math.cos(t * 7 + segment) * 5,
            y: (t - .5) * 46,
            z: cz + Math.sin(t * 7 + segment) * 5,
            r: 2.4, color: '#82b1ff', alpha: .95,
          }) - 1;
          if (previous !== null) bonds.push({ a: previous, b: index, color: '#5b8fe0', width: 1.8 });
          previous = index;
        }
      }

      return { points, bonds };
    },
  },

  /* ---------------- فيروس كورونا ----------------
     الفارق الجوهري عن الإنفلونزا: عدد الأشواك.
     قياسات التصوير المقطعي البردي تعطي نحو 24 ± 9 شوكة
     ثلاثية لكل جسيم — أي عُشر ما على الإنفلونزا تقريباً.
     ---------------------------------------------------- */
  coronavirus: {
    label: 'فيروس كورونا',
    latin: 'SARS-CoV-2 virion',
    icon: '☣️',
    blurb: 'أشواك قليلة متباعدة على عكس الانطباع الشائع: نحو ٢٤ شوكة فقط، كل منها بروتين ثلاثي هُرَاوي الشكل.',
    parts: [
      { color: '#9fa8da', label: 'الغلاف الدهني' },
      { color: '#ff8a80', label: 'بروتين الشوكة S (ثلاثي)' },
      { color: '#4dd0e1', label: 'بروتين الغشاء M' },
      { color: '#ffd54f', label: 'حلزون النوكليوكابسيد N' },
    ],
    specs: [
      { label: 'القطر', value: '80 – 120 نانومتر (متوسط ≈ 91)' },
      { label: 'عدد الأشواك', value: '≈ 24 ± 9 لكل جسيم' },
      { label: 'ارتفاع الشوكة', value: '≈ 25 نانومتر' },
      { label: 'بنية الشوكة', value: 'بروتين ثلاثي (trimer)' },
      { label: 'الجينوم', value: 'RNA موجب مفرد، ≈ 29,900 قاعدة' },
      { label: 'المعروض هنا', value: '24 شوكة — العدد الحقيقي' },
    ],
    sources: [
      { label: 'البنية 6VXX — الشوكة في الحالة المغلقة', url: 'https://www.rcsb.org/structure/6VXX' },
      { label: 'البنية 6VSB — الشوكة قبل الاندماج', url: 'https://www.rcsb.org/structure/6VSB' },
    ],
    build(){
      const points = [], bonds = [];
      const RADIUS = 48;

      for (let i = 0; i < 230; i++){
        const y = 1 - (i / 229) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * RADIUS,
          y: y * RADIUS,
          z: Math.sin(theta) * r * RADIUS,
          r: 3, color: i % 4 === 0 ? '#4dd0e1' : '#9fa8da', alpha: .8,
        });
      }

      // 24 شوكة — العدد المقيس فعلياً، والفرق عن الإنفلونزا ظاهر للعين
      const SPIKES = 24;
      for (let i = 0; i < SPIKES; i++){
        const y = 1 - (i / (SPIKES - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963 + .9;
        const dir = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
        const at = (d) => ({ x: dir.x * (RADIUS + d), y: dir.y * (RADIUS + d), z: dir.z * (RADIUS + d) });

        // ساق رفيع يعلوه رأس عريض — شكل الهراوة المميّز
        const base = points.push({ ...at(1),  r: 3,   color: '#ff8a80' }) - 1;
        const neck = points.push({ ...at(11), r: 2.8, color: '#ff8a80' }) - 1;
        const head = points.push({ ...at(21), r: 7.2, color: '#ff5252' }) - 1;
        bonds.push({ a: base, b: neck, color: '#ff8a80', width: 3 });
        bonds.push({ a: neck, b: head, color: '#ff7062', width: 3.4 });
      }

      // حلزون النوكليوكابسيد الشريطي
      let previous = null;
      for (let i = 0; i < 110; i++){
        const t = (i / 110) * Math.PI * 9;
        const shrink = 25 * (1 - i / 300);
        const index = points.push({
          x: Math.cos(t) * shrink,
          y: (i - 55) * .42,
          z: Math.sin(t) * shrink,
          r: 2.6, color: '#ffd54f', alpha: .95,
        }) - 1;
        if (previous !== null) bonds.push({ a: previous, b: index, color: '#ffb300', width: 1.9 });
        previous = index;
      }

      return { points, bonds };
    },
  },

  /* ---------------- العاثية T4 ----------------
     • رأس عشروني مطاول 120 × 86 نانومتر
     • ذيل 100 نانومتر بغمد قابل للانقباض
     • ستّ ألياف ذيلية طويلة — لا أربع
     ---------------------------------------------------- */
  phage: {
    label: 'العاثية T4',
    latin: 'Escherichia virus T4',
    icon: '🛸',
    blurb: 'آلة حقن بيولوجية: رأس عشروني مطاول، وغمد ينقبض كالمكبس، وستّ أرجل تتحسّس المضيف قبل الهبوط.',
    parts: [
      { color: '#b3e5fc', label: 'الرأس العشروني المطاول' },
      { color: '#4dd0e1', label: 'الغمد المنقبض' },
      { color: '#ffd54f', label: 'الصفيحة القاعدية' },
      { color: '#a5d6a7', label: 'الألياف الذيلية الست' },
    ],
    specs: [
      { label: 'الرأس', value: '≈ 120 × 86 نانومتر' },
      { label: 'شكل الرأس', value: 'عشروني مطاول (prolate icosahedron)' },
      { label: 'الذيل', value: '≈ 100 نانومتر' },
      { label: 'الألياف الطويلة', value: '6 (وستّ قصيرة إضافية)' },
      { label: 'الجينوم', value: 'DNA مزدوج، ≈ 169 ألف زوج قاعدي' },
      { label: 'الحصيلة لكل خلية', value: '100 – 200 جسيم خلال ≈ 30 دقيقة' },
    ],
    sources: [
      { label: 'البنية 5VF3 — الصفيحة القاعدية للعاثية T4', url: 'https://www.rcsb.org/structure/5VF3' },
      { label: 'التصنيف في NCBI', url: 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=Escherichia%20virus%20T4' },
    ],
    build(){
      const points = [], bonds = [];

      /* الرأس: عشروني مطاول — نبنيه من رؤوس عشروني منتظم
         ثم نمدّده على المحور Y بنسبة 120/86 الحقيقية */
      const PHI = (1 + Math.sqrt(5)) / 2;
      const STRETCH = 120 / 86;
      const headR = 30;

      /* الرؤوس الاثنا عشر الأساسية للعشروني المنتظم.
         نحسب الحواف على الشكل المنتظم أولاً (طول الحافة = 2
         بالضبط في هذا النظام)، ثم نطبّق التمديد — وإلا أخطأ
         اختيار الحواف بعد تشوّه المسافات. */
      const icoVerts = [];
      for (const s1 of [1, -1]) for (const s2 of [1, -1]){
        icoVerts.push([0, s1, s2 * PHI]);
        icoVerts.push([s1, s2 * PHI, 0]);
        icoVerts.push([s2 * PHI, 0, s1]);
      }

      const headStart = points.length;
      const norm = Math.hypot(1, PHI);
      for (const [x, y, z] of icoVerts){
        points.push({
          x: (x / norm) * headR,
          y: (y / norm) * headR * STRETCH + 62,
          z: (z / norm) * headR,
          r: 6, color: '#b3e5fc',
        });
      }

      // الحواف الثلاثون: تُحدَّد من المسافة على الشكل المنتظم قبل التمديد
      const edgeLen = (2 / norm) * headR;
      for (let i = 0; i < icoVerts.length; i++){
        for (let j = i + 1; j < icoVerts.length; j++){
          const d = Math.hypot(
            (icoVerts[i][0] - icoVerts[j][0]) / norm * headR,
            (icoVerts[i][1] - icoVerts[j][1]) / norm * headR,
            (icoVerts[i][2] - icoVerts[j][2]) / norm * headR,
          );
          if (Math.abs(d - edgeLen) < edgeLen * 0.05){
            bonds.push({ a: headStart + i, b: headStart + j, color: '#5bb9e8', width: 2.8 });
          }
        }
      }

      // الياقة والغمد المنقبض — حلقات متتابعة
      let previousRing = null;
      for (let ring = 0; ring < 9; ring++){
        const y = 14 - ring * 8;
        const ringPoints = [];
        for (let i = 0; i < 6; i++){
          const angle = (i / 6) * Math.PI * 2 + ring * .18;
          ringPoints.push(points.push({
            x: Math.cos(angle) * 11, y, z: Math.sin(angle) * 11,
            r: 3.4, color: '#4dd0e1',
          }) - 1);
        }
        for (let i = 0; i < 6; i++){
          bonds.push({ a: ringPoints[i], b: ringPoints[(i + 1) % 6], color: '#3aa7d8', width: 2 });
          if (previousRing) bonds.push({ a: previousRing[i], b: ringPoints[i], color: '#3aa7d8', width: 2 });
        }
        previousRing = ringPoints;
      }

      // الصفيحة القاعدية سداسية
      const plate = [];
      for (let i = 0; i < 6; i++){
        const angle = (i / 6) * Math.PI * 2;
        plate.push(points.push({
          x: Math.cos(angle) * 17, y: -60, z: Math.sin(angle) * 17,
          r: 4.6, color: '#ffd54f',
        }) - 1);
      }
      for (let i = 0; i < 6; i++){
        bonds.push({ a: plate[i], b: plate[(i + 1) % 6], color: '#ffb300', width: 3 });
      }

      // ستّ ألياف ذيلية — العدد الحقيقي
      for (let i = 0; i < 6; i++){
        const angle = (i / 6) * Math.PI * 2;
        const knee = points.push({
          x: Math.cos(angle) * 34, y: -76, z: Math.sin(angle) * 34,
          r: 3, color: '#a5d6a7',
        }) - 1;
        const foot = points.push({
          x: Math.cos(angle) * 44, y: -100, z: Math.sin(angle) * 44,
          r: 3.4, color: '#a5d6a7',
        }) - 1;
        bonds.push({ a: plate[i], b: knee, color: '#81c784', width: 2.6 });
        bonds.push({ a: knee, b: foot, color: '#81c784', width: 2.6 });
      }

      return { points, bonds };
    },
  },

  /* ---------------- الخلية الحيوانية ----------------
     النِّسَب مأخوذة من خلية بشرية نموذجية بقطر ≈ 20 ميكرومتر:
     • النواة ≈ 6 ميكرومتر — نحو 10٪ من حجم الخلية
     • الميتوكوندريا 0.5–1 × 1–2 ميكرومتر، مئات إلى آلاف
     • الريبوسومات ≈ 25 نانومتر، ملايين
     ---------------------------------------------------- */
  cell: {
    label: 'الخلية الحيوانية',
    latin: 'Animal cell',
    icon: '🔵',
    blurb: 'النِّسَب هنا مقيسة لا تقديرية: النواة تشغل نحو عُشر الحجم، والميتوكوندريا كبسولات لا كرات.',
    parts: [
      { color: '#4dd0e1', label: 'الغشاء البلازمي' },
      { color: '#b388ff', label: 'النواة والنوية' },
      { color: '#ffab40', label: 'الميتوكوندريا' },
      { color: '#69f0ae', label: 'الريبوسومات' },
      { color: '#ff8a80', label: 'الشبكة الإندوبلازمية' },
    ],
    specs: [
      { label: 'قطر الخلية', value: '10 – 30 ميكرومتر' },
      { label: 'قطر النواة', value: '≈ 6 ميكرومتر (نحو 10٪ من الحجم)' },
      { label: 'الميتوكوندريا', value: '0.5 – 1 × 1 – 2 ميكرومتر' },
      { label: 'عددها', value: 'من مئات إلى آلاف حسب نوع الخلية' },
      { label: 'قطر الريبوسوم', value: '≈ 25 نانومتر' },
      { label: 'سُمك الغشاء', value: '≈ 7 – 8 نانومتر' },
    ],
    sources: [
      { label: 'Molecular Biology of the Cell — Alberts et al.', url: 'https://www.ncbi.nlm.nih.gov/books/NBK21054/' },
      { label: 'Molecular Cell Biology — Lodish et al.', url: 'https://www.ncbi.nlm.nih.gov/books/NBK21475/' },
    ],
    build(){
      const points = [], bonds = [];
      const RADIUS = 76;

      // الغشاء البلازمي
      for (let i = 0; i < 280; i++){
        const y = 1 - (i / 279) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * RADIUS,
          y: y * RADIUS,
          z: Math.sin(theta) * r * RADIUS,
          r: 2.5, color: '#4dd0e1', alpha: .42,
        });
      }

      // النواة — قطرها نحو 30٪ من قطر الخلية (≈ 10٪ من الحجم)
      const nucleusR = RADIUS * .3;
      for (let i = 0; i < 150; i++){
        const y = 1 - (i / 149) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * 2.399963;
        points.push({
          x: Math.cos(theta) * r * nucleusR - 8,
          y: y * nucleusR + 5,
          z: Math.sin(theta) * r * nucleusR,
          r: 3.4, color: '#b388ff', alpha: .92,
        });
      }
      points.push({ x: -8, y: 5, z: 0, r: 11, color: '#7c4dff', alpha: 1 });   // النوية

      // الميتوكوندريا — كبسولات مطاولة بنسبة الطول إلى العرض ≈ 2:1
      const mitoSpots = [
        { x:  42, y: -28, z:  16, angle:  .6 },
        { x: -46, y:  32, z: -20, angle: -.9 },
        { x:  16, y:  48, z:  28, angle:  1.4 },
        { x: -22, y: -48, z:  32, angle:  .2 },
        { x:  48, y:  12, z: -36, angle: -.4 },
        { x: -12, y:  -8, z: -52, angle:  1.1 },
      ];
      for (const spot of mitoSpots){
        let previous = null;
        for (let i = 0; i < 8; i++){
          const offset = (i - 3.5) * 5.2;
          const index = points.push({
            x: spot.x + Math.cos(spot.angle) * offset,
            y: spot.y + Math.sin(spot.angle) * offset,
            z: spot.z,
            r: 5.4 - Math.abs(i - 3.5) * .45,
            color: '#ffab40', alpha: 1,
          }) - 1;
          if (previous !== null) bonds.push({ a: previous, b: index, color: '#ff8f00', width: 4.2 });
          previous = index;
        }
      }

      // الشبكة الإندوبلازمية — أغشية مطوية حول النواة
      for (let sheet = 0; sheet < 3; sheet++){
        let previous = null;
        for (let i = 0; i < 26; i++){
          const t = (i / 26) * Math.PI * 2;
          const rr = 40 + sheet * 8;
          const index = points.push({
            x: Math.cos(t) * rr - 8,
            y: Math.sin(t * 2) * 9 + (sheet - 1) * 14 + 5,
            z: Math.sin(t) * rr,
            r: 2.2, color: '#ff8a80', alpha: .7,
          }) - 1;
          if (previous !== null) bonds.push({ a: previous, b: index, color: '#e06b62', width: 1.8 });
          previous = index;
        }
      }

      // الريبوسومات
      for (let i = 0; i < 54; i++){
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 32 + Math.random() * 38;
        points.push({
          x: Math.sin(phi) * Math.cos(theta) * r,
          y: Math.cos(phi) * r,
          z: Math.sin(phi) * Math.sin(theta) * r,
          r: 2.2, color: '#69f0ae', alpha: .9,
        });
      }

      return { points, bonds };
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

            <h3 class="lab3d__legend-title">القياسات المعتمدة</h3>
            <dl class="lab3d__specs" id="specs"></dl>

            <h3 class="lab3d__legend-title">المصادر</h3>
            <ul class="lab3d__sources" id="sources3d"></ul>

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
              النِّسَب والأعداد أعلاه مأخوذة من القياسات المنشورة وطُبِّقت في بناء النموذج.
              التمثيل هندسي للبنية لا إحداثيات ذرية — افتح رابط البنية في PDB لعرض الذرّات.
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
        // نطرح لأن محور Y في اللوحة يتّجه لأسفل، ونريد الموجب لأعلى
        // كما في الاصطلاح العلمي (رأس العاثية فوق، أرجلها تحت)
        y: height / 2 - y2 * depth * scale,
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

    $('#specs', outlet).innerHTML = render(html`
      ${(model.specs ?? []).map((spec) => html`
        <div class="lab3d__spec">
          <dt>${spec.label}</dt>
          <dd class="mono">${spec.value}</dd>
        </div>
      `)}
    `);

    $('#sources3d', outlet).innerHTML = render(html`
      ${(model.sources ?? []).map((source) => html`
        <li>
          <a class="lab3d__source" href="${source.url}" target="_blank" rel="noopener noreferrer">
            ${source.label}
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
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
