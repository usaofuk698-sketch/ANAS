/* =========================================================
   ANAS — طبقة التخزين
   غلاف حول localStorage مع اشتراكات تغيير بسيطة.

   ملاحظة مهمة: كل البيانات تُحفظ على جهاز المستخدم فقط.
   لا يوجد خادم في هذه النسخة — راجع js/config.js عند الربط
   بخادم حقيقي لاحقاً.
   ========================================================= */

const PREFIX = 'anas:';

/** هل التخزين المحلي متاح؟ (وضع التصفح الخاص قد يمنعه) */
const available = (() => {
  try {
    const probe = PREFIX + '__probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
})();

/** نسخة احتياطية في الذاكرة إذا مُنع التخزين المحلي */
const memory = new Map();

export function read(key, fallback = null){
  try {
    const value = available ? localStorage.getItem(PREFIX + key) : memory.get(PREFIX + key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function write(key, value){
  const serialized = JSON.stringify(value);
  try {
    if (available) localStorage.setItem(PREFIX + key, serialized);
    else memory.set(PREFIX + key, serialized);
  } catch {
    // تجاوز الحصة التخزينية — نحتفظ بالقيمة في الذاكرة على الأقل
    memory.set(PREFIX + key, serialized);
  }
  emit(key, value);
  return value;
}

export function remove(key){
  try {
    if (available) localStorage.removeItem(PREFIX + key);
    memory.delete(PREFIX + key);
  } catch { /* تجاهل */ }
  emit(key, null);
}

/** يمسح كل بيانات المنصة دون المساس ببيانات مواقع أخرى */
export function clearAll(){
  try {
    if (available){
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
    memory.clear();
  } catch { /* تجاهل */ }
}

export const storageAvailable = available;

/* ---------- اشتراكات التغيير ---------- */
const listeners = new Map();

function emit(key, value){
  listeners.get(key)?.forEach((fn) => {
    try { fn(value); } catch (error) { console.error('[store] listener failed', error); }
  });
}

export function subscribe(key, handler){
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(handler);
  return () => listeners.get(key)?.delete(handler);
}

// مزامنة بين تبويبات المتصفح المفتوحة
window.addEventListener('storage', (event) => {
  if (!event.key?.startsWith(PREFIX)) return;
  const key = event.key.slice(PREFIX.length);
  let value = null;
  try { value = event.newValue == null ? null : JSON.parse(event.newValue); } catch { /* تجاهل */ }
  emit(key, value);
});
