/**
 * Admin Chats View — TikToolStream
 */

export async function mount({ target, api, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  target.innerHTML = `
    <h1 class="view-title">Chats con Usuarios</h1>
    <div id="convContainer"><div class="loading-state"><div class="spinner-sm"></div></div></div>
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
        <div class="card" style="margin-bottom:var(--space-sm);cursor:pointer" data-userid="${c.user_id}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><strong>${c.username}</strong><span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:8px">${c.email || ''}</span></div>
            <div style="display:flex;align-items:center;gap:8px">
              ${c.unread_count > 0 ? `<span class="badge badge-danger">${c.unread_count}</span>` : ''}
              <span style="font-size:var(--text-xs);color:var(--text-muted)">${c.last_message_at ? new Date(c.last_message_at).toLocaleString() : ''}</span>
            </div>
          </div>
          <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:4px">${c.last_message ? c.last_message.substring(0, 120) : '—'}</div>
        </div>
      `).join('');
      container.querySelectorAll('[data-userid]').forEach(el => {
        el.addEventListener('click', () => navigate(`/app/admin/chats/${el.dataset.userid}`), { signal });
      });
    } catch { document.getElementById('convContainer').innerHTML = '<div class="error-state"><p>Error</p></div>'; }
  }
  await loadConversations();
}
