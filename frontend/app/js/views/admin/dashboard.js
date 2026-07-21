/**
 * Admin Dashboard View — TikToolStream
 * Premium admin stats with SVG charts and recent activity
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  target.innerHTML = `
    <style>
      .adm-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-lg); flex-wrap:wrap; gap:var(--space-md); }
      .adm-head h1 { font-size:1.8rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .adm-stat { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:var(--space-md); position:relative; overflow:hidden; transition:all 0.3s; animation: cardIn 0.4s var(--ease-smooth) backwards; }
      .adm-stat:nth-child(1){animation-delay:0ms} .adm-stat:nth-child(2){animation-delay:80ms} .adm-stat:nth-child(3){animation-delay:160ms} .adm-stat:nth-child(4){animation-delay:240ms} .adm-stat:nth-child(5){animation-delay:320ms} .adm-stat:nth-child(6){animation-delay:400ms}
      @keyframes cardIn { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
      .adm-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, var(--accent, rgba(0,217,255,0.4)), transparent); }
      .adm-stat:hover { transform:translateY(-3px); }
      .adm-stat .icon { font-size:1.5rem; margin-bottom:6px; }
      .adm-stat .value { font-size:1.8rem; font-weight:800; font-family:'Montserrat',sans-serif; }
      .adm-stat .label { font-size:var(--text-xs); color:var(--text-muted); margin-top:4px; text-transform:uppercase; letter-spacing:1.5px; font-weight:600; }
      .adm-stat.cyan { --accent: rgba(0,217,255,0.4); }
      .adm-stat.cyan .value { background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stat.gold { --accent: rgba(255,215,0,0.4); }
      .adm-stat.gold .value { background:linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stat.green { --accent: rgba(0,255,136,0.4); }
      .adm-stat.green .value { background:linear-gradient(135deg, #00ff88, #00d9ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stat.pink { --accent: rgba(255,0,110,0.4); }
      .adm-stat.pink .value { background:linear-gradient(135deg, #ff006e, #8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stat.purple { --accent: rgba(139,92,246,0.4); }
      .adm-stat.purple .value { background:linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .adm-stat .sub { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }

      .adm-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(380px, 1fr)); gap:var(--space-md); }
      .adm-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); position:relative; overflow:hidden; }
      .adm-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .adm-card h3 { font-size:var(--text-sm); text-transform:uppercase; letter-spacing:1.5px; color:var(--text-muted); margin-bottom:var(--space-md); font-weight:600; }
      .adm-list { display:flex; flex-direction:column; gap:8px; }
      .adm-row { display:flex; align-items:center; gap:10px; padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:10px; transition:all 0.2s; }
      .adm-row:hover { background:rgba(0,217,255,0.06); }
      .adm-row .adm-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:0.85rem; flex-shrink:0; }
      .adm-row .adm-name { flex:1; font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .adm-row .adm-email { font-size:var(--text-xs); color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .adm-row .adm-meta { font-size:var(--text-xs); color:#00d9ff; font-weight:700; flex-shrink:0; }
      .adm-row .adm-badge { padding:2px 8px; border-radius:6px; font-size:0.7rem; font-weight:700; text-transform:uppercase; }
      .adm-row .adm-badge.premium { background:rgba(255,215,0,0.15); color:#ffd700; }
      .adm-row .adm-badge.free { background:rgba(255,255,255,0.08); color:var(--text-muted); }
      .adm-quick { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .adm-quick a { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; text-decoration:none; color:inherit; transition:all 0.3s; display:block; }
      .adm-quick a:hover { transform:translateY(-2px); border-color:rgba(0,217,255,0.4); }
      .adm-quick a .qa-icon { font-size:1.8rem; }
      .adm-quick a .qa-label { font-weight:600; margin-top:4px; }
      .adm-quick a .qa-sub { font-size:var(--text-xs); color:var(--text-muted); }
    </style>

    <div class="adm-head">
      <div>
        <h1>👑 Panel Admin</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Resumen general del sistema</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="/app/admin/users" class="btn btn-secondary btn-sm" data-router-link>👥 Usuarios</a>
        <a href="/app/admin/news" class="btn btn-secondary btn-sm" data-router-link>📰 Novedades</a>
        <a href="/app/admin/chats" class="btn btn-secondary btn-sm" data-router-link>💬 Chats</a>
      </div>
    </div>

    <div class="adm-stats" id="admStats"><div style="text-align:center;padding:var(--space-xl)"><div class="spinner"></div></div></div>

    <div class="adm-grid" id="admGrid">
      <div class="adm-card">
        <h3>👥 Últimos usuarios</h3>
        <div id="admRecentUsers" class="adm-list"><div style="text-align:center;padding:var(--space-md);color:var(--text-muted)">Cargando...</div></div>
      </div>
      <div class="adm-card">
        <h3>💰 Últimos pagos</h3>
        <div id="admRecentPayments" class="adm-list"><div style="text-align:center;padding:var(--space-md);color:var(--text-muted)">Cargando...</div></div>
      </div>
    </div>
  `;

  function drawMiniBars(container, data, color) {
    if (!data || data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:var(--space-md);color:var(--text-muted)">Sin datos</div>';
      return;
    }
    const W = 360, H = 120, P = 24;
    const max = Math.max(...data.map(d => d.value), 1);
    const bw = (W - P * 2) / data.length - 4;
    let bars = '';
    data.forEach((d, i) => {
      const x = P + i * (bw + 4);
      const h = ((d.value / max) * (H - P * 2));
      const y = H - P - h;
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${color}" rx="3" opacity="${0.5 + (d.value / max) * 0.5}"/>`;
    });
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:120px;display:block">${bars}</svg>`;
  }

  async function load() {
    try {
      const data = await api.get('/admin/dashboard', { signal });
      const u = data.users || {};
      const p = data.payments || {};
      const a = data.auctions || {};
      const m = data.messages || {};

      const statsEl = document.getElementById('admStats');
      statsEl.innerHTML = `
        <div class="adm-stat cyan"><div class="icon">👥</div><div class="value" data-count="total" data-value="${u.total || 0}">0</div><div class="label">Usuarios</div><div class="sub">${u.new_last_week || 0} esta semana</div></div>
        <div class="adm-stat green"><div class="icon">✅</div><div class="value" data-count="active" data-value="${u.active || 0}">0</div><div class="label">Activos</div></div>
        <div class="adm-stat gold"><div class="icon">⭐</div><div class="value" data-count="premium" data-value="${u.premium || 0}">0</div><div class="label">Premium</div><div class="sub">${u.free || 0} free</div></div>
        <div class="adm-stat pink"><div class="icon">💰</div><div class="value" data-count="revenue" data-value="${Math.round(p.total_revenue || 0)}">0</div><div class="label">Ingresos</div><div class="sub">${p.total_payments || 0} pagos</div></div>
        <div class="adm-stat purple"><div class="icon">🏆</div><div class="value" data-count="auctions" data-value="${a.total || 0}">0</div><div class="label">Subastas</div><div class="sub">${a.today || 0} hoy</div></div>
        <div class="adm-stat"><div class="icon">💬</div><div class="value" data-count="unread" data-value="${m.unread || 0}">0</div><div class="label">Mensajes sin leer</div></div>
      `;

      statsEl.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.value, 10) || 0;
        countUp(el, 0, target, 1400);
      });

      /* recent users */
      const users = data.recentUsers || [];
      const usersEl = document.getElementById('admRecentUsers');
      if (users.length === 0) {
        usersEl.innerHTML = '<div style="text-align:center;padding:var(--space-md);color:var(--text-muted)">Sin usuarios</div>';
      } else {
        usersEl.innerHTML = users.map(u => {
          const initial = (u.username || '?').charAt(0).toUpperCase();
          const isPremium = u.plan_type === 'premium';
          return `<div class="adm-row">
            <div class="adm-avatar">${initial}</div>
            <div style="flex:1;min-width:0">
              <div class="adm-name">@${escapeHtml(u.username || '')}</div>
              <div class="adm-email">${escapeHtml(u.email || '')}</div>
            </div>
            <span class="adm-badge ${isPremium ? 'premium' : 'free'}">${isPremium ? '⭐' : 'free'}</span>
          </div>`;
        }).join('');
      }

      /* recent payments */
      const payments = data.recentPayments || [];
      const payEl = document.getElementById('admRecentPayments');
      if (payments.length === 0) {
        payEl.innerHTML = '<div style="text-align:center;padding:var(--space-md);color:var(--text-muted)">Sin pagos</div>';
      } else {
        payEl.innerHTML = payments.map(p => `<div class="adm-row">
          <div class="adm-avatar">💰</div>
          <div style="flex:1;min-width:0">
            <div class="adm-name">@${escapeHtml(p.username || '?')}</div>
            <div class="adm-email">${p.plan_type || ''} · ${p.status || ''}</div>
          </div>
          <div class="adm-meta">$${Number(p.amount || 0).toFixed(2)}</div>
        </div>`).join('');
      }
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', message: 'Error al cargar admin dashboard' });
    }
  }

  document.querySelectorAll('.adm-stat').forEach(s => {
    s.addEventListener('mouseenter', () => { s.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'; });
    s.addEventListener('mouseleave', () => { s.style.boxShadow = ''; });
  });
  document.querySelectorAll('.adm-quick a, .btn').forEach(b => magneticButton(b));
  await load();
}
