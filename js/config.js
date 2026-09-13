/* =========================================================
   ANAS — إعدادات المنصة
   هذا هو الملف الوحيد الذي تعدّله عند الربط بخادم حقيقي.
   ========================================================= */

export const CONFIG = {

  /* ---------------------------------------------------------
     الخادم الخلفي (Backend)
     ---------------------------------------------------------
     النسخة الحالية تعمل بالكامل داخل المتصفح: الحسابات
     والتقدّم محفوظة في localStorage على جهاز المستخدم.

     لربط خادم حقيقي: ضع عنوانه في apiBaseUrl وحوّل
     mode إلى 'server'. عندها ستذهب طلبات التسجيل والدخول
     إلى:  POST {apiBaseUrl}/auth/register
           POST {apiBaseUrl}/auth/login
     --------------------------------------------------------- */
  auth: {
    mode: 'local',          // 'local' | 'server'
    apiBaseUrl: '',         // مثال: 'https://api.example.com'
    minPasswordLength: 8,
    sessionDays: 30,
  },

  /* ---------------------------------------------------------
     المساعد الذكي
     ---------------------------------------------------------
     ⚠️  لا تضع مفتاح API هنا مطلقاً.
     أي مفتاح يوضع في ملفات الواجهة يصبح مكشوفاً لكل زائر
     ويمكن سرقته واستهلاك رصيدك. الطريقة الصحيحة: أنشئ
     خادماً وسيطاً صغيراً يحتفظ بالمفتاح لديه، ثم ضع عنوانه
     في endpoint أدناه.

     يجب أن يستقبل الخادم:
       POST {endpoint}
       { "messages": [ { "role": "user", "content": "..." } ] }
     ويعيد:
       { "reply": "نص الإجابة" }

     ما دام endpoint فارغاً، يعمل المساعد بوضع المعرفة
     المحلية المدمجة (بدون إنترنت).
     --------------------------------------------------------- */
  assistant: {
    endpoint: '',           // مثال: 'https://api.example.com/assistant'
    timeoutMs: 30000,
    maxHistory: 12,
  },

  /* ---------------------------------------------------------
     نظام التقدّم (XP والمستويات)
     --------------------------------------------------------- */
  progress: {
    xpPerSpecimenViewed: 10,
    xpPerSpecimenSaved: 15,
    xpPerQuizCorrect: 25,
    xpPerMicroscopeSession: 20,
    xpPerModelExplored: 20,
    xpPerLevel: 250,
  },

  /* ---------------------------------------------------------
     الأداء
     --------------------------------------------------------- */
  visuals: {
    maxParticles: 120,
    particleDensityDivisor: 13500,
    maxDevicePixelRatio: 2,
  },
};

/** رتب المستكشِف حسب المستوى */
export const RANKS = [
  { min: 0,  key: 'novice',    label: 'مستكشِف مبتدئ',  color: 'cyan'   },
  { min: 3,  key: 'observer',  label: 'مُراقِب مجهري',  color: 'cyan'   },
  { min: 6,  key: 'analyst',   label: 'محلِّل علمي',     color: 'violet' },
  { min: 10, key: 'researcher',label: 'باحث متقدّم',    color: 'violet' },
  { min: 16, key: 'expert',    label: 'خبير الأحياء الدقيقة', color: 'ok' },
];

export function rankForLevel(level){
  return [...RANKS].reverse().find((rank) => level >= rank.min) ?? RANKS[0];
}
