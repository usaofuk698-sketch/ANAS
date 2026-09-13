/* =========================================================
   ANAS — الحسابات والجلسات والتقدّم

   ⚠️  حدود هذه النسخة (اقرأها جيداً قبل النشر الحقيقي):
   لا يوجد خادم، لذا تُحفظ الحسابات في متصفح المستخدم نفسه.
   كلمات المرور تُخزَّن كبصمة SHA-256 مع مِلح عشوائي — وهذا
   أفضل من النص الصريح، لكنه **ليس أماناً حقيقياً**: أي شخص
   يصل إلى الجهاز يستطيع قراءة التخزين المحلي، ولا توجد حماية
   من هجمات التخمين. لا تستخدم هذه النسخة لبيانات حساسة.

   للأمان الحقيقي: حوّل CONFIG.auth.mode إلى 'server' واربط
   خادماً يتحقق من الهوية ويخزّن كلمات المرور بـ bcrypt/argon2.
   ========================================================= */

import { read, write, remove, subscribe } from './store.js';
import { CONFIG, rankForLevel } from './config.js';
import { uid } from './ui.js';

const USERS_KEY   = 'users';
const SESSION_KEY = 'session';

/* ---------------------------------------------------------
   تجزئة كلمة المرور
   --------------------------------------------------------- */

function randomSalt(){
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** بصمة بسيطة احتياطية عندما لا يتوفّر crypto.subtle (سياق غير آمن) */
function fallbackHash(text){
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++){
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + code, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
}

async function hashPassword(password, salt){
  const payload = `anas:v1:${salt}:${password}`;
  if (globalThis.crypto?.subtle){
    try {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch { /* نسقط إلى الاحتياطي */ }
  }
  return fallbackHash(payload);
}

/** مقارنة بزمن ثابت تقريباً لتقليل تسريب المعلومات */
function safeEqual(a = '', b = ''){
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------------------------------------------------------
   التحقق من المدخلات
   --------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function validateName(name){
  const value = String(name ?? '').trim();
  if (!value) return 'الاسم مطلوب';
  if (value.length < 2) return 'الاسم قصير جداً';
  if (value.length > 60) return 'الاسم طويل جداً';
  return null;
}

export function validateEmail(email){
  const value = String(email ?? '').trim();
  if (!value) return 'البريد الإلكتروني مطلوب';
  if (!EMAIL_RE.test(value)) return 'صيغة البريد الإلكتروني غير صحيحة';
  return null;
}

export function validatePassword(password){
  const value = String(password ?? '');
  const min = CONFIG.auth.minPasswordLength;
  if (!value) return 'كلمة المرور مطلوبة';
  if (value.length < min) return `كلمة المرور يجب ألا تقل عن ${min} أحرف`;
  if (!/[a-zء-ي]/i.test(value) || !/\d/.test(value)) return 'أضف حرفاً ورقماً على الأقل';
  return null;
}

/** يقيس قوة كلمة المرور من 0 إلى 4 */
export function passwordStrength(password){
  const value = String(password ?? '');
  if (!value) return { score: 0, label: '' };

  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Zء-ي]/.test(value) && /[a-z0-9]/.test(value)) score++;
  if (/[^\w\s]/.test(value)) score++;
  if (/^(.)\1+$/.test(value)) score = 1;

  score = Math.min(4, score);
  const labels = ['', 'ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية'];
  return { score, label: labels[score] };
}

/* ---------------------------------------------------------
   قراءة المستخدمين
   --------------------------------------------------------- */

const allUsers = () => read(USERS_KEY, []);
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

/** يبني ملف تقدّم فارغ لمستخدم جديد */
function emptyProgress(){
  return {
    xp: 0,
    viewed: [],        // معرّفات العيّنات المُشاهَدة
    saved: [],         // العيّنات المحفوظة
    microscopeSessions: 0,
    modelsExplored: [],
    quizCorrect: 0,
    quizAnswered: 0,
    activity: [],      // آخر الأنشطة
  };
}

/** يزيل الحقول الحساسة قبل تسليم المستخدم للواجهة */
function publicUser(user){
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

/* ---------------------------------------------------------
   التسجيل والدخول
   --------------------------------------------------------- */

export async function register({ name, email, password }){
  const nameError  = validateName(name);
  const emailError = validateEmail(email);
  const passError  = validatePassword(password);
  if (nameError)  throw new Error(nameError);
  if (emailError) throw new Error(emailError);
  if (passError)  throw new Error(passError);

  if (CONFIG.auth.mode === 'server') return serverAuth('register', { name, email, password });

  const users = allUsers();
  const normalized = normalizeEmail(email);
  if (users.some((u) => u.email === normalized)){
    throw new Error('هذا البريد الإلكتروني مسجَّل بالفعل');
  }

  const salt = randomSalt();
  const user = {
    id: uid('usr'),
    name: String(name).trim(),
    email: normalized,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: Date.now(),
    bio: '',
    interest: 'general',
    progress: emptyProgress(),
  };

  write(USERS_KEY, [...users, user]);
  startSession(user.id);
  logActivity('انضممت إلى منصة ANAS 🎉');
  return publicUser(user);
}

export async function login({ email, password }){
  if (!String(email ?? '').trim()) throw new Error('البريد الإلكتروني مطلوب');
  if (!String(password ?? ''))     throw new Error('كلمة المرور مطلوبة');

  if (CONFIG.auth.mode === 'server') return serverAuth('login', { email, password });

  const normalized = normalizeEmail(email);
  const user = allUsers().find((u) => u.email === normalized);

  // نحسب البصمة في الحالتين حتى لا يكشف الفرق الزمني وجود الحساب
  const candidate = await hashPassword(password, user?.salt ?? 'missing');
  if (!user || !safeEqual(candidate, user.passwordHash)){
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  startSession(user.id);
  return publicUser(user);
}

/** مسار الخادم الحقيقي — يُفعَّل عند CONFIG.auth.mode === 'server' */
async function serverAuth(action, payload){
  const base = CONFIG.auth.apiBaseUrl.replace(/\/$/, '');
  if (!base) throw new Error('لم يتم ضبط عنوان الخادم في js/config.js');

  const response = await fetch(`${base}/auth/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'تعذّر إتمام العملية');

  write(SESSION_KEY, { userId: data.user.id, token: data.token, expiresAt: sessionExpiry() });
  write(USERS_KEY, [...allUsers().filter((u) => u.id !== data.user.id), { ...data.user, progress: data.user.progress ?? emptyProgress() }]);
  return data.user;
}

const sessionExpiry = () => Date.now() + CONFIG.auth.sessionDays * 86400000;

function startSession(userId){
  write(SESSION_KEY, { userId, expiresAt: sessionExpiry() });
}

export function logout(){
  remove(SESSION_KEY);
}

/* ---------------------------------------------------------
   المستخدم الحالي
   --------------------------------------------------------- */

export function currentUser(){
  const session = read(SESSION_KEY);
  if (!session?.userId) return null;

  if (session.expiresAt && Date.now() > session.expiresAt){
    remove(SESSION_KEY);
    return null;
  }

  return publicUser(allUsers().find((u) => u.id === session.userId));
}

export const isLoggedIn = () => currentUser() !== null;

/** يعدّل بيانات المستخدم الحالي عبر دالة تحويل */
export function updateUser(mutate){
  const session = read(SESSION_KEY);
  if (!session?.userId) return null;

  const users = allUsers();
  const index = users.findIndex((u) => u.id === session.userId);
  if (index === -1) return null;

  const updated = { ...users[index], ...mutate(users[index]) };
  users[index] = updated;
  write(USERS_KEY, users);
  return publicUser(updated);
}

export async function changePassword({ currentPassword, newPassword }){
  const session = read(SESSION_KEY);
  const users = allUsers();
  const index = users.findIndex((u) => u.id === session?.userId);
  if (index === -1) throw new Error('لا توجد جلسة نشطة');

  const user = users[index];
  const candidate = await hashPassword(currentPassword, user.salt);
  if (!safeEqual(candidate, user.passwordHash)) throw new Error('كلمة المرور الحالية غير صحيحة');

  const passError = validatePassword(newPassword);
  if (passError) throw new Error(passError);

  const salt = randomSalt();
  users[index] = { ...user, salt, passwordHash: await hashPassword(newPassword, salt) };
  write(USERS_KEY, users);
  logActivity('غيّرت كلمة المرور');
  return true;
}

export function deleteAccount(){
  const session = read(SESSION_KEY);
  if (!session?.userId) return;
  write(USERS_KEY, allUsers().filter((u) => u.id !== session.userId));
  remove(SESSION_KEY);
}

/* ---------------------------------------------------------
   التقدّم — XP، المستويات، الحفظ، النشاط
   --------------------------------------------------------- */

export function getProgress(){
  return currentUser()?.progress ?? emptyProgress();
}

function saveProgress(mutate){
  return updateUser((user) => {
    const progress = { ...emptyProgress(), ...user.progress };
    return { progress: mutate(progress) ?? progress };
  });
}

export function addXP(amount, reason){
  saveProgress((progress) => {
    progress.xp += amount;
    return progress;
  });
  if (reason) logActivity(reason, amount);
}

export function levelInfo(xp = getProgress().xp){
  const per = CONFIG.progress.xpPerLevel;
  const level = Math.floor(xp / per) + 1;
  const intoLevel = xp % per;
  return {
    level,
    xp,
    intoLevel,
    needed: per,
    percent: Math.round((intoLevel / per) * 100),
    rank: rankForLevel(level),
  };
}

/** يسجّل مشاهدة عيّنة (مرة واحدة فقط لكل عيّنة) */
export function markViewed(specimenId){
  if (!isLoggedIn()) return false;
  const progress = getProgress();
  if (progress.viewed.includes(specimenId)) return false;

  saveProgress((p) => {
    p.viewed = [...p.viewed, specimenId];
    p.xp += CONFIG.progress.xpPerSpecimenViewed;
    return p;
  });
  return true;
}

export function isSaved(specimenId){
  return getProgress().saved.includes(specimenId);
}

/** يبدّل حالة حفظ العيّنة ويعيد الحالة الجديدة */
export function toggleSaved(specimenId){
  if (!isLoggedIn()) return null;
  const wasSaved = isSaved(specimenId);

  saveProgress((p) => {
    p.saved = wasSaved ? p.saved.filter((id) => id !== specimenId) : [...p.saved, specimenId];
    if (!wasSaved) p.xp += CONFIG.progress.xpPerSpecimenSaved;
    return p;
  });

  return !wasSaved;
}

export function recordMicroscopeSession(){
  if (!isLoggedIn()) return;
  saveProgress((p) => {
    p.microscopeSessions++;
    p.xp += CONFIG.progress.xpPerMicroscopeSession;
    return p;
  });
  logActivity('أجريت جلسة في المجهر الافتراضي', CONFIG.progress.xpPerMicroscopeSession);
}

export function recordModelExplored(modelKey){
  if (!isLoggedIn()) return;
  const progress = getProgress();
  if (progress.modelsExplored.includes(modelKey)) return;

  saveProgress((p) => {
    p.modelsExplored = [...p.modelsExplored, modelKey];
    p.xp += CONFIG.progress.xpPerModelExplored;
    return p;
  });
  logActivity('استكشفت نموذجاً ثلاثي الأبعاد جديداً', CONFIG.progress.xpPerModelExplored);
}

export function recordQuizAnswer(correct){
  if (!isLoggedIn()) return;
  saveProgress((p) => {
    p.quizAnswered++;
    if (correct){
      p.quizCorrect++;
      p.xp += CONFIG.progress.xpPerQuizCorrect;
    }
    return p;
  });
}

export function logActivity(text, xp = 0){
  if (!isLoggedIn()) return;
  saveProgress((p) => {
    p.activity = [{ id: uid('act'), text, xp, at: Date.now() }, ...p.activity].slice(0, 40);
    return p;
  });
}

/* ---------------------------------------------------------
   الأوسمة
   --------------------------------------------------------- */

export const BADGES = [
  { key: 'first-step', icon: '🚀', label: 'الخطوة الأولى',   desc: 'أنشأت حسابك على المنصة',        test: () => true },
  { key: 'curious',    icon: '🔍', label: 'فضولي',            desc: 'شاهدت ٥ عيّنات مختلفة',          test: (p) => p.viewed.length >= 5 },
  { key: 'collector',  icon: '📚', label: 'جامع العيّنات',    desc: 'حفظت ٥ عيّنات في مكتبتك',        test: (p) => p.saved.length >= 5 },
  { key: 'microscope', icon: '🔬', label: 'عين المجهر',       desc: 'أكملت ٣ جلسات مجهر افتراضي',     test: (p) => p.microscopeSessions >= 3 },
  { key: 'dimension',  icon: '🧬', label: 'البُعد الثالث',    desc: 'استكشفت كل النماذج ثلاثية الأبعاد', test: (p) => p.modelsExplored.length >= 3 },
  { key: 'scholar',    icon: '🎓', label: 'عالِم صغير',       desc: 'أجبت ١٠ أسئلة صحيحة',            test: (p) => p.quizCorrect >= 10 },
  { key: 'explorer',   icon: '🌌', label: 'مستكشِف الأعماق',  desc: 'شاهدت ١٥ عيّنة',                 test: (p) => p.viewed.length >= 15 },
  { key: 'veteran',    icon: '⭐', label: 'مخضرم',            desc: 'وصلت إلى المستوى ٥',             test: (p) => levelInfo(p.xp).level >= 5 },
];

export function earnedBadges(progress = getProgress()){
  return BADGES.map((badge) => ({ ...badge, earned: badge.test(progress) }));
}

/* ---------------------------------------------------------
   الاشتراك في تغيّر حالة المصادقة
   --------------------------------------------------------- */

export function onAuthChange(handler){
  const unsubSession = subscribe(SESSION_KEY, () => handler(currentUser()));
  const unsubUsers   = subscribe(USERS_KEY,   () => handler(currentUser()));
  return () => { unsubSession(); unsubUsers(); };
}
