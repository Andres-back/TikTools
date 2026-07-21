export async function mount({ target, api, params, navigate, signal }) {
  target.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div></div>';
  try {
    const data = await api.get(`/admin/users/${params.id}`, { signal });
    const u = data.user;
    target.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-lg)">
        <button class="btn btn-ghost" onclick="navigate('/app/admin/users')">←</button>
        <h1 class="view-title" style="margin-bottom:0">${u.username}</h1>
      </div>
      <div class="card" style="max-width:500px">
        <div style="display:grid;gap:var(--space-sm)">
          <div><strong>ID:</strong> ${u.id}</div>
          <div><strong>Email:</strong> ${u.email}</div>
          <div><strong>Rol:</strong> <span class="badge ${u.role === 'admin' ? 'badge-info' : 'badge-success'}">${u.role}</span></div>
          <div><strong>Plan:</strong> ${u.plan_type} (${u.plan_days_remaining||0} días)</div>
          <div><strong>Activo:</strong> ${u.is_active ? '✅' : '❌'}</div>
          <div><strong>Verificado:</strong> ${u.is_verified !== false ? '✅' : '❌'}</div>
          <div><strong>Registro:</strong> ${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>
        </div>
      </div>
      <div style="margin-top:var(--space-md)">
        <h3>Historial de Plan (${(data.planHistory||[]).length})</h3>
        ${(data.planHistory||[]).length === 0 ? '<p style="color:var(--text-muted)">Sin historial</p>' :
          `<div class="table-container"><table><thead><tr><th>Acción</th><th>Plan</th><th>Días</th><th>Admin</th><th>Fecha</th></tr></thead>
            <tbody>${data.planHistory.map(h => `<tr><td>${h.action}</td><td>${h.plan_type||'—'}</td><td>${h.days_changed||0}</td><td>${h.admin_username||'—'}</td><td style="font-size:var(--text-xs)">${h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table></div>`
        }
      </div>
    `;
  } catch (err) {
    target.innerHTML = `<div class="error-state"><p>Error: ${err.message}</p></div>`;
  }
}
