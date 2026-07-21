/**
 * Auction Detail View — TikToolStream
 * Premium detail with top donors, gift breakdown and stats
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, params, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');
  const id = params.id;
  target.innerHTML = `<div class="loading-state"><div class="spinner-sm"></div><p>Cargando subasta...</p></div>`;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
  function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleString(); }

  function bindNav() {
    target.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.nav);
      }, { signal });
    });
  }

  try {
    const data = await api.get(`/auctions/${id}`, { signal });
    const a = data.auction;
    const donors = data.donors || [];
    const gifts = data.gifts || [];

    if (!a) {
      target.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Subasta no encontrada</p><button class="btn btn-primary" data-nav="/app/auctions">Volver</button></div>`;
      bindNav();
      return;
    }

    // Top gifts aggregation
    const giftMap = {};
    gifts.forEach(g => {
      const k = g.gift_name || g.gift_id || 'Regalo';
      if (!giftMap[k]) giftMap[k] = { name: k, count: 0, coins: 0, image: g.image };
      giftMap[k].count += g.repeat_count || 1;
      giftMap[k].coins += g.total_coins || 0;
    });
    const topGifts = Object.values(giftMap).sort((a, b) => b.coins - a.coins).slice(0, 5);
    const maxGiftCoins = topGifts[0]?.coins || 1;

    target.innerHTML = `
      <style>
        .ad-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-lg); flex-wrap:wrap; gap:var(--space-md); }
        .ad-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
        .ad-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:14px; padding:var(--space-md); text-align:center; }
        .ad-stats .stat .ic { font-size:1.4rem; margin-bottom:4px; }
        .ad-stats .stat .nu { font-size:1.5rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .ad-stats .stat .lb { font-size:var(--text-xs); color:var(--text-muted); }
        .ad-grid { display:grid; grid-template-columns: 1.2fr 1fr; gap:var(--space-lg); }
        .ad-section { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); }
        .ad-section h3 { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: var(--space-md); font-weight: 600; }
        .donor-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,0.03); margin-bottom:6px; border:1px solid transparent; transition:all 0.2s; }
        .donor-row:hover { background:rgba(0,217,255,0.06); border-color:rgba(0,217,255,0.15); }
        .donor-row.gold { background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.04)); border-color:rgba(255,215,0,0.3); }
        .donor-row.silver { background:linear-gradient(135deg, rgba(192,192,192,0.1), rgba(192,192,192,0.03)); border-color:rgba(192,192,192,0.25); }
        .donor-row.bronze { background:linear-gradient(135deg, rgba(205,127,50,0.1), rgba(205,127,50,0.03)); border-color:rgba(205,127,50,0.25); }
        .dr-rank { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; background:rgba(255,255,255,0.06); }
        .donor-row.gold .dr-rank { background:linear-gradient(135deg, #ffd700, #ff6b00); color:#1a1a2e; }
        .donor-row.silver .dr-rank { background:linear-gradient(135deg, #c0c0c0, #808080); color:#1a1a2e; }
        .donor-row.bronze .dr-rank { background:linear-gradient(135deg, #cd7f32, #8b4513); color:#fff; }
        .dr-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:0.9rem; overflow:hidden; border:2px solid rgba(255,255,255,0.15); flex-shrink:0; }
        .dr-avatar img { width:100%; height:100%; object-fit:cover; }
        .dr-name { flex:1; min-width:0; font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .dr-coins { font-weight:700; color:#ffd700; font-size:0.95rem; }
        .gift-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.03); margin-bottom:6px; }
        .gift-img { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; font-size:1.3rem; overflow:hidden; flex-shrink:0; }
        .gift-img img { width:100%; height:100%; object-fit:contain; }
        .gift-name { flex:1; min-width:0; font-size:0.85rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .gift-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; }
        .gift-bar { height:100%; background:linear-gradient(90deg, #00d9ff, #7b2ff7); border-radius:3px; }
        .gift-coins { font-size:var(--text-xs); color:#ffd700; font-weight:700; min-width:60px; text-align:right; }
        .ad-meta { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); margin-bottom:var(--space-lg); display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:var(--space-sm); }
        .meta-item { font-size:var(--text-sm); }
        .meta-label { color:var(--text-muted); font-size:var(--text-xs); margin-bottom:2px; }
        .meta-value { font-weight:600; }
        /* winner card with animated gradient border */
        .winner-crown { position:relative; padding:var(--space-md); background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border-radius:16px; margin-bottom:var(--space-lg); overflow:hidden; }
        .winner-crown::before { content:''; position:absolute; inset:-2px; background:linear-gradient(45deg, #ffd700, #ff6b00, #00f5ff, #ffd700); background-size:400% 400%; border-radius:18px; z-index:-1; animation: borderRotate 4s linear infinite; }
        .winner-crown-inner { background:linear-gradient(160deg, rgba(20,25,45,0.98), rgba(15,20,40,0.98)); border-radius:14px; padding:var(--space-md); text-align:center; position:relative; }
        .winner-crown-inner h2 { font-size:1.4rem; background:linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; font-weight:900; margin-bottom:4px; }
        .winner-crown-inner .crown { font-size:2rem; }
        @keyframes borderRotate { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        /* stagger for donor list */
        .donor-row { animation: donorSlide 0.5s var(--ease-smooth) backwards; }
        @keyframes donorSlide { from { opacity:0; transform:translateX(-15px); } to { opacity:1; transform:translateX(0); } }
        @media (max-width: 900px) { .ad-grid { grid-template-columns: 1fr; } .ad-stats { grid-template-columns:repeat(2, 1fr); } }
      </style>

      <div class="ad-head">
        <div>
          <button class="btn btn-ghost btn-sm" data-nav="/app/auctions" style="margin-bottom:6px">← Volver</button>
          <h1 class="view-title" style="margin-bottom:4px">${escapeHtml(a.title || 'Subasta')}</h1>
          <p style="color:var(--text-muted);font-size:var(--text-sm)">@${escapeHtml(a.tiktok_username || '—')}</p>
        </div>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <span class="badge ${a.status === 'active' ? 'badge-success' : a.status === 'finished' ? 'badge-info' : 'badge-warning'}" style="font-size:var(--text-sm);padding:6px 14px;align-self:center">${a.status || '—'}</span>
          ${a.status === 'active' ? '<button class="btn btn-warning" id="btnFinish">🏁 Finalizar</button>' : ''}
          <button class="btn btn-danger btn-ghost" id="btnDelete">🗑️ Eliminar</button>
        </div>
      </div>

      <div class="ad-stats">
        <div class="stat"><div class="ic">💎</div><div class="nu" data-count="coins" data-value="${a.total_coins_collected || 0}">0</div><div class="lb">Monedas</div></div>
        <div class="stat"><div class="ic">🎁</div><div class="nu" data-count="gifts" data-value="${a.total_gifts_received || 0}">0</div><div class="lb">Regalos</div></div>
        <div class="stat"><div class="ic">👥</div><div class="nu" data-count="donors" data-value="${a.unique_donors || 0}">0</div><div class="lb">Donantes</div></div>
        <div class="stat"><div class="ic">🏆</div><div class="nu" style="font-size:1.1rem">${a.winner_username ? '@' + escapeHtml(a.winner_username) : '—'}</div><div class="lb">Ganador</div></div>
      </div>

      ${a.winner_username ? `
        <div class="winner-crown">
          <div class="winner-crown-inner">
            <div class="crown">👑</div>
            <h2>🏆 ${escapeHtml(a.title || 'Subasta')} — Ganador</h2>
            <div style="font-size:1.6rem;font-weight:800;color:#fff;margin-top:6px">@${escapeHtml(a.winner_username)}</div>
            <div style="color:#ffd700;font-weight:700;margin-top:4px">${formatNum(a.winner_coins || 0)} 💎</div>
          </div>
        </div>
      ` : ''}

      <div class="ad-meta">
        <div class="meta-item"><div class="meta-label">Inicio</div><div class="meta-value">${fmtDate(a.started_at)}</div></div>
        <div class="meta-item"><div class="meta-label">Fin</div><div class="meta-value">${fmtDate(a.finished_at)}</div></div>
        <div class="meta-item"><div class="meta-label">Tiempo inicial</div><div class="meta-value">${a.initial_time || 120}s</div></div>
        <div class="meta-item"><div class="meta-label">Delay entre regalos</div><div class="meta-value">${a.delay_time || 20}s</div></div>
      </div>

      <div class="ad-grid">
        <div class="ad-section">
          <h3>🏆 Top Donantes (${donors.length})</h3>
          ${donors.length === 0 ? '<div style="color:var(--text-muted);padding:var(--space-md);text-align:center">Sin donantes</div>' :
            `<div>${donors.slice(0, 20).map((d, i) => {
              const rk = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
              const initial = (d.tiktok_nickname || d.tiktok_unique_id || '?').charAt(0).toUpperCase();
              return `<div class="donor-row ${rk}" style="animation-delay:${i * 50}ms">
                <div class="dr-rank">${i + 1}</div>
                <div class="dr-avatar">${d.profile_picture_url ? `<img src="${escapeAttr(d.profile_picture_url)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">` : initial}</div>
                <div class="dr-name">@${escapeHtml(d.tiktok_nickname || d.tiktok_unique_id || '—')}</div>
                <div class="dr-coins">💎 ${(d.total_coins || 0).toLocaleString()}</div>
                ${d.is_winner ? '<span style="font-size:1.2rem">👑</span>' : ''}
              </div>`;
            }).join('')}</div>`}
        </div>

        <div class="ad-section">
          <h3>🎁 Top Regalos (${topGifts.length})</h3>
          ${topGifts.length === 0 ? '<div style="color:var(--text-muted);padding:var(--space-md);text-align:center">Sin regalos</div>' :
            `<div>${topGifts.map(g => {
              const pct = (g.coins / maxGiftCoins) * 100;
              return `<div class="gift-row">
                <div class="gift-img">${g.image ? `<img src="${escapeAttr(g.image)}" onerror="this.style.display='none';this.parentNode.textContent='🎁'">` : '🎁'}</div>
                <div class="gift-name">${escapeHtml(g.name)}</div>
                <div class="gift-bar-wrap"><div class="gift-bar" style="width:${pct}%"></div></div>
                <div class="gift-coins">${g.coins.toLocaleString()}</div>
              </div>`;
            }).join('')}</div>`}
        </div>
      </div>
    `;

    document.getElementById('btnFinish')?.addEventListener('click', async () => {
      if (!confirm('¿Finalizar esta subasta?')) return;
      try {
        await api.post(`/auctions/${id}/finish`, {}, { signal });
        showToast({ type: 'success', message: 'Subasta finalizada' });
        navigate(`/app/auctions/${id}`);
      } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
    }, { signal });

    document.getElementById('btnDelete')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta subasta permanentemente?')) return;
      try {
        await api.del(`/auctions/${id}`, { signal });
        showToast({ type: 'success', message: 'Subasta eliminada' });
        navigate('/app/auctions');
      } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
    }, { signal });

    /* countUp stats */
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.value, 10) || 0;
      countUp(el, 0, target, 1400);
    });

    /* magnetic buttons */
    document.querySelectorAll('.ad-head .btn').forEach(b => magneticButton(b));

    /* bind data-nav clicks (replaces inline onclick) */
    bindNav();

  } catch (err) {
    if (err.name === 'AbortError') return;
    target.innerHTML = `<div class="error-state"><p>Error al cargar la subasta</p><button class="btn btn-primary" data-nav="/app/auctions">Volver</button></div>`;
    bindNav();
  }

  return () => { target.innerHTML = ''; };
}
