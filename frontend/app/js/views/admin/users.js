/**
 * Admin Users View — TikToolStream
 * Premium con paginación, filtros, bulk actions, add-days inline
 */

import { countUp, formatNum, magneticButton, staggerChildren } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let editingId = null;
  let users = [];
  let total = 0;
  let page = 1;
  const pageSize = 15;
  let search = '';
  let filterStatus = '';
  let filterPlan = '';
  let selectedIds = new Set();

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .au-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-md); }
      .au-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .au-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .au-stats .stat .n { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .au-stats .stat .l { font-size:var(--text-xs); color:var(--text-muted); }
      .au-toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:var(--space-md); }
      .au-toolbar input, .au-toolbar select { padding:8px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:10px; color:#fff; font-size:var(--text-sm); }
      .au-toolbar input { min-width:min(200px, 100%); }
      .bulk-bar { display:flex; gap:8px; align-items:center; padding:10px 14px; background:linear-gradient(135deg, rgba(0,217,255,0.12), rgba(123,47,247,0.08)); border:1px solid rgba(0,217,255,0.3); border-radius:10px; margin-bottom:var(--space-sm); animation: slideIn 0.3s var(--ease-smooth); }
      @keyframes slideIn { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:translateY(0);} }
      .au-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      .au-table { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; min-width:700px; }
      .au-row { display:grid; grid-template-columns:36px 1fr 140px 110px 130px 140px; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s; gap:8px; }
      .au-row:hover { background:rgba(0,217,255,0.04); }
      .au-row.header { background:rgba(0,0,0,0.2); font-weight:700; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); padding:10px 14px; }
      .au-row input[type=checkbox] { width:18px; height:18px; cursor:pointer; accent-color:#00d9ff; }
      .au-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:0.85rem; flex-shrink:0; overflow:hidden; margin-right:8px; }
      .au-avatar img { width:100%; height:100%; object-fit:cover; }
      .au-username { font-weight:600; display:flex; align-items:center; }
      .au-email { font-size:var(--text-xs); color:var(--text-muted); }
      .au-plan { padding:3px 10px; border-radius:10px; font-size:0.7rem; font-weight:700; text-transform:uppercase; display:inline-block; }
      .au-plan.premium { background:rgba(255,215,0,0.15); color:#ffd700; }
      .au-plan.free { background:rgba(255,255,255,0.08); color:var(--text-muted); }
      .au-status { padding:3px 10px; border-radius:10px; font-size:0.7rem; font-weight:700; text-transform:uppercase; display:inline-block; }
      .au-status.active { background:rgba(0,255,136,0.15); color:#00ff88; }
      .au-status.inactive { background:rgba(255,107,107,0.15); color:#ff6b6b; }
      .au-actions { display:flex; gap:4px; }
      .au-pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:var(--space-lg); flex-wrap:wrap; }
      .au-pagination button { padding:6px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:var(--text-secondary); cursor:pointer; font-size:var(--text-sm); font-family:inherit; }
      .au-pagination button:hover:not(:disabled) { background:rgba(0,217,255,0.1); border-color:rgba(0,217,255,0.3); color:#00d9ff; }
      .au-pagination button:disabled { opacity:0.4; cursor:not-allowed; }
      .au-pagination .pg-info { color:var(--text-muted); font-size:var(--text-sm); min-width:160px; text-align:center; }
      @media (max-width: 900px) {
        .au-stats { grid-template-columns:repeat(2, 1fr); }
        .au-row { grid-template-columns:36px 1fr 100px 100px; font-size:0.85rem; }
        .au-row > div:nth-child(5), .au-row > div:nth-child(6) { display:none; }
        .au-row.header > div:nth-child(5), .au-row.header > div:nth-child(6) { display:none; }
      }
      @media (max-width: 600px) {
        .au-stats { grid-template-columns:1fr; }
        .au-row { grid-template-columns:36px 1fr 80px; gap:4px; padding:8px 10px; }
        .au-row > div:nth-child(4) { display:none; }
        .au-row.header > div:nth-child(4) { display:none; }
        .au-avatar { width:28px; height:28px; font-size:0.75rem; }
      }
    </style>

    <div class="au-head">
      <div>
        <h1 class="view-title" style="margin-bottom:4px">👥 Usuarios</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Gestiona todos los usuarios del sistema</p>
      </div>
    </div>

    <div class="au-stats" id="auStats">
      <div class="stat"><div class="n" id="sTotal">0</div><div class="l">Total</div></div>
      <div class="stat"><div class="n" id="sActive">0</div><div class="l">Activos</div></div>
      <div class="stat"><div class="n" id="sPremium">0</div><div class="l">Premium</div></div>
      <div class="stat"><div class="n" id="sAdmin">0</div><div class="l">Admins</div></div>
    </div>

    <div class="bulk-bar" id="bulkBar" style="display:none">
      <span style="font-weight:600"><span id="bulkCount">0</span> seleccionados</span>
      <button class="btn btn-sm btn-success" id="bulkAddDays">+30 días plan</button>
      <button class="btn btn-sm btn-warning" id="bulkToggle">Activar/Desactivar</button>
      <button class="btn btn-sm btn-danger" id="bulkDelete">🗑️ Eliminar</button>
      <button class="btn btn-sm btn-ghost" id="bulkCancel">Cancelar</button>
    </div>

    <div class="au-toolbar">
      <input type="text" id="searchUsers" placeholder="🔍 Buscar usuario o email...">
      <select id="filterStatus">
        <option value="">Todos los estados</option>
        <option value="active">🟢 Activos</option>
        <option value="inactive">🔴 Inactivos</option>
      </select>
      <select id="filterPlan">
        <option value="">Todos los planes</option>
        <option value="premium">⭐ Premium</option>
        <option value="free">Free</option>
      </select>
      <button class="btn btn-primary btn-sm" id="btnNewUser">+ Nuevo Usuario</button>
    </div>

    <div id="usersContainer">
      <div class="au-table-wrap">
        <div class="au-table">
          <div class="au-row header">
            <div><input type="checkbox" id="checkAll"></div>
            <div>Usuario</div>
            <div>Rol</div>
            <div>Plan</div>
            <div>Estado</div>
            <div>Acciones</div>
          </div>
          <div id="usersRows"></div>
        </div>
      </div>
      <div class="au-pagination" id="pagination"></div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="userModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">Nuevo Usuario</h3>
          <button class="modal-close" id="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Usuario</label>
            <input type="text" id="editUsername" class="input-field">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Email</label>
            <input type="email" id="editEmail" class="input-field">
          </div>
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Password (dejar vacío para no cambiar)</label>
            <input type="password" id="editPassword" class="input-field">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);margin-bottom:var(--space-sm)">
            <div class="input-group">
              <label class="input-label">Rol</label>
              <select id="editRole" class="input-field">
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="input-group">
              <label class="input-label">Plan</label>
              <select id="editPlan" class="input-field">
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-md);font-size:var(--text-sm);cursor:pointer">
            <input type="checkbox" id="editActive" checked> Activo
          </label>
          <div style="display:flex;gap:8px;margin-bottom:var(--space-sm)">
            <button class="btn btn-secondary btn-sm" id="btnAddDays" style="flex:1">+30 días</button>
            <button class="btn btn-secondary btn-sm" id="btnResetPw" style="flex:1">🔑 Reset Password</button>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" id="btnSaveUser" style="flex:1">Guardar</button>
            <button class="btn btn-secondary" id="btnCancelEdit">Cancelar</button>
            <button class="btn btn-danger btn-ghost" id="btnDeleteUser" style="display:none">🗑️</button>
          </div>
          <div id="userFeedback" style="margin-top:var(--space-sm);font-size:var(--text-sm)"></div>
        </div>
      </div>
    </div>
  `;

  async function loadUsers() {
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', pageSize);
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPlan) params.set('plan', filterPlan);
      const data = await api.get(`/admin/users?${params.toString()}`, { signal });
      users = data.users || [];
      total = data.total || users.length;
      renderUsers();
      updateStats();
    } catch (err) {
      console.error(err);
    }
  }

  function updateStats() {
    const active = users.filter(u => u.is_active).length;
    const premium = users.filter(u => u.plan_type === 'premium').length;
    const admins = users.filter(u => u.role === 'admin').length;
    document.getElementById('sTotal').textContent = total.toLocaleString();
    document.getElementById('sActive').textContent = active.toLocaleString();
    document.getElementById('sPremium').textContent = premium.toLocaleString();
    document.getElementById('sAdmin').textContent = admins.toLocaleString();
  }

  function renderUsers() {
    const rows = document.getElementById('usersRows');
    if (users.length === 0) {
      rows.innerHTML = '<div class="au-row" style="text-align:center;color:var(--text-muted);grid-template-columns:1fr;padding:var(--space-xl)">Sin resultados</div>';
    } else {
      rows.innerHTML = users.map(u => {
        const initial = (u.username || '?').charAt(0).toUpperCase();
        const checked = selectedIds.has(u.id) ? 'checked' : '';
        return `<div class="au-row" data-id="${u.id}">
          <div><input type="checkbox" class="user-check" data-id="${u.id}" ${checked}></div>
          <div class="au-username">
            <div class="au-avatar">${u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">` : initial}</div>
            <div>
              <div>@${escapeHtml(u.username || '')}</div>
              <div class="au-email">${escapeHtml(u.email || '')}</div>
            </div>
          </div>
          <div>${u.role === 'admin' ? '👑 Admin' : u.role === 'moderator' ? '🛡️ Mod' : '👤 User'}</div>
          <div><span class="au-plan ${u.plan_type === 'premium' ? 'premium' : 'free'}">${u.plan_type || 'free'}</span></div>
          <div><span class="au-status ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? '🟢 Activo' : '🔴 Inactivo'}</span></div>
          <div class="au-actions">
            <button class="btn btn-sm btn-ghost" data-edit='${u.id}' title="Editar">✏️</button>
            <button class="btn btn-sm btn-ghost" data-detail='${u.id}' title="Ver detalle">👁️</button>
            <button class="btn btn-sm btn-danger" data-del='${u.id}' title="Eliminar">🗑️</button>
          </div>
        </div>`;
      }).join('');
    }
    bindRowActions();

    /* pagination */
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pg = document.getElementById('pagination');
    if (totalPages > 1) {
      pg.innerHTML = `
        <button id="pgFirst" ${page === 1 ? 'disabled' : ''}>«</button>
        <button id="pgPrev" ${page === 1 ? 'disabled' : ''}>‹</button>
        <span class="pg-info">Página ${page} de ${totalPages} · ${total} total</span>
        <button id="pgNext" ${page === totalPages ? 'disabled' : ''}>›</button>
        <button id="pgLast" ${page === totalPages ? 'disabled' : ''}>»</button>
      `;
      pg.querySelector('#pgFirst')?.addEventListener('click', () => { page = 1; loadUsers(); }, { signal });
      pg.querySelector('#pgPrev')?.addEventListener('click', () => { page--; loadUsers(); }, { signal });
      pg.querySelector('#pgNext')?.addEventListener('click', () => { page++; loadUsers(); }, { signal });
      pg.querySelector('#pgLast')?.addEventListener('click', () => { page = totalPages; loadUsers(); }, { signal });
    } else {
      pg.innerHTML = '';
    }
    updateBulkBar();
  }

  function bindRowActions() {
    const rows = document.getElementById('usersRows');
    rows.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.edit;
      startEdit(parseInt(id, 10));
    }, { signal }));
    rows.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', () => {
      navigate(`/app/admin/users/${b.dataset.detail}`);
    }, { signal }));
    rows.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteUser(parseInt(b.dataset.del, 10)), { signal }));
    rows.querySelectorAll('.user-check').forEach(cb => cb.addEventListener('change', () => {
      const id = parseInt(cb.dataset.id, 10);
      if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
      updateBulkBar();
    }, { signal }));
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    document.getElementById('bulkCount').textContent = selectedIds.size;
    bar.style.display = selectedIds.size > 0 ? 'flex' : 'none';
  }

  document.getElementById('checkAll')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      users.forEach(u => selectedIds.add(u.id));
    } else {
      selectedIds.clear();
    }
    renderUsers();
  }, { signal });

  async function deleteUser(id) {
    if (!confirm('¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      await api.del(`/admin/users/${id}`, { signal });
      showToast({ type: 'success', message: 'Usuario eliminado' });
      selectedIds.delete(id);
      loadUsers();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }

  function startEdit(id) {
    const u = users.find(x => x.id === id);
    if (!u) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Editar Usuario';
    document.getElementById('editUsername').value = u.username || '';
    document.getElementById('editEmail').value = u.email || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editRole').value = u.role || 'user';
    document.getElementById('editPlan').value = u.plan_type || 'free';
    document.getElementById('editActive').checked = u.is_active !== false;
    document.getElementById('btnDeleteUser').style.display = 'block';
    document.getElementById('userModal').style.display = 'flex';
  }

  function openNewModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('editUsername').value = '';
    document.getElementById('editEmail').value = '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editRole').value = 'user';
    document.getElementById('editPlan').value = 'free';
    document.getElementById('editActive').checked = true;
    document.getElementById('btnDeleteUser').style.display = 'none';
    document.getElementById('userModal').style.display = 'flex';
  }

  document.getElementById('btnNewUser')?.addEventListener('click', openNewModal, { signal });
  document.getElementById('closeModal')?.addEventListener('click', () => { document.getElementById('userModal').style.display = 'none'; }, { signal });
  document.getElementById('btnCancelEdit')?.addEventListener('click', () => { document.getElementById('userModal').style.display = 'none'; }, { signal });

  document.getElementById('btnSaveUser')?.addEventListener('click', async () => {
    const payload = {
      username: document.getElementById('editUsername').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      role: document.getElementById('editRole').value,
      planType: document.getElementById('editPlan').value,
      isActive: document.getElementById('editActive').checked
    };
    const pw = document.getElementById('editPassword').value;
    if (pw) payload.password = pw;
    try {
      if (editingId) {
        await api.put(`/admin/users/${editingId}`, payload, { signal });
        showToast({ type: 'success', message: 'Usuario actualizado' });
      } else {
        if (!pw) { showToast({ type: 'warning', message: 'Password requerido para nuevo usuario' }); return; }
        await api.post('/admin/users', payload, { signal });
        showToast({ type: 'success', message: 'Usuario creado' });
      }
      document.getElementById('userModal').style.display = 'none';
      loadUsers();
    } catch (err) {
      document.getElementById('userFeedback').innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(err.message)}</span>`;
    }
  }, { signal });

  document.getElementById('btnAddDays')?.addEventListener('click', async () => {
    if (!editingId) return;
    try {
      await api.post(`/admin/users/${editingId}/add-days`, { days: 30 }, { signal });
      showToast({ type: 'success', message: '+30 días agregados' });
    } catch (err) { showToast({ type: 'error', message: err.message }); }
  }, { signal });

  document.getElementById('btnResetPw')?.addEventListener('click', async () => {
    if (!editingId) return;
    if (!confirm('¿Resetear la contraseña de este usuario?')) return;
    try {
      await api.post(`/admin/users/${editingId}/reset-password`, {}, { signal });
      showToast({ type: 'success', message: 'Contraseña reseteada' });
    } catch (err) { showToast({ type: 'error', message: err.message }); }
  }, { signal });

  document.getElementById('btnDeleteUser')?.addEventListener('click', () => {
    if (editingId) deleteUser(editingId);
  }, { signal });

  /* bulk actions */
  document.getElementById('bulkCancel')?.addEventListener('click', () => {
    selectedIds.clear();
    renderUsers();
  }, { signal });

  document.getElementById('bulkAddDays')?.addEventListener('click', async () => {
    if (!confirm(`¿Agregar 30 días al plan de ${selectedIds.size} usuarios?`)) return;
    let success = 0;
    for (const id of selectedIds) {
      try { await api.post(`/admin/users/${id}/add-days`, { days: 30 }, { signal }); success++; } catch {}
    }
    showToast({ type: 'success', message: `${success}/${selectedIds.size} usuarios actualizados` });
    selectedIds.clear();
    loadUsers();
  }, { signal });

  document.getElementById('bulkToggle')?.addEventListener('click', async () => {
    if (!confirm(`¿Activar/Desactivar ${selectedIds.size} usuarios?`)) return;
    for (const id of selectedIds) {
      try { await api.post(`/admin/users/${id}/toggle-status`, {}, { signal }); } catch {}
    }
    showToast({ type: 'success', message: 'Estado actualizado' });
    loadUsers();
  }, { signal });

  document.getElementById('bulkDelete')?.addEventListener('click', async () => {
    if (!confirm(`⚠️ ¿ELIMINAR ${selectedIds.size} usuarios permanentemente?`)) return;
    for (const id of [...selectedIds]) {
      try { await api.del(`/admin/users/${id}`, { signal }); selectedIds.delete(id); } catch {}
    }
    showToast({ type: 'success', message: 'Usuarios eliminados' });
    loadUsers();
  }, { signal });

  /* search + filters */
  let searchTimer = null;
  document.getElementById('searchUsers')?.addEventListener('input', (e) => {
    search = e.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { page = 1; loadUsers(); }, 300);
  }, { signal });
  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    page = 1; loadUsers();
  }, { signal });
  document.getElementById('filterPlan')?.addEventListener('change', (e) => {
    filterPlan = e.target.value;
    page = 1; loadUsers();
  }, { signal });

  document.querySelectorAll('.btn').forEach(b => magneticButton(b));
  await loadUsers();
}
