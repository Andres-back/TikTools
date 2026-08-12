/**
 * Admin Chats View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .ac-grid { display:grid; gap:var(--space-sm); }
      .ac-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; }
      .ac-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .ac-card:hover { transform:translateY(-2px); border-color:rgba(0,217,255,0.3); box-shadow:0 8px 24px rgba(0,0,0,0.3); }
      .ac-card .ac-head { display:flex; align-items:center; justify-content:space-between; }
      .ac-card .ac-name { font-weight:700; color:#fff; }
      .ac-card .ac-email { font-size:var(--text-xs); color:var(--text-muted); margin-left:8px; }
      .ac-card .ac-meta { display:flex; align-items:center; gap:8px; }
      .ac-card .ac-time { font-size:var(--text-xs); color:var(--text-muted); }
      .ac-card .ac-preview { font-size:var(--text-sm); color:var(--text-secondary); margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ac-empty { text-align:center; padding:var(--space-2xl); color:var(--text-muted); }
      .ac-empty i { font-size:36px; opacity:0.3; display:block; margin-bottom:var(--space-md); }
    </style>

    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">Mensajería</div>
        <h1 class="view-title">Chats con Usuarios</h1>
        <p class="view-subtitle">Revisa y responde las conversaciones de soporte</p>
      </div>
    </div>
    <div id="convContainer" class="ac-grid"><div class="loading-state"><div class="spinner-sm"></div></div></div>
  `;

  async function loadConversations() {
    try {
      const data = await api.get('/admin/chats', { signal });
      const convs = data.conversations || [];
      const container = document.getElementById('convContainer');
      if (convs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Sin conversaciones</p></div>';
        return;
      }
      container.innerHTML = convs.map(c => `
        <div class="ac-card" data-userid="${c.user_id}">
          <div class="ac-head">
            <div><span class="ac-name">@${escapeHtml(c.username)}</span><span class="ac-email">${escapeHtml(c.email || '')}</span></div>
            <div class="ac-meta">
              ${c.unread_count > 0 ? `<span class="badge badge-danger">${c.unread_count}</span>` : ''}
              <span class="ac-time">${c.last_message_at ? new Date(c.last_message_at).toLocaleString() : ''}</span>
            </div>
          </div>
          <div class="ac-preview">${c.last_message ? escapeHtml(c.last_message.substring(0, 120)) : '—'}</div>
        </div>
      `).join('');
      container.querySelectorAll('[data-userid]').forEach(el => {
        el.addEventListener('click', () => navigate(`/app/admin/chats/${el.dataset.userid}`), { signal });
      });
    } catch { document.getElementById('convContainer').innerHTML = '<div class="error-state"><p>Error</p></div>'; }
  }
  await loadConversations();
  // GSAP animate admin chats
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const cards = document.querySelectorAll('.ac-card');
      if (cards.length) gsap.from(cards, { opacity: 0, y: 20, stagger: 0.06, duration: 0.35, ease: 'power2.out' });
    });
}
