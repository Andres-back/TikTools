/**
 * Timers View — TikToolStream
 * Gestión de timers extensibles con gifts
 */

import { countUp, formatNum, magneticButton, staggerChildren } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');

  let timers = [];
  let editingId = null;
  let tickInterval = null;

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
  function fmtTime(s) { s = Math.max(0, parseInt(s) || 0); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

  function broadcast(type, payload) {
    try {
      const ch = new BroadcastChannel('tts_timer');
      ch.postMessage({ type, ...payload, ts: Date.now() });
      ch.close();
    } catch {}
  }

  target.innerHTML = `
    <style>
      .timers-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-md); }
      .timers-stats { display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-sm); margin-bottom:var(--space-lg); }
      .timers-stats .stat { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.04)); border:1px solid rgba(0,217,255,0.15); border-radius:12px; padding:var(--space-md); text-align:center; }
      .timers-stats .stat .n { font-size:1.4rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .timers-stats .stat .l { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
      .timer-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:var(--space-md); margin-bottom:var(--space-sm); position:relative; overflow:hidden; transition:all 0.3s; }
      .timer-card.active { border-color:rgba(0,255,136,0.4); box-shadow:0 0 24px rgba(0,255,136,0.1); }
      .timer-card.paused { border-color:rgba(255,215,0,0.4); }
      .timer-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, var(--accent-color, rgba(0,217,255,0.4)), transparent); }
      .timer-card.active::before { background:linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent); }
      .timer-card .tc-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); }
      .timer-card .tc-title { font-size:1.1rem; font-weight:700; color:#fff; }
      .timer-card .tc-status { display:inline-block; padding:3px 10px; border-radius:10px; font-size:var(--text-xs); font-weight:700; text-transform:uppercase; letter-spacing:1px; }
      .timer-card .tc-status.active { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
      .timer-card .tc-status.paused { background:rgba(255,215,0,0.15); color:#ffd700; border:1px solid rgba(255,215,0,0.3); }
      .timer-card .tc-status.idle { background:rgba(255,255,255,0.08); color:var(--text-muted); }
      .timer-card .tc-display { font-family: 'Rajdhani', 'Courier New', monospace; font-size:3.5rem; font-weight:800; text-align:center; background:linear-gradient(135deg, #fff, #00d9ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin:var(--space-sm) 0; }
      .timer-card .tc-display.warning { background:linear-gradient(135deg, #fff, #ffd700); -webkit-background-clip:text; background-clip:text; }
      .timer-card .tc-display.danger { background:linear-gradient(135deg, #ff1744, #ff6b6b); -webkit-background-clip:text; background-clip:text; animation: pulseTimer 0.5s ease-in-out infinite; }
      @keyframes pulseTimer { 0%,100%{opacity:1;} 50%{opacity:0.7;} }
      .timer-card .tc-bar { height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden; margin-bottom:var(--space-sm); }
      .timer-card .tc-bar-fill { height:100%; background:linear-gradient(90deg, #00d9ff, #7b2ff7); border-radius:4px; transition:width 1s linear; }
      .timer-card .tc-bar-fill.warning { background:linear-gradient(90deg, #ffd700, #ff6b00); }
      .timer-card .tc-bar-fill.danger { background:linear-gradient(90deg, #ff1744, #ff6b6b); }
      .timer-card .tc-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:var(--space-md); }
      .timer-card .tc-info { display:flex; justify-content:space-between; font-size:var(--text-xs); color:var(--text-muted); margin-top:6px; }
      .timer-card .tc-extend { color:#00d9ff; font-weight:700; }
      .timer-card .tc-paused { color:#ffd700; font-weight:700; animation:pulse 1s ease-in-out infinite; }
    </style>

    <div class="timers-head">
      <div>
        <h1 class="view-title" style="margin-bottom:4px">⏳ Timers Extensibles</h1>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin:0">Countdowns que se extienden con cada gift recibido</p>
      </div>
      <button class="btn btn-primary" id="btnNewTimer">+ Nuevo Timer</button>
    </div>

    <div class="timers-stats">
      <div class="stat"><div class="n" id="statTotal">0</div><div class="l">Total</div></div>
      <div class="stat"><div class="n" id="statActive">0</div><div class="l">Activos</div></div>
      <div class="stat"><div class="n" id="statPaused">0</div><div class="l">Pausados</div></div>
    </div>

    <div id="timersList"><div class="loading-state"><div class="spinner-sm"></div><p>Cargando timers...</p></div></div>

    <div class="modal-overlay" id="timerModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="timerModalTitle">Nuevo Timer</h3>
          <button class="modal-close" id="closeTimerModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-group" style="margin-bottom:var(--space-sm)">
            <label class="input-label">Título</label>
            <input type="text" id="timerTitle" class="input-field" placeholder="Ej: COUNTDOWN SUBATON" value="COUNTDOWN">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-sm)">
            <div class="input-group">
              <label class="input-label">Duración (segundos)</label>
              <input type="number" id="timerDuration" class="input-field" value="300" min="10">
            </div>
            <div class="input-group">
              <label class="input-label">Extensión por gift (s)</label>
              <input type="number" id="timerExtension" class="input-field" value="10" min="1">
            </div>
          </div>
          <div class="input-group" style="margin-bottom:var(--space-md)">
            <label class="input-label">Min. valor de regalo (💎)</label>
            <input type="number" id="timerMinGift" class="input-field" value="1" min="1">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" id="btnSaveTimer" style="flex:1">Crear Timer</button>
            <button class="btn btn-secondary" id="btnCancelTimerEdit" style="display:none">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  function bindNav() {
    target.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); /* navigation would be handled by router */ }, { signal });
    });
  }

  async function loadTimers() {
    try {
      const data = await api.get('/timers', { signal });
      timers = Array.isArray(data) ? data : [];
      renderTimers();
      updateStats();
    } catch (err) {
      console.error(err);
      document.getElementById('timersList').innerHTML = '<div class="error-state"><p>Error al cargar timers</p></div>';
    }
  }

  function updateStats() {
    document.getElementById('statTotal').textContent = timers.length;
    document.getElementById('statActive').textContent = timers.filter(t => t.active && !t.paused).length;
    document.getElementById('statPaused').textContent = timers.filter(t => t.paused).length;
  }

  function renderTimers() {
    const listEl = document.getElementById('timersList');
    if (timers.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><p>Sin timers. Crea uno para empezar.</p></div>';
      return;
    }
    listEl.innerHTML = timers.map(t => {
      const state = t.active ? (t.paused ? 'paused' : 'active') : 'idle';
      const statusLabel = state === 'active' ? '🟢 ACTIVO' : state === 'paused' ? '⏸ PAUSADO' : '⚪ INACTIVO';
      const remaining = t.remaining || 0;
      const duration = t.duration || 1;
      const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));
      const danger = remaining <= 10;
      const warn = remaining <= 30 && !danger;
      return `<div class="timer-card ${state}" data-id="${t.id}">
        <div class="tc-head">
          <div class="tc-title">${escapeHtml(t.title || 'COUNTDOWN')}</div>
          <span class="tc-status ${state}">${statusLabel}</span>
        </div>
        <div class="tc-display ${danger ? 'danger' : warn ? 'warning' : ''}" data-display="${t.id}">${fmtTime(remaining)}</div>
        <div class="tc-bar"><div class="tc-bar-fill ${danger ? 'danger' : warn ? 'warning' : ''}" style="width:${pct}%"></div></div>
        <div class="tc-info">
          <span>Inicio: ${t.started_at ? new Date(t.started_at).toLocaleTimeString() : '—'}</span>
          <span class="tc-extend">+${t.gift_extension || 10}s por gift</span>
        </div>
        ${t.paused ? '<div class="tc-info" style="text-align:center"><span class="tc-paused">⏸ PAUSADO</span></div>' : ''}
        <div class="tc-actions">
          ${!t.active ? `<button class="btn btn-sm btn-success" data-start="${t.id}">▶ Iniciar</button>` : ''}
          ${t.active && !t.paused ? `<button class="btn btn-sm btn-warning" data-pause="${t.id}">⏸ Pausar</button>` : ''}
          ${t.paused ? `<button class="btn btn-sm btn-success" data-resume="${t.id}">▶ Reanudar</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-extend="${t.id}" title="Extender manualmente">+${t.gift_extension || 10}s</button>
          <button class="btn btn-sm btn-ghost" data-edit="${t.id}" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" data-del="${t.id}" title="Eliminar">🗑️</button>
        </div>
      </div>`;
    }).join('');

    staggerChildren(listEl, 'timer-card', 80);
    bindActions();
    document.querySelectorAll('.tc-actions .btn').forEach(b => magneticButton(b));
  }

  function bindActions() {
    const listEl = document.getElementById('timersList');
    listEl.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => controlTimer(b.dataset.start, 'start'), { signal }));
    listEl.querySelectorAll('[data-pause]').forEach(b => b.addEventListener('click', () => controlTimer(b.dataset.pause, 'pause'), { signal }));
    listEl.querySelectorAll('[data-resume]').forEach(b => b.addEventListener('click', () => controlTimer(b.dataset.resume, 'resume'), { signal }));
    listEl.querySelectorAll('[data-extend]').forEach(b => b.addEventListener('click', () => controlTimer(b.dataset.extend, 'extend'), { signal }));
    listEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => startEdit(b.dataset.edit), { signal }));
    listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este timer?')) return;
      try { await api.del(`/timers/${b.dataset.del}`, { signal }); showToast({ type: 'success', message: 'Timer eliminado' }); loadTimers(); } catch (e) { showToast({ type: 'error', message: e.message }); }
    }, { signal }));
  }

  async function controlTimer(id, action) {
    try {
      const result = await api.put(`/timers/${id}/${action}`, {}, { signal });
      showToast({ type: 'success', message: action === 'extend' ? `+${result.gift_extension || 10}s` : `Timer ${action === 'start' ? 'iniciado' : action === 'pause' ? 'pausado' : 'reanudado'}` });
      loadTimers();
      broadcast(`timer_${action}`, result);
    } catch (e) { showToast({ type: 'error', message: e.message || 'Error' }); }
  }

  function startEdit(id) {
    const t = timers.find(x => String(x.id) === String(id));
    if (!t) return;
    editingId = id;
    document.getElementById('timerTitle').value = t.title || '';
    document.getElementById('timerDuration').value = t.duration || 300;
    document.getElementById('timerExtension').value = t.gift_extension || 10;
    document.getElementById('timerMinGift').value = t.min_gift_value || 1;
    document.getElementById('timerModalTitle').textContent = 'Editar Timer';
    document.getElementById('btnSaveTimer').textContent = 'Guardar Cambios';
    document.getElementById('btnCancelTimerEdit').style.display = 'block';
    document.getElementById('timerModal').style.display = 'flex';
  }

  function openModal() {
    editingId = null;
    document.getElementById('timerTitle').value = 'COUNTDOWN';
    document.getElementById('timerDuration').value = '300';
    document.getElementById('timerExtension').value = '10';
    document.getElementById('timerMinGift').value = '1';
    document.getElementById('timerModalTitle').textContent = 'Nuevo Timer';
    document.getElementById('btnSaveTimer').textContent = 'Crear Timer';
    document.getElementById('btnCancelTimerEdit').style.display = 'none';
    document.getElementById('timerModal').style.display = 'flex';
  }

  document.getElementById('btnNewTimer')?.addEventListener('click', openModal, { signal });
  document.getElementById('closeTimerModal')?.addEventListener('click', () => { document.getElementById('timerModal').style.display = 'none'; }, { signal });
  document.getElementById('btnCancelTimerEdit')?.addEventListener('click', () => { document.getElementById('timerModal').style.display = 'none'; }, { signal });

  document.getElementById('btnSaveTimer')?.addEventListener('click', async () => {
    const title = document.getElementById('timerTitle').value.trim() || 'COUNTDOWN';
    const duration = parseInt(document.getElementById('timerDuration').value) || 300;
    const giftExtension = parseInt(document.getElementById('timerExtension').value) || 10;
    const minGiftValue = parseInt(document.getElementById('timerMinGift').value) || 1;
    try {
      if (editingId) {
        await api.put(`/timers/${editingId}`, { title, duration, giftExtension, minGiftValue }, { signal });
        showToast({ type: 'success', message: 'Timer actualizado' });
      } else {
        await api.post('/timers', { title, duration, giftExtension, minGiftValue }, { signal });
        showToast({ type: 'success', message: 'Timer creado' });
      }
      document.getElementById('timerModal').style.display = 'none';
      loadTimers();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error' }); }
  }, { signal });

  /* live tick: only update displays without re-rendering */
  function tick() {
    timers.forEach(t => {
      if (!t.active || t.paused) return;
      const remaining = Math.max(0, (t.remaining || 0) - 1);
      t.remaining = remaining;
      const disp = document.querySelector(`[data-display="${t.id}"]`);
      if (disp) {
        disp.textContent = fmtTime(remaining);
        disp.classList.toggle('warning', remaining <= 30 && remaining > 10);
        disp.classList.toggle('danger', remaining <= 10);
        const card = disp.closest('.timer-card');
        if (card) {
          const bar = card.querySelector('.tc-bar-fill');
          if (bar) {
            bar.style.width = `${Math.max(0, Math.min(100, (remaining / (t.duration || 1)) * 100))}%`;
            bar.classList.toggle('warning', remaining <= 30 && remaining > 10);
            bar.classList.toggle('danger', remaining <= 10);
          }
        }
      }
    });
  }

  await loadTimers();
  tickInterval = setInterval(tick, 1000);

  // GSAP animate timers
    if (typeof gsap !== 'undefined') requestAnimationFrame(() => {
      const statEls = document.querySelectorAll('.timers-stats > .stat');
      if (statEls.length) gsap.from(statEls, { opacity: 0, y: 20, stagger: 0.08, duration: 0.4, ease: 'power2.out' });
    });
  return () => {
    if (tickInterval) clearInterval(tickInterval);
  };
}
