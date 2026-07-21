/**
 * Admin Chat Detail View — TikToolStream
 */

export async function mount({ target, api, params, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  target.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg)">
      <button class="btn btn-ghost" onclick="navigate('/app/admin/chats')">←</button>
      <h1 class="view-title" style="margin-bottom:0">Chat #${params.userId}</h1>
    </div>
    <div class="card" style="display:flex;flex-direction:column;height:50vh;max-height:500px">
      <div id="msgContainer" style="flex:1;overflow-y:auto;padding:var(--space-md);display:flex;flex-direction:column;gap:6px"></div>
      <div style="display:flex;gap:var(--space-sm);border-top:1px solid var(--border-color);padding:var(--space-md)">
        <input type="text" id="adminMsgInput" class="input-field" placeholder="Escribe una respuesta..." style="flex:1">
        <button class="btn btn-primary" id="btnSendAdmin">Enviar</button>
      </div>
    </div>
  `;

  async function loadMessages() {
    try {
      const msgs = await api.get(`/chat/${params.userId}`, { signal });
      const list = Array.isArray(msgs) ? msgs : [];
      const container = document.getElementById('msgContainer');
      if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:var(--space-xl)">Sin mensajes</div>';
        return;
      }
      container.innerHTML = list.map(m => `
        <div style="display:flex;justify-content:${m.sender_type === 'admin' ? 'flex-end' : 'flex-start'}">
          <div style="max-width:75%;padding:8px 14px;border-radius:12px;background:${m.sender_type === 'admin' ? 'var(--color-primary-gradient)' : 'rgba(255,255,255,0.08)'};color:#fff;font-size:var(--text-sm)">
            <div style="font-weight:600;font-size:var(--text-xs);opacity:.7">${m.sender_type === 'admin' ? 'Tú' : 'Usuario'}</div>
            <div>${m.message || ''}</div>
            <div style="font-size:var(--text-xs);opacity:.5;margin-top:4px">${m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
          </div>
        </div>
      `).join('');
      container.scrollTop = container.scrollHeight;
    } catch { document.getElementById('msgContainer').innerHTML = '<div class="error-state"><p>Error</p></div>'; }
  }

  async function sendReply() {
    const input = document.getElementById('adminMsgInput');
    const text = input?.value?.trim();
    if (!text) return;
    const btn = document.getElementById('btnSendAdmin');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      await api.post('/chat', { message: text, recipientId: parseInt(params.userId) }, { signal });
      input.value = '';
      await loadMessages();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
    btn.disabled = false; btn.textContent = 'Enviar';
  }

  document.getElementById('btnSendAdmin')?.addEventListener('click', sendReply, { signal });
  document.getElementById('adminMsgInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendReply();
  }, { signal });

  await loadMessages();
  setInterval(loadMessages, 5000); // Polling
}
