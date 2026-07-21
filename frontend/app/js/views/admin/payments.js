/**
 * Admin Payments View — TikToolStream
 * Gestión de pagos y refunds
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .ap-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-md); }
      .ap-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .ap-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .ap-stats .stat .n { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ap-stats .stat .l { font-size:var(--text-xs); color:var(--text-muted); }
      .ap-stats .stat .n.gold { background:linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ap-stats .stat .n.pink { background:linear-gradient(135deg, #ff006e, #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ap-stats .stat .n.red { background:linear-gradient(135deg, #ff1744, #ff6b6b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .ap-toolbar { display:flex; gap:8px; margin-bottom:var(--space-md); align-items:center; flex-wrap:wrap; }
      .ap-toolbar select { padding:8px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:10px; color:#fff; font-size:var(--text-sm); }
      .ap-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      .ap-table { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; min-width:700px; }
      .ap-row { display:grid; grid-template-columns:60px 1fr 110px 110px 110px 90px 110px; align-items:center; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s; gap:8px; font-size:var(--text-sm); }
      .ap-row:hover { background:rgba(0,217,255,0.04); }
      .ap-row.header { background:rgba(0,0,0,0.2); font-weight:700; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); padding:10px 14px; }
      .ap-row .id { color:var(--text-muted); font-family:monospace; }
      .ap-row .user { font-weight:600; }
      .ap-row .email { font-size:var(--text-xs); color:var(--text-muted); }
      .ap-row .amount { font-weight:700; color:#ffd700; font-family:'Montserrat',sans-serif; }
      .ap-row .plan { padding:3px 8px; border-radius:8px; font-size:0.7rem; font-weight:700; text-transform:uppercase; display:inline-block; background:rgba(0,217,255,0.15); color:#00d9ff; }
      .ap-row .status { padding:3px 8px; border-radius:8px; font-size:0.7rem; font-weight:700; text-transform:uppercase; display:inline-block; }
      .ap-row .status.completed { background:rgba(0,255,136,0.15); color:#00ff88; }
      .ap-row .status.pending { background:rgba(255,215,0,0.15); color:#ffd700; }
      .ap-row .status.failed { background:rgba(255,107,107,0.15); color:#ff6b6b; }
      .ap-row .status.refunded { background:rgba(139,92,246,0.15); color:#9d4edd; }
      .ap-row .date { font-size:var(--text-xs); color:var(--text-muted); }
      .ap-row .actions { display:flex; gap:4px; }
      .ap-pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:var(--space-lg); flex-wrap:wrap; }
      .ap-pagination button { padding:6px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:var(--text-secondary); cursor:pointer; font-size:var(--text-sm); font-family:inherit; }
      .ap-pagination button:hover:not(:disabled) { background:rgba(0,217,255,0.1); border-color:rgba(0,217,255,0.3); color:#00d9ff; }
      .ap-pagination button:disabled { opacity:0.4; cursor:not-allowed; }
      @media (max-width: 900px) {
        .ap-stats { grid-template-columns:repeat(2, 1fr); }
        .ap-row { grid-template-columns:60px 1fr 100px 100px; font-size:0.85rem; }
        .ap-row > div:nth-child(5), .ap-row > div:nth-child(6), .ap-row > div:nth-child(7) { display:none; }
        .ap-row.header > div:nth-child(5), .ap-row.header > div:nth-child(6), .ap-row.header > div:nth-child(7) { display:none; }
      }
      @media (max-width: 600px) {
        .ap-stats { grid-template-columns:1fr; }
        .ap-row { grid-template-columns:50px 1fr 80px; gap:4px; padding:8px 10px; }
        .ap-row > div:nth-child(4) { display:none; }
        .ap-row.header > div:nth-child(4) { display:none; }
      }
    </style>

    <div class="ap-head">
      <div>
        <h1 class="view-title" style="margin-bottom:4px">💰 Gestión de Pagos</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Todos los pagos del sistema y refunds</p>
      </div>
    </div>

    <div class="ap-stats" id="apStats">
      <div class="stat"><div class="n gold" id="sRevenue">$0</div><div class="l">Ingresos</div></div>
      <div class="stat"><div class="n" id="sCount">0</div><div class="l">Total pagos</div></div>
      <div class="stat"><div class="n green" id="sCompleted">0</div><div class="l">Completados</div></div>
      <div class="stat"><div class="n pink" id="sRefunded">0</div><div class="l">Reembolsados</div></div>
    </div>

    <div class="ap-toolbar">
      <select id="filterStatus">
        <option value="">Todos los estados</option>
        <option value="completed">✅ Completados</option>
        <option value="pending">⏳ Pendientes</option>
        <option value="failed">❌ Fallidos</option>
        <option value="refunded">↩️ Reembolsados</option>
      </select>
    </div>

    <div id="paymentsContainer">
      <div class="ap-table-wrap">
        <div class="ap-table">
          <div class="ap-row header">
            <div>ID</div>
            <div>Usuario</div>
            <div>Monto</div>
            <div>Plan</div>
            <div>Días</div>
            <div>Estado</div>
            <div>Acciones</div>
          </div>
        <div id="paymentsRows"></div>
        </div>
      </div>
      <div class="ap-pagination" id="pagination"></div>
    </div>
  `;

  let payments = [];
  let page = 1;
  const pageSize = 20;
  let filterStatus = '';

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', pageSize);
      if (filterStatus) params.set('status', filterStatus);
      const data = await api.get(`/admin/payments?${params.toString()}`, { signal });
      payments = data.payments || [];
      render();
      updateStats();
    } catch (err) {
      console.error(err);
    }
  }

  function updateStats() {
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const completed = payments.filter(p => p.status === 'completed').length;
    const refunded = payments.filter(p => p.status === 'refunded').length;
    document.getElementById('sRevenue').textContent = '$' + total.toFixed(2);
    document.getElementById('sCount').textContent = payments.length;
    document.getElementById('sCompleted').textContent = completed;
    document.getElementById('sRefunded').textContent = refunded;
  }

  function render() {
    const rows = document.getElementById('paymentsRows');
    if (payments.length === 0) {
      rows.innerHTML = '<div class="ap-row" style="text-align:center;color:var(--text-muted);grid-template-columns:1fr;padding:var(--space-xl)">Sin pagos</div>';
    } else {
      rows.innerHTML = payments.map(p => `<div class="ap-row" data-id="${p.id}">
        <div class="id">#${p.id}</div>
        <div class="user">
          <div>@${escapeHtml(p.username || '?')}</div>
          <div class="email">${escapeHtml(p.email || '')}</div>
        </div>
        <div class="amount">$${Number(p.amount || 0).toFixed(2)}</div>
        <div><span class="plan">${p.plan_type || '—'}</span></div>
        <div>${p.days_added || 0}d</div>
        <div><span class="status ${p.status}">${p.status || '—'}</span></div>
        <div class="actions">
          ${p.status === 'completed' ? `<button class="btn btn-sm btn-danger" data-refund="${p.id}">↩️ Refund</button>` : '—'}
        </div>
      </div>`).join('');
    }
    bindActions();

    const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
    const pg = document.getElementById('pagination');
    if (totalPages > 1) {
      pg.innerHTML = `<button id="pgPrev" ${page === 1 ? 'disabled' : ''}>‹</button><span style="color:var(--text-muted);font-size:var(--text-sm);min-width:120px;text-align:center">Página ${page} de ${totalPages}</span><button id="pgNext" ${page === totalPages ? 'disabled' : ''}>›</button>`;
      pg.querySelector('#pgPrev')?.addEventListener('click', () => { page--; load(); }, { signal });
      pg.querySelector('#pgNext')?.addEventListener('click', () => { page++; load(); }, { signal });
    } else {
      pg.innerHTML = '';
    }
  }

  function bindActions() {
    const rows = document.getElementById('paymentsRows');
    rows.querySelectorAll('[data-refund]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.refund;
        if (!confirm(`¿Reembolsar el pago #${id}? Esta acción ajustará los días del plan del usuario.`)) return;
        try {
          await api.post(`/admin/payments/${id}/refund`, {}, { signal });
          showToast({ type: 'success', message: 'Pago reembolsado' });
          load();
        } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
      }, { signal });
    });
  }

  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    page = 1; load();
  }, { signal });

  document.querySelectorAll('.btn').forEach(b => magneticButton(b));
  await load();
}
