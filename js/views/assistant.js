/* =========================================================
   ANAS — المساعد الذكي

   وضعان:
   • محلي (افتراضي): يجيب من قاعدة معرفة مكتوبة داخل المنصة،
     يعمل بدون إنترنت ودون أي مفتاح API. نُخبر المستخدم بذلك
     صراحةً بدل الإيحاء بأن خلفه نموذجاً لغوياً.
   • خادم: إذا ضُبط CONFIG.assistant.endpoint تُرسل الرسائل
     إلى خادمك الوسيط الذي يحتفظ بالمفتاح بأمان.
   ========================================================= */

import { html, raw, render, escapeHTML, $, $$, toast, uid, delegate } from '../ui.js';
import { setCinemaDim } from '../background.js';
import { CONFIG } from '../config.js';
import { findAnswer, composeAnswer, SUGGESTIONS } from '../data/knowledge.js';
import { read, write } from '../store.js';

const HISTORY_KEY = 'assistant-history';
const usingServer = () => Boolean(CONFIG.assistant.endpoint);

/* ---------------------------------------------------------
   تنسيق نص الإجابة
   --------------------------------------------------------- */

/**
 * يحوّل نصاً مبسّطاً إلى HTML آمن.
 * يدعم **عريض** و [نص](رابط) وقوائم تبدأ بـ •
 * كل شيء يُهرَّب أولاً، ثم نعيد بناء التنسيق المسموح فقط.
 */
function formatMessage(text){
  const safe = escapeHTML(text);

  return safe
    .split('\n\n')
    .map((block) => {
      const lines = block.split('\n');
      const isList = lines.every((line) => line.trim().startsWith('•'));

      const inline = (value) => value
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.+?)\]\((#[^)\s]+)\)/g, '<a href="$2">$1</a>');

      if (isList){
        return '<ul class="chat__list">' +
          lines.map((line) => `<li>${inline(line.replace(/^\s*•\s*/, ''))}</li>`).join('') +
          '</ul>';
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

/* ---------------------------------------------------------
   الاتصال بالخادم (عند ضبطه)
   --------------------------------------------------------- */
async function askServer(messages){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.assistant.timeoutMs);

  try {
    const response = await fetch(CONFIG.assistant.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-CONFIG.assistant.maxHistory) }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`الخادم أعاد الحالة ${response.status}`);

    const data = await response.json();
    if (!data.reply) throw new Error('رد الخادم لا يحتوي على حقل reply');
    return { text: data.reply, links: data.links ?? [] };
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   الصفحة
   ========================================================= */
export default function assistantView({ outlet }){
  setCinemaDim(1);

  let messages = read(HISTORY_KEY, []);
  let busy = false;

  outlet.innerHTML = render(html`
    <section class="section assistant">
      <div class="wrap">
        <header class="section__head" style="max-width:760px">
          <span class="eyebrow"><span class="eyebrow__dot"></span> المساعد الذكي</span>
          <h1 class="section__title" style="margin-top:18px">اسأل عن <span>أي شيء مجهري</span></h1>
          <p class="section__lead">
            اسأل عن كائن، أو مفهوم علمي، أو الفرق بين شيئين — وسأجيبك بلغة مبسّطة مع روابط للعيّنات المرتبطة بسؤالك.
          </p>
        </header>

        ${usingServer() ? '' : html`
          <div class="notice" role="note">
            <span class="notice__icon" aria-hidden="true">ℹ️</span>
            <div>
              <strong>أعمل الآن بوضع المعرفة المحلية.</strong>
              أجيب من مقالات وعيّنات مكتوبة داخل المنصة، ولست متصلاً بنموذج ذكاء اصطناعي.
              لتشغيل مساعد حقيقي، اضبط <code class="latin">assistant.endpoint</code> في ملف
              <code class="latin">js/config.js</code> ليشير إلى خادمك الوسيط.
            </div>
          </div>
        `}

        <div class="chat panel">
          <div class="chat__log" id="chatLog" role="log" aria-live="polite" aria-label="سجل المحادثة"></div>

          <div class="chat__suggestions" id="suggestions">
            ${SUGGESTIONS.map((suggestion) => html`
              <button class="chip" type="button" data-suggest="${suggestion}">${suggestion}</button>
            `)}
          </div>

          <form class="chat__composer" id="chatForm">
            <label class="sr-only" for="chatInput">اكتب سؤالك</label>
            <textarea class="textarea chat__input" id="chatInput" rows="1"
                      placeholder="اكتب سؤالك هنا… (Enter للإرسال، Shift+Enter لسطر جديد)"></textarea>
            <button class="btn btn--primary chat__send" type="submit" id="sendBtn" aria-label="إرسال">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:20px;height:20px">
                <path d="M20 12 4 5l2.6 7L4 19l16-7Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
              </svg>
            </button>
          </form>

          <div class="chat__footer">
            <button class="btn btn--ghost btn--sm" type="button" id="clearChat">امسح المحادثة</button>
            <span class="text-dim" style="font-size:12px">المحادثة محفوظة في متصفحك فقط</span>
          </div>
        </div>
      </div>
    </section>
  `);

  const log = $('#chatLog', outlet);
  const form = $('#chatForm', outlet);
  const input = $('#chatInput', outlet);
  const sendBtn = $('#sendBtn', outlet);
  const suggestions = $('#suggestions', outlet);

  /* ------------------- الرسم ------------------- */

  function messageNode({ role, text, links = [], pending = false }){
    if (pending){
      return html`
        <div class="chat__msg chat__msg--bot">
          <span class="chat__avatar" aria-hidden="true">🔬</span>
          <div class="chat__bubble chat__bubble--typing">
            <span></span><span></span><span></span>
          </div>
        </div>`;
    }

    if (role === 'user'){
      return html`
        <div class="chat__msg chat__msg--user">
          <div class="chat__bubble">${text}</div>
        </div>`;
    }

    return html`
      <div class="chat__msg chat__msg--bot">
        <span class="chat__avatar" aria-hidden="true">🔬</span>
        <div class="chat__bubble">
          ${raw(formatMessage(text))}
          ${links.length ? html`
            <div class="chat__links">
              ${links.map((link) => html`<a class="chat__link" href="${link.href}">${link.label} ←</a>`)}
            </div>
          ` : ''}
        </div>
      </div>`;
  }

  function paint(pending = false){
    if (!messages.length && !pending){
      log.innerHTML = render(html`
        <div class="chat__welcome">
          <span class="chat__welcome-icon" aria-hidden="true">🔬</span>
          <h2>مرحباً! أنا مساعد ANAS</h2>
          <p>اسألني عن أي كائن مجهري أو مفهوم علمي، أو اختر أحد الأسئلة المقترحة بالأسفل.</p>
        </div>
      `);
    } else {
      log.innerHTML = render(html`
        ${messages.map(messageNode)}
        ${pending ? messageNode({ pending: true }) : ''}
      `);
    }
    log.scrollTop = log.scrollHeight;
    suggestions.hidden = messages.length > 0;
  }

  /* ------------------- الإرسال ------------------- */

  async function send(question){
    const text = question.trim();
    if (!text || busy) return;

    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    autosize();

    messages.push({ id: uid('m'), role: 'user', text, at: Date.now() });
    paint(true);

    let reply;
    try {
      if (usingServer()){
        reply = await askServer(messages.map(({ role, text }) => ({ role, content: text })));
      } else {
        // تأخير بسيط يجعل الرد يبدو طبيعياً بدل الظهور الفوري
        await new Promise((resolve) => setTimeout(resolve, 340 + Math.random() * 320));
        reply = composeAnswer(text, findAnswer(text));
      }
    } catch (error){
      reply = {
        text: `تعذّر الوصول إلى الخادم: ${error.message}\n\nتحقّق من العنوان في \`js/config.js\`، أو أفرغه للعودة إلى وضع المعرفة المحلية.`,
        links: [],
      };
      toast('فشل الاتصال بخادم المساعد', 'error');
    }

    messages.push({ id: uid('m'), role: 'assistant', ...reply, at: Date.now() });
    messages = messages.slice(-40);
    write(HISTORY_KEY, messages);

    busy = false;
    sendBtn.disabled = false;
    paint();
    input.focus();
  }

  /* ------------------- التفاعل ------------------- */

  function autosize(){
    input.style.height = 'auto';
    input.style.height = Math.min(160, input.scrollHeight) + 'px';
  }

  input.addEventListener('input', autosize);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey){
      event.preventDefault();
      send(input.value);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    send(input.value);
  });

  delegate(suggestions, 'click', '[data-suggest]', (_event, button) => {
    send(button.dataset.suggest);
  });

  $('#clearChat', outlet).addEventListener('click', () => {
    messages = [];
    write(HISTORY_KEY, messages);
    paint();
    toast('تم مسح المحادثة', 'info');
  });

  paint();
  input.focus();
}
