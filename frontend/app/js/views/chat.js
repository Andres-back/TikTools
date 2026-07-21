/**
 * Chat View — TikToolStream
 */

import { setText } from '/app/js/core/sanitize.js';

export async function mount({ target, api, user, signal }) {
  let messages = [];
  let polling = null;
  let sending = false;

  target.innerHTML = `
    <h1 class="view-title">Chat con Administración</h1>
    <div class="card" style="display:flex;flex-direction:column;height:60vh;max-height:500px">
      <div id="chatMessages" style="flex:1;overflow-y:auto;padding:var(--space-md);display:flex;flex-direction:column;gap:var(--space-sm)">
        <div class="loading-state"><div class="spinner-sm"></div></div>
      </div>
      <div style="display:flex;gap:var(--space-sm);border-top:1px solid var(--border-color);padding:var(--space-md)">
        <input type="text" id="chatInput" class="input-field" placeholder="Escribe un mensaje..." style="flex:1" maxlength="500">
        <button class="btn btn-primary" id="chatSend">Enviar</button>
      </div>
    </div>
  `;

  function renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (messages.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:var(--space-xl)">No hay mensajes. Escribe para contactar al administrador.</div>';
      return;
    }
    container.innerHTML = messages.map(m => {
      const isMine = m.sender_type === 'user' || m.sender_id === user?.id;
      return `<div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};margin-bottom:4px">
        <div style="max-width:75%;padding:8px 14px;border-radius:12px;background:${isMine ? 'var(--color-primary-gradient)' : 'rgba(255,255,255,0.08)'};color:#fff;font-size:var(--text-sm)">
          <div style="font-weight:600;font-size:var(--text-xs);opacity:0.7;margin-bottom:2px">${isMine ? 'Tú' : 'Admin'}</div>
          <div id="msg-${m.id || Math.random()}" style="word-break:break-word"></div>
          <div style="font-size:var(--text-xs);opacity:0.5;margin-top:4px">${m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
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

  return () => {
    if (polling) clearInterval(polling);
    document.removeEventListener('visibilitychange', visHandler);
    target.innerHTML = '';
  };
}
