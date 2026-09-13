/* =========================================================
   ANAS — تسجيل الدخول وإنشاء الحساب
   ========================================================= */

import { html, raw, render, $, toast } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { navigate } from '../router.js';
import {
  login, register, currentUser, updateUser,
  validateName, validateEmail, validatePassword, passwordStrength,
} from '../auth.js';

/** يحفظ اهتمام المستخدم المختار عند التسجيل */
function updateInterest(interest){
  updateUser(() => ({ interest }));
}

const EYE_OPEN  = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>';
const EYE_SHUT  = '<path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4M6.6 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5c.9 0 1.7-.1 2.5-.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';

/** لوحة جانبية مشتركة بين الصفحتين */
function asidePanel(){
  return html`
    <aside class="auth__aside">
      <div class="auth__aside-inner">
        <span class="eyebrow"><span class="eyebrow__dot"></span> حساب المستكشِف</span>
        <h2 class="auth__aside-title">تقدّمك محفوظ، ورحلتك تكمل من حيث توقّفت.</h2>
        <ul class="auth__perks">
          <li><span aria-hidden="true">🔖</span> احفظ العيّنات التي تهمّك في مكتبتك الخاصة</li>
          <li><span aria-hidden="true">⚡</span> اجمع نقاط خبرة وارتقِ في المستويات</li>
          <li><span aria-hidden="true">🏅</span> افتح أوسمة كلما تعمّقت في الاستكشاف</li>
          <li><span aria-hidden="true">📊</span> تابع إحصاءات ما شاهدته وما تعلّمته</li>
        </ul>
        <p class="auth__note">
          <strong>ملاحظة:</strong> هذه نسخة تعمل داخل المتصفح — بياناتك محفوظة على جهازك وحده ولا تُرسل إلى أي خادم.
          لا تستخدم كلمة مرور تستعملها في مواقع أخرى.
        </p>
      </div>
    </aside>`;
}

/** يعرض رسالة خطأ أسفل حقل */
function setError(form, field, message){
  const box = $(`[data-error="${field}"]`, form);
  const input = $(`[name="${field}"]`, form);
  if (box) box.textContent = message ?? '';
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

/** يفعّل أزرار إظهار/إخفاء كلمة المرور */
function wirePasswordToggles(root){
  root.querySelectorAll('[data-toggle-pass]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $(`[name="${button.dataset.togglePass}"]`, root);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${show ? EYE_SHUT : EYE_OPEN}</svg>`;
      button.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    });
  });
}

/** يمنع الدخول للصفحة إذا كان المستخدم مسجّلاً بالفعل */
function bounceIfLoggedIn(){
  if (currentUser()){
    navigate('/account', { replace: true });
    return true;
  }
  return false;
}

/* =========================================================
   تسجيل الدخول
   ========================================================= */
export function loginView({ outlet }){
  setCinemaDim(1);
  if (bounceIfLoggedIn()) return;

  outlet.innerHTML = render(html`
    <section class="section auth">
      <div class="wrap auth__grid">
        <div class="panel auth__card">
          <h1 class="auth__title">تسجيل الدخول</h1>
          <p class="auth__sub">أهلاً بعودتك — تابع رحلتك في العالم المجهري.</p>

          <form class="auth__form" id="loginForm" novalidate>
            <div class="field">
              <label class="field__label" for="loginEmail">البريد الإلكتروني <span class="req">*</span></label>
              <input class="input latin" id="loginEmail" name="email" type="email"
                     autocomplete="email" placeholder="name@example.com" dir="ltr" required />
              <p class="field__error" data-error="email"></p>
            </div>

            <div class="field">
              <label class="field__label" for="loginPassword">كلمة المرور <span class="req">*</span></label>
              <div class="input-group">
                <input class="input" id="loginPassword" name="password" type="password"
                       autocomplete="current-password" placeholder="••••••••" required />
                <button class="input-group__btn" type="button" data-toggle-pass="password" aria-label="إظهار كلمة المرور">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${raw(EYE_OPEN)}</svg>
                </button>
              </div>
              <p class="field__error" data-error="password"></p>
            </div>

            <button class="btn btn--primary btn--block btn--lg" type="submit" id="loginSubmit">دخول</button>
          </form>

          <p class="auth__switch">
            ليس لديك حساب؟ <a href="#/register">أنشئ حساباً جديداً</a>
          </p>
        </div>

        ${asidePanel()}
      </div>
    </section>
  `);

  const form = $('#loginForm', outlet);
  wirePasswordToggles(outlet);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const valid = [
      setError(form, 'email', validateEmail(data.email)),
      setError(form, 'password', data.password ? null : 'كلمة المرور مطلوبة'),
    ].every(Boolean);
    if (!valid) return;

    const button = $('#loginSubmit', form);
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> جارٍ الدخول…';

    try {
      const user = await login({ email: data.email, password: data.password });
      toast(`أهلاً بعودتك، ${user.name} 👋`, 'ok');
      navigate('/account');
    } catch (error){
      setError(form, 'password', error.message);
      button.disabled = false;
      button.textContent = 'دخول';
    }
  });

  $('#loginEmail', outlet)?.focus();
}

/* =========================================================
   إنشاء حساب
   ========================================================= */
export function registerView({ outlet }){
  setCinemaDim(1);
  if (bounceIfLoggedIn()) return;

  outlet.innerHTML = render(html`
    <section class="section auth">
      <div class="wrap auth__grid">
        <div class="panel auth__card">
          <h1 class="auth__title">إنشاء حساب مستكشِف</h1>
          <p class="auth__sub">مجاني بالكامل — ويبدأ تقدّمك من أول عيّنة تفتحها.</p>

          <form class="auth__form" id="registerForm" novalidate>
            <div class="field">
              <label class="field__label" for="regName">الاسم <span class="req">*</span></label>
              <input class="input" id="regName" name="name" type="text"
                     autocomplete="name" placeholder="اكتب اسمك" required />
              <p class="field__error" data-error="name"></p>
            </div>

            <div class="field">
              <label class="field__label" for="regEmail">البريد الإلكتروني <span class="req">*</span></label>
              <input class="input latin" id="regEmail" name="email" type="email"
                     autocomplete="email" placeholder="name@example.com" dir="ltr" required />
              <p class="field__error" data-error="email"></p>
            </div>

            <div class="field">
              <label class="field__label" for="regPassword">كلمة المرور <span class="req">*</span></label>
              <div class="input-group">
                <input class="input" id="regPassword" name="password" type="password"
                       autocomplete="new-password" placeholder="٨ أحرف على الأقل" required />
                <button class="input-group__btn" type="button" data-toggle-pass="password" aria-label="إظهار كلمة المرور">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${raw(EYE_OPEN)}</svg>
                </button>
              </div>
              <div class="strength" id="strengthBars" aria-hidden="true">
                <span class="strength__bar"></span><span class="strength__bar"></span>
                <span class="strength__bar"></span><span class="strength__bar"></span>
              </div>
              <p class="field__hint" id="strengthLabel">استخدم ٨ أحرف على الأقل مع رقم واحد على الأقل.</p>
              <p class="field__error" data-error="password"></p>
            </div>

            <div class="field">
              <label class="field__label" for="regInterest">ما الذي يثير فضولك أكثر؟</label>
              <select class="select" id="regInterest" name="interest">
                <option value="general">كل شيء في العالم المجهري</option>
                <option value="bacteria">البكتيريا والميكروبات</option>
                <option value="virus">الفيروسات والمناعة</option>
                <option value="cell">الخلايا وعلم الأنسجة</option>
                <option value="genetics">الوراثة والحمض النووي</option>
              </select>
            </div>

            <label class="checkbox">
              <input type="checkbox" name="agree" />
              <span>أفهم أن هذه نسخة تجريبية تحفظ بياناتي في متصفحي فقط، ولن أستخدم كلمة مرور مهمة.</span>
            </label>
            <p class="field__error" data-error="agree"></p>

            <button class="btn btn--primary btn--block btn--lg" type="submit" id="registerSubmit">أنشئ الحساب</button>
          </form>

          <p class="auth__switch">
            لديك حساب بالفعل؟ <a href="#/login">سجّل الدخول</a>
          </p>
        </div>

        ${asidePanel()}
      </div>
    </section>
  `);

  const form = $('#registerForm', outlet);
  wirePasswordToggles(outlet);

  // مؤشّر قوة كلمة المرور
  const passwordInput = $('#regPassword', form);
  const bars = $('#strengthBars', form);
  const label = $('#strengthLabel', form);
  passwordInput.addEventListener('input', () => {
    const { score, label: text } = passwordStrength(passwordInput.value);
    [...bars.children].forEach((bar, i) => {
      bar.className = 'strength__bar' + (i < score ? ` on-${score}` : '');
    });
    label.textContent = passwordInput.value
      ? `قوة كلمة المرور: ${text}`
      : 'استخدم ٨ أحرف على الأقل مع رقم واحد على الأقل.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const valid = [
      setError(form, 'name', validateName(data.name)),
      setError(form, 'email', validateEmail(data.email)),
      setError(form, 'password', validatePassword(data.password)),
      setError(form, 'agree', data.agree ? null : 'يجب الموافقة للمتابعة'),
    ].every(Boolean);
    if (!valid) return;

    const button = $('#registerSubmit', form);
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> جارٍ الإنشاء…';

    try {
      const user = await register({ name: data.name, email: data.email, password: data.password });
      if (data.interest) updateInterest(data.interest);
      toast(`تم إنشاء حسابك، أهلاً بك ${user.name} 🎉`, 'ok');
      navigate('/account');
    } catch (error){
      const field = /بريد/.test(error.message) ? 'email'
                  : /مرور/.test(error.message) ? 'password'
                  : 'name';
      setError(form, field, error.message);
      button.disabled = false;
      button.textContent = 'أنشئ الحساب';
    }
  });

  $('#regName', outlet)?.focus();
}
