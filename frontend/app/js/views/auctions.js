/**
 * Auctions List View — TikToolStream
 * Premium list with filters, search, pagination and stats
 */

export async function mount({ target, api, navigate, signal }) {
  let allAuctions = [];
  let filter = 'all';
  let search = '';
  let page = 1;
  const pageSize = 12;

  target.innerHTML = `
    <style>
      .auctions-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-md); }
      .auctions-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .auctions-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .auctions-stats .stat-num { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .auctions-stats .stat-label { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
      .auctions-filters { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
      .filter-chip { padding:6px 14px; border-radius:20px; border:1px solid var(--border-color); background:transparent; color:var(--text-secondary); cursor:pointer; font-size:var(--text-sm); font-weight:600; transition:all 0.2s; font-family:inherit; }
      .filter-chip:hover { background:rgba(0,217,255,0.06); border-color:rgba(0,217,255,0.3); }
      .filter-chip.active { background:linear-gradient(135deg, rgba(0,217,255,0.2), rgba(123,47,247,0.15)); border-color:rgba(0,217,255,0.5); color:#00d9ff; }
      .search-input { padding:8px 14px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:10px; color:#fff; font-size:var(--text-sm); width:240px; }
      .auctions-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:var(--space-md); }
      .auction-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); cursor:pointer; transition:all 0.3s; position:relative; overflow:hidden; animation: cardIn 0.4s var(--ease-smooth) backwards; }
      .auction-card:nth-child(1){animation-delay:0ms} .auction-card:nth-child(2){animation-delay:40ms} .auction-card:nth-child(3){animation-delay:80ms} .auction-card:nth-child(4){animation-delay:120ms} .auction-card:nth-child(5){animation-delay:160ms} .auction-card:nth-child(6){animation-delay:200ms}
      @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      .auction-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .auction-card:hover { transform:translateY(-3px); border-color:rgba(0,217,255,0.3); box-shadow:0 12px 30px rgba(0,0,0,0.4); }
      .auction-card .ac-status { display:inline-block; padding:3px 10px; border-radius:10px; font-size:var(--text-xs); font-weight:700; text-transform:uppercase; letter-spacing:1px; }
      .auction-card .ac-status.active { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
      .auction-card .ac-status.finished { background:rgba(0,217,255,0.15); color:#00d9ff; border:1px solid rgba(0,217,255,0.3); }
      .auction-card .ac-status.paused { background:rgba(255,215,0,0.15); color:#ffd700; border:1px solid rgba(255,215,0,0.3); }
      .auction-card .ac-title { font-size:1.1rem; font-weight:700; color:#fff; margin:var(--space-sm) 0 4px; }
      .auction-card .ac-user { color:var(--text-muted); font-size:var(--text-sm); }
      .auction-card .ac-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:var(--space-md); padding-top:var(--space-sm); border-top:1px solid var(--border-color); }
      .auction-card .ac-stat { text-align:center; }
      .auction-card .ac-stat-val { font-weight:700; color:#00d9ff; font-size:var(--text-sm); }
      .auction-card .ac-stat-lbl { font-size:var(--text-xs); color:var(--text-muted); }
      .auction-card .ac-winner { margin-top:var(--space-sm); padding:6px 10px; background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.05)); border:1px solid rgba(255,215,0,0.3); border-radius:8px; font-size:var(--text-xs); color:#ffd700; font-weight:700; }
      .pagination { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:var(--space-lg); }
      .pagination button { padding:6px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:var(--text-secondary); cursor:pointer; font-size:var(--text-sm); font-family:inherit; }
      .pagination button:hover:not(:disabled) { background:rgba(0,217,255,0.1); border-color:rgba(0,217,255,0.3); color:#00d9ff; }
      .pagination button:disabled { opacity:0.4; cursor:not-allowed; }
      .pagination .page-info { color:var(--text-muted); font-size:var(--text-sm); min-width:120px; text-align:center; }
      .empty-state { text-align:center; padding:var(--space-xl); }
      @media (max-width: 720px) { .auctions-stats { grid-template-columns:repeat(2, 1fr); } .auctions-grid { grid-template-columns:1fr; } }
    </style>

    <div class="auctions-head">
      <h1 class="view-title" style="margin-bottom:0">🏆 Subastas</h1>
      <button class="btn btn-primary" id="btnNewAuction">+ Nueva Subasta</button>
    </div>

    <div class="auctions-stats">
      <div class="stat"><div class="stat-num" id="statTotal">0</div><div class="stat-label">Total</div></div>
      <div class="stat"><div class="stat-num" id="statActive">0</div><div class="stat-label">Activas</div></div>
      <div class="stat"><div class="stat-num" id="statFinished">0</div><div class="stat-label">Finalizadas</div></div>
      <div class="stat"><div class="stat-num" id="statCoins">0</div><div class="stat-label">💎 Recaudado</div></div>
    </div>

    <div class="auctions-head">
      <div class="auctions-filters" id="filtersBar">
        <button class="filter-chip active" data-filter="all">Todas</button>
        <button class="filter-chip" data-filter="active">🟢 Activas</button>
        <button class="filter-chip" data-filter="finished">🏁 Finalizadas</button>
        <button class="filter-chip" data-filter="paused">⏸ Pausadas</button>
      </div>
      <input type="text" class="search-input" id="searchInput" placeholder="🔍 Buscar título o @usuario...">
    </div>

    <div id="auctionList"><div class="loading-state"><div class="spinner-sm"></div><p>Cargando subastas...</p></div></div>
    <div class="pagination" id="pagination" style="display:none"></div>
  `;

  function bindNav(container) {
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.nav);
      }, { signal });
    });
  }

  document.getElementById('btnNewAuction')?.addEventListener('click', () => navigate('/app/auctions/new'), { signal });
  bindNav(target);

  document.getElementById('filtersBar')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    page = 1;
    render();
  }, { signal });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    search = e.target.value.toLowerCase();
    page = 1;
    render();
  }, { signal });

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function getFiltered() {
    let data = allAuctions;
    if (filter !== 'all') data = data.filter(a => a.status === filter);
    if (search) {
      data = data.filter(a => (a.title || '').toLowerCase().includes(search) || (a.tiktok_username || '').toLowerCase().includes(search));
    }
    return data;
  }

  function render() {
    const listEl = document.getElementById('auctionList');
    const pagEl = document.getElementById('pagination');
    if (!listEl) return;
    const filtered = getFiltered();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    if (total === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">🏆</div><p>${search || filter !== 'all' ? 'No hay subastas que coincidan.' : 'No tienes subastas aún.'}</p><button class="btn btn-primary" data-nav="/app/auctions/new">${search || filter !== 'all' ? 'Crear nueva' : 'Crear primera subasta'}</button></div>`;
      pagEl.style.display = 'none';
      bindNav(listEl);
      return;
    }

    listEl.innerHTML = `<div class="auctions-grid">${slice.map(a => {
      const statusClass = a.status || 'active';
      const statusLabel = statusClass === 'active' ? '🟢 Activa' : statusClass === 'finished' ? '🏁 Finalizada' : statusClass === 'paused' ? '⏸ Pausada' : statusClass;
      return `<div class="auction-card" data-id="${a.id}">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <span class="ac-status ${statusClass}">${statusLabel}</span>
          <span style="font-size:var(--text-xs);color:var(--text-muted)">${a.started_at ? new Date(a.started_at).toLocaleDateString() : '—'}</span>
        </div>
        <div class="ac-title">${escapeHtml(a.title || 'Sin título')}</div>
        <div class="ac-user">@${escapeHtml(a.tiktok_username || '—')}</div>
        <div class="ac-stats">
          <div class="ac-stat"><div class="ac-stat-val">💎 ${(a.total_coins_collected || 0).toLocaleString()}</div><div class="ac-stat-lbl">Monedas</div></div>
          <div class="ac-stat"><div class="ac-stat-val">🎁 ${a.total_gifts_received || 0}</div><div class="ac-stat-lbl">Regalos</div></div>
          <div class="ac-stat"><div class="ac-stat-val">👥 ${a.unique_donors || 0}</div><div class="ac-stat-lbl">Donantes</div></div>
        </div>
        ${a.winner_username ? `<div class="ac-winner">🏆 Ganador: @${escapeHtml(a.winner_username)}</div>` : ''}
      </div>`;
    }).join('')}</div>`;

    listEl.querySelectorAll('[data-id]').forEach(el => {
      el.addEventListener('click', () => navigate(`/app/auctions/${el.dataset.id}`), { signal });
    });

    /* pagination */
    if (totalPages > 1) {
      pagEl.style.display = 'flex';
      pagEl.innerHTML = `
        <button id="pgFirst" ${page === 1 ? 'disabled' : ''}>«</button>
        <button id="pgPrev" ${page === 1 ? 'disabled' : ''}>‹</button>
        <span class="page-info">Página ${page} de ${totalPages} · ${total} total</span>
        <button id="pgNext" ${page === totalPages ? 'disabled' : ''}>›</button>
        <button id="pgLast" ${page === totalPages ? 'disabled' : ''}>»</button>
      `;
      pagEl.querySelector('#pgFirst')?.addEventListener('click', () => { page = 1; render(); }, { signal });
      pagEl.querySelector('#pgPrev')?.addEventListener('click', () => { page--; render(); }, { signal });
      pagEl.querySelector('#pgNext')?.addEventListener('click', () => { page++; render(); }, { signal });
      pagEl.querySelector('#pgLast')?.addEventListener('click', () => { page = totalPages; render(); }, { signal });
    } else {
      pagEl.style.display = 'none';
    }
  }

  function updateStats() {
    const total = allAuctions.length;
    const active = allAuctions.filter(a => a.status === 'active').length;
    const finished = allAuctions.filter(a => a.status === 'finished').length;
    const coins = allAuctions.reduce((s, a) => s + (a.total_coins_collected || 0), 0);
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statActive').textContent = active;
    document.getElementById('statFinished').textContent = finished;
    document.getElementById('statCoins').textContent = coins.toLocaleString();
  }

  try {
    const data = await api.get('/auctions', { signal });
    allAuctions = data.auctions || data || [];
    updateStats();
    render();
  } catch (err) {
    if (err.name === 'AbortError') return;
    document.getElementById('auctionList').innerHTML = `<div class="error-state"><p>Error al cargar subastas</p><button class="btn btn-primary" id="retryAuctions">Reintentar</button></div>`;
    document.getElementById('retryAuctions')?.addEventListener('click', () => location.reload());
  }
  // GSAP animate auctions
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const stats = document.querySelectorAll('.auctions-stats > .stat');
      if (stats.length) gsap.from(stats, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: 'power2.out' });
    });
}
