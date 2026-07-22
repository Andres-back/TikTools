/**
 * Auction Detail View — TikToolStream
 * Panel de control con timer, leaderboard en vivo y control manual
 */

export async function mount({ target, api, params, navigate, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');
  const id = params.id;
  let auction = null;
  let donors = [];
  let timerInterval = null;
  let timerState = { remaining: 0, phase: 'idle', initialTime: 120 };
  let isLiveConnected = false; // se conecta cuando hay stream activo

  target.innerHTML = `<div class="loading-state"><div class="spinner-sm"></div><p>Cargando subasta...</p></div>`;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
  function fmt(s) { s = Math.max(0, parseInt(s) || 0); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  function formatNum(n) { if (!n || isNaN(n)) return '0'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return Number(n).toLocaleString(); }

  function loadAuction() {
    api.get(`/auctions/${id}`, { signal }).then(data => {
      auction = data.auction;
      donors = data.donors || [];
      if (!auction) {
        target.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Subasta no encontrada</p><button class="btn btn-primary" onclick="location.href='/app/auctions'">Volver</button></div>`;
        return;
      }
      timerState.initialTime = parseInt(auction.initial_time) || 120;
      if (auction.status === 'active') {
        timerState.phase = 'running';
        timerState.remaining = parseInt(auction.remaining_time) || timerState.initialTime;
        startTimerLoop();
      } else if (auction.status === 'paused') {
        timerState.phase = 'paused';
        timerState.remaining = parseInt(auction.remaining_time) || timerState.initialTime;
      } else {
        timerState.phase = 'idle';
        timerState.remaining = timerState.initialTime;
      }
      render();
    }).catch(err => {
      if (err.name === 'AbortError') return;
      target.innerHTML = `<div class="error-state"><p>Error al cargar</p><button class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>`;
    });
  }

  function render() {
    const statusBadge = auction.status === 'active' ? 'badge-success' : auction.status === 'finished' ? 'badge-info' : 'badge-warning';
    const statusText = auction.status === 'active' ? '🟢 Activa' : auction.status === 'finished' ? '🏁 Finalizada' : '⏸ Pausada';

    target.innerHTML = `
    <style>
      .ac-shell { display:grid; grid-template-columns: 1fr 1fr; gap:var(--space-xl); }
      .ac-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:var(--space-xl); }
      .ac-card-title { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:var(--space-lg); display:flex; align-items:center; gap:8px; }
      .ac-card-title i { color:var(--color-primary); }
      
      /* Timer */
      .ac-timer { text-align:center; }
      .ac-timer-display { font-family:var(--font-display); font-size:clamp(3rem, 8vw, 5.5rem); font-weight:900; background:linear-gradient(135deg, #f1f5f9, var(--color-primary)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; letter-spacing:-2px; transition:all 0.3s; }
      .ac-timer-display.warn { background:linear-gradient(135deg, #f1f5f9, var(--color-warning)); -webkit-background-clip:text; background-clip:text; }
      .ac-timer-display.danger { background:linear-gradient(135deg, var(--color-danger), #f87171); -webkit-background-clip:text; background-clip:text; animation:pulseDanger 0.7s ease-in-out infinite; }
      @keyframes pulseDanger { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.85;transform:scale(1.02);} }
      .ac-timer-phase { font-size:var(--text-xs); text-transform:uppercase; letter-spacing:2px; color:var(--text-muted); margin-top:8px; font-weight:600; }
      .ac-timer-phase.live { color:var(--color-success); }
      .ac-timer-phase.danger { color:var(--color-danger); animation:pulseDanger 0.5s ease-in-out infinite; }
      .ac-timer-bar { height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden; margin-top:var(--space-md); }
      .ac-timer-bar-inner { height:100%; background:var(--color-primary-gradient); border-radius:3px; transition:width 0.3s linear; }
      .ac-timer-bar-inner.warn { background:linear-gradient(90deg, var(--color-warning), #f97316); }
      .ac-timer-bar-inner.danger { background:linear-gradient(90deg, var(--color-danger), #f87171); }

      /* Editable fields */
      .ac-edit-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-md); margin-top:var(--space-lg); }
      .ac-edit-field label { font-size:var(--text-xs); color:var(--text-muted); display:block; margin-bottom:4px; font-weight:600; }
      .ac-edit-field .input-field { padding:8px 10px; font-size:0.85rem; text-align:center; }

      /* Controls */
      .ac-controls { display:flex; gap:var(--space-sm); margin-top:var(--space-lg); }
      .ac-controls .btn { flex:1; }

      /* Leaderboard */
      .ac-lb { display:flex; flex-direction:column; gap:var(--space-md); }
      .ac-lb-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-sm); }
      .ac-lb-stat { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:var(--space-md); text-align:center; }
      .ac-lb-stat .nu { font-family:var(--font-display); font-size:var(--text-xl); font-weight:800; color:var(--text-primary); }
      .ac-lb-stat .lb { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }

      /* Donor rows */
      .ac-donors { max-height:50vh; overflow-y:auto; }
      .ac-donor { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:var(--bg-surface); margin-bottom:4px; border:1px solid var(--border-color); transition:all 0.2s; }
      .ac-donor:hover { border-color:var(--border-hover); }
      .ac-donor.gold { background:linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,0,0.04)); border-color:rgba(255,215,0,0.2); }
      .ac-donor.silver { background:linear-gradient(135deg, rgba(192,192,192,0.08), rgba(192,192,192,0.02)); border-color:rgba(192,192,192,0.15); }
      .ac-donor.bronze { background:linear-gradient(135deg, rgba(205,127,50,0.08), rgba(205,127,50,0.02)); border-color:rgba(205,127,50,0.15); }
      .ac-rank { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; background:var(--bg-card); color:var(--text-secondary); flex-shrink:0; }
      .ac-donor.gold .ac-rank { background:linear-gradient(135deg, #fbbf24, #f97316); color:#1a1a2e; }
      .ac-donor.silver .ac-rank { background:linear-gradient(135deg, #c0c0c0, #808080); color:#1a1a2e; }
      .ac-donor.bronze .ac-rank { background:linear-gradient(135deg, #cd7f32, #8b4513); color:#fff; }
      .ac-avatar { width:34px; height:34px; border-radius:50%; background:var(--color-primary-gradient); display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:0.85rem; flex-shrink:0; overflow:hidden; border:2px solid rgba(255,255,255,0.1); }
      .ac-avatar img { width:100%; height:100%; object-fit:cover; }
      .ac-name { flex:1; font-weight:500; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .ac-coins { font-family:var(--font-display); font-weight:700; color:var(--color-warning); font-size:0.9rem; }
      .ac-crown { color:#fbbf24; font-size:1rem; }

      /* Winner */
      .ac-winner { margin-top:var(--space-md); padding:var(--space-md); background:linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,107,0,0.04)); border:1px solid rgba(255,215,0,0.3); border-radius:var(--border-radius-md); text-align:center; }
      .ac-winner h3 { font-size:1.1rem; background:linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; font-weight:900; }
      .ac-winner .name { font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px; }
      
      /* Manual add */
      .ac-manual { display:flex; gap:var(--space-sm); margin-top:var(--space-md); }
      .ac-manual input { padding:8px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--border-radius-sm); color:var(--text-primary); font-size:0.85rem; }
      .ac-manual input[type="text"] { flex:2; }
      .ac-manual input[type="number"] { flex:1; max-width:100px; }
      .ac-manual button { flex:0; }

      .ac-message-edit { display:flex; gap:var(--space-sm); margin-top:var(--space-md); align-items:center; }
      .ac-message-edit input { flex:1; padding:8px 12px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--border-radius-sm); color:var(--text-primary); font-size:0.85rem; }

      .ac-meta { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-sm); margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--border-color); }
      .ac-meta-item { font-size:var(--text-xs); color:var(--text-muted); }
      .ac-meta-item strong { color:var(--text-secondary); display:block; margin-top:2px; }

      @media (max-width: 1000px) { .ac-shell { grid-template-columns:1fr; } }
    </style>

    <div class="ac-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xl);flex-wrap:wrap;gap:var(--space-md)">
      <div>
        <a href="/app/auctions" data-router-link style="color:var(--text-muted);font-size:var(--text-sm);text-decoration:none">← Volver a Subastas</a>
        <h1 class="view-title" style="margin-bottom:4px;margin-top:4px">${escapeHtml(auction.title || 'Subasta')}</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm)">@${escapeHtml(auction.tiktok_username || '—')} · <span class="badge ${statusBadge}" style="padding:3px 10px">${statusText}</span></p>
      </div>
      <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
        ${auction.status !== 'finished' ? `<button class="btn btn-danger btn-sm" id="btnDelete">🗑️ Eliminar</button>` : ''}
        ${auction.status === 'active' ? `<button class="btn btn-warning" id="btnFinish">🏁 Finalizar</button>` : ''}
      </div>
    </div>

    <div class="ac-shell">
      <!-- LEFT: Timer + Controls -->
      <div class="ac-card ac-timer">
        <div class="ac-card-title"><i class="fa-regular fa-clock"></i> Control de Tiempo</div>
        
        <div class="ac-timer-display" id="timerDisplay">${fmt(timerState.remaining)}</div>
        <div class="ac-timer-phase" id="timerPhase">${timerState.phase === 'idle' ? '⏸ INACTIVO' : timerState.phase === 'running' ? '🟢 EN VIVO' : timerState.phase === 'paused' ? '⏸ PAUSADO' : '🏁 FINALIZADO'}</div>
        <div class="ac-timer-bar"><div class="ac-timer-bar-inner" id="timerBar" style="width:${timerState.initialTime > 0 ? (timerState.remaining / timerState.initialTime) * 100 : 0}%"></div></div>

        <div class="ac-edit-grid">
          <div class="ac-edit-field">
            <label>Tiempo inicial (s)</label>
            <input type="number" id="edtInitialTime" class="input-field" value="${timerState.initialTime}" min="10" max="600">
          </div>
          <div class="ac-edit-field">
            <label>Delay (s)</label>
            <input type="number" id="edtDelay" class="input-field" value="${auction.delay_time || 20}" min="0" max="120">
          </div>
          <div class="ac-edit-field">
            <label>Extensión (s)</label>
            <input type="number" id="edtExtension" class="input-field" value="${auction.extension_time || 10}" min="0" max="60">
          </div>
        </div>

        <div class="ac-controls">
          ${auction.status !== 'finished' ? `
            <button class="btn ${timerState.phase === 'running' ? 'btn-warning' : 'btn-primary'}" id="btnTimerToggle">
              ${timerState.phase === 'running' ? '⏸ Pausar' : timerState.phase === 'paused' ? '▶ Reanudar' : '▶ Iniciar'}
            </button>
            <button class="btn btn-secondary" id="btnTimerReset">🔄 Reset</button>
          ` : ''}
        </div>

        <div class="ac-message-edit">
          <input type="text" id="edtMessage" class="input-field" placeholder="Mensaje del timer" value="${escapeHtml(auction.notes || '')}">
          <button class="btn btn-sm btn-secondary" id="btnSaveMsg">💾</button>
        </div>

        <div class="ac-manual">
          <input type="text" id="manualUser" placeholder="@usuario">
          <input type="number" id="manualCoins" placeholder="💎" min="1" value="100">
          <button class="btn btn-sm btn-primary" id="btnManualAdd">+ Agregar</button>
        </div>

        <!-- Overlay URL -->
        <div class="ac-overlay-url" style="margin-top:var(--space-lg);padding:var(--space-md);background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--border-radius-md)">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:var(--space-sm)">
            <i class="fa-solid fa-layer-group" style="color:var(--color-primary)"></i> Overlay OBS
          </div>
          <div style="display:flex;gap:var(--space-sm)">
            <input type="text" id="acOverlayUrl" class="input-field" style="flex:1;font-family:var(--font-mono);font-size:var(--text-xs);padding:8px 10px" readonly value="${window.location.origin}/overlays/overlay-auction.html?auctionId=${id}&userId=${auction.user_id || ''}">
            <button class="btn btn-primary btn-sm" id="btnCopyOverlay">📋 Copiar</button>
          </div>
        </div>
      </div>

      <!-- RIGHT: Leaderboard -->
      <div class="ac-card ac-lb">
        <div class="ac-card-title"><i class="fa-solid fa-trophy"></i> Top Donantes</div>

        <div class="ac-lb-stats">
          <div class="ac-lb-stat"><div class="nu" id="lbDonors">${donors.length}</div><div class="lb">Donantes</div></div>
          <div class="ac-lb-stat"><div class="nu" id="lbTotalCoins">${formatNum(donors.reduce((s,d) => s + (d.total_coins || 0), 0))}</div><div class="lb">Monedas</div></div>
          <div class="ac-lb-stat"><div class="nu" id="lbTopCoin" style="color:var(--color-warning)">${donors.length > 0 ? formatNum(donors[0].total_coins || 0) : '—'}</div><div class="lb">Mayor</div></div>
        </div>

        <div class="ac-donors" id="donorList">
          ${donors.length === 0 
            ? '<div style="text-align:center;padding:var(--space-lg);color:var(--text-muted)">Esperando donaciones...</div>'
            : donors.map((d, i) => {
                const rank = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                const initial = (d.tiktok_nickname || d.tiktok_unique_id || '?').charAt(0).toUpperCase();
                return `<div class="ac-donor ${rank}">
                  <div class="ac-rank">${i + 1}</div>
                  <div class="ac-avatar">${d.profile_picture_url 
                    ? `<img src="${escapeAttr(d.profile_picture_url)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">`
                    : initial}</div>
                  <div class="ac-name">@${escapeHtml(d.tiktok_nickname || d.tiktok_unique_id || '—')}</div>
                  <div class="ac-coins">💎 ${formatNum(d.total_coins || 0)}</div>
                  ${d.is_winner ? '<span class="ac-crown">👑</span>' : ''}
                </div>`;
              }).join('')
          }
        </div>

        ${auction.winner_username ? `
        <div class="ac-winner">
          <h3>🏆 Ganador</h3>
          <div class="name">@${escapeHtml(auction.winner_username)}</div>
          <div style="color:#ffd700;font-weight:700;margin-top:4px">${formatNum(auction.winner_coins || 0)} 💎</div>
        </div>` : ''}

        <div class="ac-meta">
          <div class="ac-meta-item">Inicio <strong>${auction.started_at ? new Date(auction.started_at).toLocaleString() : '—'}</strong></div>
          <div class="ac-meta-item">Fin <strong>${auction.finished_at ? new Date(auction.finished_at).toLocaleString() : '—'}</strong></div>
        </div>
      </div>
    </div>
    `;

    // Bind events
    document.getElementById('btnTimerToggle')?.addEventListener('click', toggleTimer, { signal });
    document.getElementById('btnTimerReset')?.addEventListener('click', resetTimer, { signal });
    document.getElementById('btnSaveMsg')?.addEventListener('click', saveMessage, { signal });
    document.getElementById('btnManualAdd')?.addEventListener('click', manualAdd, { signal });
    document.getElementById('btnCopyOverlay')?.addEventListener('click', () => {
      const url = document.getElementById('acOverlayUrl');
      if (url) { url.select(); navigator.clipboard?.writeText(url.value); showToast({ type: 'success', message: 'URL copiada' }); }
    }, { signal });
    document.getElementById('btnFinish')?.addEventListener('click', finishAuction, { signal });
    document.getElementById('btnDelete')?.addEventListener('click', deleteAuction, { signal });

    // Auto-save when editing time/delay/extension
    ['edtInitialTime', 'edtDelay', 'edtExtension'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', saveSettings, { signal });
    });
  }

  function tick() {
    if (timerState.phase !== 'running') return;
    timerState.remaining = Math.max(0, timerState.remaining - 1);
    updateTimerDisplay();
    if (timerState.remaining <= 0) {
      clearInterval(timerInterval);
      timerState.phase = 'finished';
      updateTimerDisplay();
    }
  }

  function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const phase = document.getElementById('timerPhase');
    const bar = document.getElementById('timerBar');
    if (!display) return;

    display.textContent = fmt(timerState.remaining);
    display.className = 'ac-timer-display';
    if (timerState.remaining <= 10) display.classList.add('danger');
    else if (timerState.remaining <= 30) display.classList.add('warn');

    if (phase) {
      phase.className = 'ac-timer-phase';
      if (timerState.phase === 'idle') { phase.innerHTML = '⏸ INACTIVO'; phase.className = 'ac-timer-phase'; }
      else if (timerState.phase === 'running') { phase.innerHTML = '🟢 EN VIVO'; phase.className = 'ac-timer-phase live'; }
      else if (timerState.phase === 'paused') { phase.innerHTML = '⏸ PAUSADO'; phase.className = 'ac-timer-phase'; }
      else if (timerState.phase === 'finished') { phase.innerHTML = '🏁 FINALIZADO'; phase.className = 'ac-timer-phase'; }
    }

    if (bar) {
      const pct = timerState.initialTime > 0 ? (timerState.remaining / timerState.initialTime) * 100 : 0;
      bar.style.width = `${Math.max(0, pct)}%`;
      bar.className = 'ac-timer-bar-inner';
      if (timerState.remaining <= 10) bar.classList.add('danger');
      else if (timerState.remaining <= 30) bar.classList.add('warn');
    }

    updateBtnText();
  }

  function updateBtnText() {
    const btn = document.getElementById('btnTimerToggle');
    if (!btn) return;
    if (timerState.phase === 'running') { btn.innerHTML = '⏸ Pausar'; btn.className = 'btn btn-warning'; }
    else if (timerState.phase === 'paused') { btn.innerHTML = '▶ Reanudar'; btn.className = 'btn btn-primary'; }
    else { btn.innerHTML = '▶ Iniciar'; btn.className = 'btn btn-primary'; }
  }

  function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  async function toggleTimer() {
    try {
      if (timerState.phase === 'idle' || timerState.phase === 'finished') {
        // Start
        const initialTime = parseInt(document.getElementById('edtInitialTime').value) || 120;
        timerState.initialTime = initialTime;
        timerState.remaining = initialTime;
        timerState.phase = 'running';
        await api.put(`/auctions/${id}`, { status: 'active', initial_time: initialTime }, { signal });
        startTimerLoop();
        showToast({ type: 'success', message: 'Subasta iniciada' });
      } else if (timerState.phase === 'running') {
        // Pause
        clearInterval(timerInterval);
        timerState.phase = 'paused';
        await api.put(`/auctions/${id}`, { status: 'paused', remaining_time: timerState.remaining }, { signal });
        showToast({ type: 'info', message: 'Subasta pausada' });
      } else if (timerState.phase === 'paused') {
        // Resume
        timerState.phase = 'running';
        await api.put(`/auctions/${id}`, { status: 'active' }, { signal });
        startTimerLoop();
        showToast({ type: 'success', message: 'Subasta reanudada' });
      }
      updateTimerDisplay();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error' });
    }
  }

  async function resetTimer() {
    if (!confirm('¿Resetear el timer?')) return;
    clearInterval(timerInterval);
    const initialTime = parseInt(document.getElementById('edtInitialTime').value) || 120;
    timerState.initialTime = initialTime;
    timerState.remaining = initialTime;
    timerState.phase = 'idle';
    try {
      await api.put(`/auctions/${id}`, { status: 'paused', remaining_time: initialTime, initial_time: initialTime }, { signal });
      showToast({ type: 'info', message: 'Timer reseteado' });
    } catch {}
    updateTimerDisplay();
  }

  async function saveSettings() {
    const initialTime = parseInt(document.getElementById('edtInitialTime').value);
    const delayTime = parseInt(document.getElementById('edtDelay').value);
    const extensionTime = parseInt(document.getElementById('edtExtension').value);
    try {
      await api.put(`/auctions/${id}`, {
        initial_time: initialTime,
        delay_time: delayTime,
        extension_time: extensionTime
      }, { signal });
    } catch {}
  }

  async function saveMessage() {
    const notes = document.getElementById('edtMessage').value.trim();
    try {
      await api.put(`/auctions/${id}`, { notes }, { signal });
      showToast({ type: 'success', message: 'Mensaje guardado' });
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error' });
    }
  }

  async function manualAdd() {
    const user = document.getElementById('manualUser').value.trim();
    const coins = parseInt(document.getElementById('manualCoins').value);
    if (!user) { showToast({ type: 'warning', message: 'Usuario requerido' }); return; }
    if (!coins || coins < 1) { showToast({ type: 'warning', message: 'Monedas inválidas' }); return; }
    try {
      await api.post(`/auctions/${id}/gifts`, {
        tiktokUniqueId: user,
        tiktokNickname: user,
        giftName: 'Manual',
        diamondCount: coins,
        repeatCount: 1
      }, { signal });
      showToast({ type: 'success', message: `+${coins} 💎 para @${user}` });
      document.getElementById('manualCoins').value = '';
      document.getElementById('manualUser').value = '';
      loadAuction();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Error' });
    }
  }

  async function finishAuction() {
    if (!confirm('¿Finalizar esta subasta?')) return;
    try {
      await api.post(`/auctions/${id}/finish`, {}, { signal });
      showToast({ type: 'success', message: 'Subasta finalizada' });
      loadAuction();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }

  async function deleteAuction() {
    if (!confirm('¿Eliminar esta subasta permanentemente?')) return;
    try {
      await api.del(`/auctions/${id}`, { signal });
      showToast({ type: 'success', message: 'Subasta eliminada' });
      navigate('/app/auctions');
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }

  loadAuction();

  return () => {
    if (timerInterval) clearInterval(timerInterval);
  };
}
