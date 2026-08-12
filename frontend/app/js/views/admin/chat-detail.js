/**
 * Admin Chat Detail View — TikToolStream
 */
export async function mount({ target, api, params, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .acd-head { display:flex; align-items:center; gap:var(--space-md); margin-bottom:var(--space-lg); flex-wrap:wrap; }
      .acd-container { display:flex; flex-direction:column; height:55vh; max-height:550px; background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; max-width:800px; }
      .acd-container::before { content:''; display:block; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .acd-msgs { flex:1; overflow-y:auto; padding:var(--space-md); display:flex; flex-direction:column; gap:var(--space-sm); scroll-behavior:smooth; }
      .acd-msgs::-webkit-scrollbar { width:4px; }
      .acd-msgs::-webkit-scrollbar-thumb { background:rgba(0,212,255,0.25); border-radius:2px; }
      .acd-input-wrap { display:flex; gap:var(--space-sm); border-top:1px solid var(--border-color); padding:var(--space-md); background:rgba(0,0,0,0.15); }
      .acd-msg { display:flex; margin-bottom:4px; animation: acdIn 0.3s ease backwards; }
      .acd-msg.mine { justify-content:flex-end; }
      .acd-msg.other { justify-content:flex-start; }
      @keyframes acdIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .acd-bubble { max-width:75%; padding:10px 16px; border-radius:16px; font-size:var(--text-sm); position:relative; }
      .acd-bubble.mine { background:var(--color-primary-gradient); color:#fff; border-bottom-right-radius:4px; }
      .acd-bubble.other { background:rgba(255,255,255,0.08); color:var(--text-primary); border-bottom-left-radius:4px; }
      .acd-author { font-weight:600; font-size:var(--text-xs); opacity:0.7; margin-bottom:3px; }
      .acd-time { font-size:10px; opacity:0.5; margin-top:4px; text-align:right; }
      .acd-empty { text-align:center; color:var(--text-muted); padding:var(--space-2xl); display:flex; flex-direction:column; align-items:center; gap:var(--space-md); }
      .acd-empty i { font-size:36px; opacity:0.3; }
    </style>

    <div class="acd-head">
      <a href="/app/admin/chats" class="btn btn-ghost" data-router-link style="border:1px solid var(--border-color)">
        <i class="fa-solid fa-arrow-left"></i>
      </a>
      <div>
        <h1 class="view-title" style="margin-bottom:2px">Chat #${params.userId}</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Conversación con el usuario</p>
      </div>
    </div>
    <div class="acd-container">
      <div id="msgContainer" class="acd-msgs">
        <div class="acd-empty"><i class="fa-regular fa-comment-dots"></i><p>Cargando mensajes...</p></div>
      </div>
      <div class="acd-input-wrap">
        <input type="text" id="adminMsgInput" class="input-field" placeholder="Escribe una respuesta..." style="flex:1" maxlength="500">
        <button class="btn btn-primary" id="btnSendAdmin"><i class="fa-regular fa-paper-plane"></i> Enviar</button>
      </div>
    </div>
  `;

  async function loadMessages() {
    try {
      const msgs = await api.get(\`/chat/\${params.userId}\`, { signal });
      const list = Array.isArray(msgs) ? msgs : [];
      const container = document.getElementById('msgContainer');
      if (list.length === 0) {
        container.innerHTML = '<div class="acd-empty"><i class="fa-regular fa-comment-dots"></i><p>Sin mensajes aún</p></div>';
        return;
      }
      container.innerHTML = list.map(m => {
        const isMine = m.sender_type === 'admin';
        return \`<div class="acd-msg \${isMine ? 'mine' : 'other'}">
          <div class="acd-bubble \${isMine ? 'mine' : 'other'}">
            <div class="acd-author">\${isMine ? 'Tú (Admin)' : 'Usuario'}</div>
            <div>\${escapeHtml(m.message || '')}</div>
            <div class="acd-time">\${m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
          </div>
        </div>\`;
      }).join('');
      container.scrollTop = container.scrollHeight;
    } catch {
      document.getElementById('msgContainer').innerHTML = '<div class="acd-empty"><i class="fa-solid fa-circle-exclamation" style="color:var(--color-danger)"></i><p>Error al cargar mensajes</p></div>';
    }
  }

  async function sendReply() {
    const input = document.getElementById('adminMsgInput');
    const text = input?.value?.trim();
    if (!text) return;
    const btn = document.getElementById('btnSendAdmin');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    try {
      await api.post('/chat', { message: text, recipientId: parseInt(params.userId) }, { signal });
      input.value = '';
      await loadMessages();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
    btn.disabled = false; btn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Enviar';
  }

  document.getElementById('btnSendAdmin')?.addEventListener('click', sendReply, { signal });
  document.getElementById('adminMsgInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendReply();
  }, { signal });

  await loadMessages();
  setInterval(loadMessages, 5000);
  // GSAP animate admin chat detail
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const msgs = document.querySelectorAll('.acd-msg');
      if (msgs.length) gsap.from(msgs, { opacity: 0, y: 15, stagger: 0.04, duration: 0.3, ease: 'power2.out' });
    });
}
