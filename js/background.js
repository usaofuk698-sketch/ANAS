/* =========================================================
   ANAS — محرّك الخلفية السينمائية
   انزياح الطبقات (parallax) + جزيئات على canvas.
   مبني على الواجهة التجريبية الأصلية مع إضافات:
   خفض تلقائي للجودة على الأجهزة الضعيفة، إيقاف عند إخفاء
   التبويب، واحترام تفضيل تقليل الحركة.
   ========================================================= */

import { CONFIG } from './config.js';
import { clamp } from './ui.js';
import { read, write } from './store.js';

const MOTION_KEY = 'motion-paused';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let paused = false;
let hiddenTab = false;
let rafParallax = null;
let rafParticles = null;

export function initBackground(){
  const cinema = document.getElementById('cinema');
  const canvas = document.getElementById('particles');
  if (!cinema || !canvas) return;

  paused = read(MOTION_KEY, false) || reduceMotion.matches;
  applyPausedState();

  initParallax(cinema);
  initParticles(canvas);
  initMotionToggle();

  document.addEventListener('visibilitychange', () => {
    hiddenTab = document.hidden;
    // لا نرسم شيئاً والتبويب مخفي — توفير للبطارية
  });

  reduceMotion.addEventListener('change', (event) => {
    if (event.matches) setPaused(true);
  });
}

/* ---------------------------------------------------------
   انزياح الطبقات مع حركة المؤشّر أو ميل الجهاز
   --------------------------------------------------------- */
function initParallax(cinema){
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  const setTarget = (x, y) => {
    targetX = (x / innerWidth - .5) * 2;
    targetY = (y / innerHeight - .5) * 2;
  };

  addEventListener('pointermove', (event) => setTarget(event.clientX, event.clientY), { passive: true });

  addEventListener('deviceorientation', (event) => {
    if (event.gamma == null) return;
    targetX = clamp(event.gamma / 28, -1, 1);
    targetY = clamp((event.beta - 45) / 34, -1, 1);
  }, { passive: true });

  const tick = () => {
    if (!paused && !hiddenTab){
      currentX += (targetX - currentX) * .035;
      currentY += (targetY - currentY) * .035;
      cinema.style.setProperty('--mx', currentX.toFixed(3));
      cinema.style.setProperty('--my', currentY.toFixed(3));
      // تُستخدم في رسم الجزيئات لمزامنة الانزياح
      parallaxState.x = currentX;
      parallaxState.y = currentY;
    }
    rafParallax = requestAnimationFrame(tick);
  };
  tick();
}

const parallaxState = { x: 0, y: 0 };

/* ---------------------------------------------------------
   الجزيئات الطافية
   --------------------------------------------------------- */
function initParticles(canvas){
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0, height = 0, particles = [];

  // خفض الكثافة على الأجهزة محدودة الإمكانات
  const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4
    || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const densityDivisor = CONFIG.visuals.particleDensityDivisor * (lowPower ? 2.1 : 1);
  const maxParticles = lowPower ? 55 : CONFIG.visuals.maxParticles;

  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, CONFIG.visuals.maxDevicePixelRatio);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(maxParticles, Math.round((width * height) / densityDivisor));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: .25 + Math.random() * .9,
      r: .35 + Math.random() * 1.5,
      vx: (Math.random() - .5) * .055,
      vy: -.025 - Math.random() * .095,
      phase: Math.random() * 6.28,
      twinkle: .006 + Math.random() * .018,
      alpha: .08 + Math.random() * .48,
    }));
  }

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 140);
  }, { passive: true });

  resize();

  function draw(){
    rafParticles = requestAnimationFrame(draw);
    if (hiddenTab) return;

    ctx.clearRect(0, 0, width, height);
    if (paused){
      // نرسم الجزيئات ساكنة بدل إخفائها
      drawParticles(ctx, particles, 0, 0, false);
      return;
    }

    for (const p of particles){
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;
      p.phase += p.twinkle;

      if (p.y < -8){ p.y = height + 8; p.x = Math.random() * width; }
      if (p.x < -8) p.x = width + 8;
      if (p.x > width + 8) p.x = -8;
    }

    drawParticles(ctx, particles, parallaxState.x, parallaxState.y, true);
  }

  draw();
}

function drawParticles(ctx, particles, offsetX, offsetY, twinkling){
  ctx.shadowColor = 'rgba(66, 180, 255, .7)';
  for (const p of particles){
    const alpha = twinkling ? p.alpha * (.6 + .4 * Math.sin(p.phase)) : p.alpha * .8;
    ctx.beginPath();
    ctx.arc(p.x + offsetX * 8 * p.z, p.y + offsetY * 5 * p.z, p.r * p.z, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(135, 218, 255, ${alpha})`;
    ctx.shadowBlur = 12 * p.z;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

/* ---------------------------------------------------------
   زر إيقاف الحركة
   --------------------------------------------------------- */
const PLAY_ICON  = '<path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor"/>';
const PAUSE_ICON = '<rect x="6" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.4" fill="currentColor"/>';

function initMotionToggle(){
  const button = document.getElementById('motionToggle');
  if (!button) return;

  const sync = () => {
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paused ? PLAY_ICON : PAUSE_ICON}</svg>`;
    button.setAttribute('aria-label', paused ? 'تشغيل الحركة' : 'إيقاف الحركة');
    button.setAttribute('title', paused ? 'تشغيل الحركة' : 'إيقاف الحركة');
    button.classList.toggle('is-on', paused);
  };

  button.addEventListener('click', () => { setPaused(!paused); sync(); });
  sync();
}

function setPaused(value){
  paused = value;
  write(MOTION_KEY, value);
  applyPausedState();
}

function applyPausedState(){
  document.body.classList.toggle('motion-paused', paused);
}

export const isMotionPaused = () => paused;

/** يضبط شدّة إعتام الخلفية: 0 للصفحة الرئيسية، 1 للصفحات الداخلية */
export function setCinemaDim(value){
  document.documentElement.style.setProperty('--cinema-dim', String(clamp(value, 0, 1)));
}

/** ينظّف حلقات الرسم (يُستخدم عند إنهاء الصفحة) */
export function stopBackground(){
  if (rafParallax) cancelAnimationFrame(rafParallax);
  if (rafParticles) cancelAnimationFrame(rafParticles);
}
