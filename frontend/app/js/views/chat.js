/**
 * Chat View — TikToolStream
 */

import { setText } from '/app/js/core/sanitize.js';

export async function mount({ target, api, user, signal }) {
  let messages = [];
  let polling = null;
  let sending = false;

  target.innerHTML = `
    <style>
      .ch-shell { max-width: 800px; }
      .ch-container { display:flex; flex-direction:column; height:65vh; max-height:600px; background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; }
      .ch-container::before { content:''; display:block; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .ch-messages { flex:1; overflow-y:auto; padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm); scroll-behavior:smooth; }
      .ch-messages::-webkit-scrollbar { width:4px; }
      .ch-messages::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.25); border-radius:2px; }
      .ch-input-wrap { display:flex; gap:var(--space-sm); border-top:1px solid var(--border-color); padding:var(--space-md); background:rgba(0,0,0,0.15); }
      .ch-msg { display:flex; margin-bottom:4px; animation: chMsgIn 0.3s ease backwards; }
      .ch-msg.mine { justify-content:flex-end; }
      .ch-msg.other { justify-content:flex-start; }
      @keyframes chMsgIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .ch-bubble { max-width:75%; padding:10px 16px; border-radius:16px; font-size:var(--text-sm); position:relative; }
      .ch-bubble.mine { background:var(--color-primary-gradient); color:#fff; border-bottom-right-radius:4px; }
      .ch-bubble.other { background:rgba(255,255,255,0.08); color:var(--text-primary); border-bottom-left-radius:4px; }
      .ch-author { font-weight:600; font-size:var(--text-xs); opacity:0.7; margin-bottom:3px; }
      .ch-time { font-size:10px; opacity:0.5; margin-top:4px; text-align:right; }
      .ch-empty { text-align:center; color:var(--text-muted); padding:var(--space-2xl); display:flex; flex-direction:column; align-items:center; gap:var(--space-md); }
      .ch-empty i { font-size:36px; opacity:0.3; }
      @media (max-width: 600px) {
        .ch-messages { padding:var(--space-sm); }
        .ch-input-wrap { padding:var(--space-sm); }
        .ch-bubble { max-width:85%; font-size:0.85rem; }
      }
    </style>

    <div class="ch-shell">
      <div class="ux-page-head">
        <div>
          <div class="ux-kicker">Soporte</div>
          <h1 class="view-title">Chat con Administración</h1>
          <p class="view-subtitle">Escribe al equipo de soporte. Te responderemos a la brevedad.</p>
        </div>
      </div>
      <div class="ch-container">
        <div id="chatMessages" class="ch-messages">
          <div class="ch-empty"><i class="fa-regular fa-comment-dots"></i><p>Cargando mensajes...</p></div>
        </div>
        <div class="ch-input-wrap">
          <input type="text" id="chatInput" class="input-field" placeholder="Escribe un mensaje..." style="flex:1" maxlength="500">
          <button class="btn btn-primary" id="chatSend"><i class="fa-regular fa-paper-plane"></i> Enviar</button>
        </div>
      </div>
    </div>
  `;

  function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (messages.length === 0) {
      container.innerHTML = '<div class="ch-empty"><i class="fa-regular fa-comment-dots"></i><p>No hay mensajes. Escribe para contactar al administrador.</p></div>';
      return;
    }
    container.innerHTML = messages.map(m => {
      const isMine = m.sender_type === 'user' || m.sender_id === user?.id;
      return `<div class="ch-msg ${isMine ? 'mine' : 'other'}">
        <div class="ch-bubble ${isMine ? 'mine' : 'other'}">
          <div class="ch-author">${isMine ? 'Tú' : 'Admin'}</div>
          <div id="msg-${m.id || Math.random()}" style="word-break:break-word"></div>
          <div class="ch-time">${m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
        </div>
      </div>`;
    }).join('');

    // Set textContent for each message (XSS prevention)
    messages.forEach(m => {
      const el = document.getElementById(`msg-${m.id || ''}`);
      if (el) setText(el, m.message || '');
    });

    container.scrollTop = container.scrollHeight;
  }

  async function loadMessages() {
    if (!user?.id) return;
    try {
      const data = await api.get(`/chat/${user.id}`, { signal });
      messages = Array.isArray(data) ? data : (data.messages || data || []);
      renderMessages();
    } catch {}
  }

  async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value?.trim();
    if (!text || sending) return;
    sending = true;
    const btn = document.getElementById('chatSend');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
      await api.post('/chat', { message: text }, { signal });
      input.value = '';
      await loadMessages();
    } catch (err) {
      try {
        const { showToast } = await import('/app/js/core/toast.js');
        showToast({ type: 'error', message: 'Error al enviar: ' + (err.message || 'desconocido') });
      } catch {
        alert('Error: ' + (err.message || 'desconocido'));
      }
    } finally {
      sending = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar'; }
    }
  }

  // Load initial messages
  await loadMessages();

  // Polling with adaptive interval (faster when active, slower when idle)
  let pollDelay = 5000;
  let lastMsgCount = 0;
  polling = setInterval(async () => {
    const prev = lastMsgCount;
    await loadMessages();
    lastMsgCount = messages.length;
    /* if new messages arrived, keep current rate; if not, slow down to save bandwidth */
  }, pollDelay);

  // Send handlers
  document.getElementById('chatSend')?.addEventListener('click', sendMessage, { signal });
  document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  }, { signal });

  /* pause polling when tab is hidden, resume when visible */
  const visHandler = () => {
    if (document.hidden) {
      if (polling) clearInterval(polling);
      polling = null;
    } else if (!polling) {
      loadMessages();
      polling = setInterval(loadMessages, pollDelay);
    }
  };
  document.addEventListener('visibilitychange', visHandler);

  // GSAP animate chat
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const msgs = document.querySelectorAll('.ch-msg');
      if (msgs.length) gsap.from(msgs, { opacity: 0, y: 15, stagger: 0.04, duration: 0.3, ease: 'power2.out' });
      const container = document.querySelector('.ch-container');
      if (container) gsap.from(container, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.out' });
    });
  return () => {
    if (polling) clearInterval(polling);
    document.removeEventListener('visibilitychange', visHandler);
    target.innerHTML = '';
  };
}
