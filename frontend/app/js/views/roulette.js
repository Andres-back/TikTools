/**
 * Roulette View — TikToolStream
 * Premium canvas roulette with live overlay sync + backend persistence
 */

import { spawnConfetti, countUp, formatNum, magneticButton, staggerChildren } from '/app/js/core/visual-helpers.js';

export async function mount({ target, api, signal, toast }) {
  let participants = [];
  let spinning = false;
  let currentAngle = 0;
  let targetAngle = 0;
  let animFrame = null;
  let winner = null;

  const overlayChannel = (() => {
    try { return new BroadcastChannel('tts_roulette'); } catch { return null; }
  })();

  target.innerHTML = `
    <style>
      .roulette-page { position:relative; }
      .roulette-page::before {
        content: '';
        position: absolute;
        top: -20px; left: -20px; right: -20px; bottom: -20px;
        background-color: transparent;
        background-image:
          radial-gradient(at 20% 30%, rgba(255, 0, 110, 0.18) 0px, transparent 50%),
          radial-gradient(at 80% 20%, rgba(0, 245, 255, 0.15) 0px, transparent 50%),
          radial-gradient(at 50% 80%, rgba(139, 92, 246, 0.18) 0px, transparent 50%),
          radial-gradient(at 10% 90%, rgba(255, 215, 0, 0.12) 0px, transparent 50%);
        animation: meshShiftRoulette 12s ease-in-out infinite alternate;
        z-index: -1;
        pointer-events: none;
        border-radius: 16px;
      }
      @keyframes meshShiftRoulette {
        0%   { filter: hue-rotate(0deg)  saturate(1); }
        100% { filter: hue-rotate(40deg) saturate(1.3); }
      }
      .roulette-shell { display:grid; grid-template-columns: 1fr 360px; gap:var(--space-lg); position:relative; }
      .roulette-stage { position:relative; display:flex; flex-direction:column; align-items:center; gap:var(--space-md); }
      .wheel-wrap {
        position: relative;
        width: 480px; height: 480px;
        max-width: 80vw; max-height: 60vh;
        aspect-ratio: 1;
        filter: drop-shadow(0 20px 60px rgba(0, 217, 255, 0.3));
      }
      .wheel-wrap canvas { width:100%; height:100%; display:block; }
      .wheel-pointer {
        position: absolute;
        top: -8px; left: 50%;
        transform: translateX(-50%);
        z-index: 5;
        filter: drop-shadow(0 4px 12px rgba(255, 215, 0, 0.6));
      }
      .wheel-center {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 90px; height: 90px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(15,15,30,0.95), rgba(25,20,45,0.95));
        border: 3px solid var(--neon-gold);
        display:flex; align-items:center; justify-content:center;
        font-size: 28px;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        z-index: 3;
      }
      .wheel-status {
        text-align:center;
        font-size:var(--text-base);
        font-weight:600;
        color:var(--text-muted);
        min-height: 1.4em;
      }
      .wheel-status.won { font-size: 1.4rem; background: linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-weight:800; }
      .controls-row { display:flex; gap:var(--space-sm); flex-wrap:wrap; justify-content:center; }
      .controls-row .btn { min-width: 140px; font-weight: 700; }
      .participants-panel { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:var(--space-md); box-shadow:0 10px 40px rgba(0,0,0,0.3); max-height: 70vh; overflow-y:auto; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
      .participants-panel h3 { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: var(--space-md); font-weight: 600; }
      .participant-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,0.03); margin-bottom:6px; border:1px solid transparent; transition:all 0.2s; animation: rowIn 0.3s var(--ease-smooth) backwards; }
      .participant-row:nth-child(1){animation-delay:0ms} .participant-row:nth-child(2){animation-delay:30ms} .participant-row:nth-child(3){animation-delay:60ms} .participant-row:nth-child(4){animation-delay:90ms} .participant-row:nth-child(5){animation-delay:120ms}
      @keyframes rowIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
      .participant-row:hover { background:rgba(0,217,255,0.06); border-color:rgba(0,217,255,0.15); }
      .participant-row .pa-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:0.8rem; overflow:hidden; flex-shrink:0; }
      .participant-row .pa-avatar img { width:100%; height:100%; object-fit:cover; }
      .participant-row .pa-name { flex:1; min-width:0; font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .participant-row .pa-entries { background:linear-gradient(135deg, #00d9ff, #7b2ff7); color:#fff; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:8px; }
      .participant-row .pa-rm { background:transparent; border:none; color:#ff6b6b; cursor:pointer; font-size:1rem; padding:2px 6px; }
      .participant-row .pa-rm:hover { background:rgba(255,107,107,0.15); border-radius:4px; }
      .participant-row.won { background:linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,107,0,0.05)); border-color:rgba(255,215,0,0.4); }
      .add-row { display:flex; gap:6px; margin-top:var(--space-md); }
      .add-row input { flex:1; min-width:0; padding:8px 10px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:#fff; font-size:0.85rem; }
      .add-row input[type=number] { width: 70px; flex: 0 0 70px; }
      .add-row button { padding: 8px 14px; }
      .stats-mini { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:var(--space-md); }
      .stats-mini .sm { background:rgba(0,217,255,0.06); border:1px solid rgba(0,217,255,0.12); border-radius:8px; padding:8px 4px; text-align:center; }
      .stats-mini .sm .n { font-weight:800; font-size:1.1rem; color:#00d9ff; }
      .stats-mini .sm .l { font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; }
      @media (max-width: 960px) { .roulette-shell { grid-template-columns: 1fr; } }
    </style>

    <h1 class="view-title" style="margin-bottom:var(--space-md)">🎰 Ruleta de la Suerte</h1>

    <div class="roulette-page">
      <div class="roulette-shell">
        <div class="roulette-stage">
          <div class="wheel-wrap">
            <canvas id="rouletteCanvas" width="960" height="960"></canvas>
            <div class="wheel-center">🎯</div>
            <div class="wheel-pointer">
              <svg width="48" height="64" viewBox="0 0 48 64" fill="none">
                <path d="M24 64L46 28H2L24 64Z" fill="#FFD700" stroke="#1A1A2E" stroke-width="3"/>
                <circle cx="24" cy="22" r="16" fill="#FFD700" stroke="#1A1A2E" stroke-width="3"/>
              </svg>
            </div>
          </div>
          <div class="wheel-status" id="wheelStatus">Cargando participantes…</div>
          <div class="controls-row">
            <button class="btn btn-primary" id="btnSpin" disabled>🎰 Girar Ruleta</button>
            <button class="btn btn-secondary" id="btnReset" disabled>↺ Reiniciar</button>
            <button class="btn btn-ghost" id="btnOpenOverlay" style="border:1px solid var(--border-color)">🎥 Ver Overlay</button>
          </div>
        </div>

        <div class="participants-panel">
          <h3>👥 Participantes</h3>
          <div class="stats-mini">
            <div class="sm"><div class="n" id="smCount">0</div><div class="l">Total</div></div>
            <div class="sm"><div class="n" id="smEntries">0</div><div class="l">Entradas</div></div>
            <div class="sm"><div class="n" id="smWins">0</div><div class="l">Ganados</div></div>
          </div>
          <div id="participantsList"><div style="text-align:center;color:var(--text-muted);padding:var(--space-lg);font-size:0.85rem">Cargando...</div></div>
          <div class="add-row">
            <input type="text" id="addName" placeholder="@usuario">
            <input type="number" id="addEntries" min="1" value="1">
            <button class="btn btn-primary btn-sm" id="btnAdd">+</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('rouletteCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('wheelStatus');
  const listEl = document.getElementById('participantsList');
  const spinBtn = document.getElementById('btnSpin');
  const resetBtn = document.getElementById('btnReset');

  const COLORS = ['#00d9ff', '#7b2ff7', '#ffd700', '#ff6b00', '#00ff88', '#ff1744', '#9d4edd', '#ffd23f', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function drawWheel() {
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,25,45,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 40px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Vacío', cx, cy);
      return;
    }

    const totalEntries = participants.reduce((s, p) => s + (p.entries || 1), 0);
    let startAngle = currentAngle;

    participants.forEach((p, i) => {
      const slice = ((p.entries || 1) / totalEntries) * Math.PI * 2;
      const endAngle = startAngle + slice;
      const color = COLORS[i % COLORS.length];

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, color + 'CC');
      grad.addColorStop(1, color + '66');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,30,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Montserrat, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      const label = p.displayName || p.uniqueId || '?';
      const maxLen = 14;
      const text = label.length > maxLen ? label.substring(0, maxLen) + '…' : label;
      ctx.fillText(text, radius - 30, 0);
      ctx.restore();

      startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,10,30,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function renderList() {
    if (!listEl) return;
    if (participants.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:var(--space-lg);font-size:0.85rem">Sin participantes. Agrega abajo.</div>';
    } else {
      const sorted = [...participants].sort((a, b) => (b.entries || 1) - (a.entries || 1));
      listEl.innerHTML = sorted.map(p => {
        const initial = (p.displayName || p.uniqueId || '?').charAt(0).toUpperCase();
        const isWinner = winner && p.uniqueId === winner.uniqueId;
        return `<div class="participant-row ${isWinner ? 'won' : ''}">
          <div class="pa-avatar">${p.profileImage || p.profile_image ? `<img src="${escapeAttr(p.profileImage || p.profile_image)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">` : initial}</div>
          <div class="pa-name">@${escapeHtml(p.displayName || p.uniqueId)}</div>
          <div class="pa-entries">×${p.entries || 1}</div>
          <button class="pa-rm" data-rm="${escapeAttr(p.uniqueId)}" title="Quitar">✕</button>
        </div>`;
      }).join('');

      listEl.querySelectorAll('[data-rm]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.rm;
          try {
            await api.del(`/roulette/participants/${encodeURIComponent(uid)}`, { signal });
            participants = participants.filter(p => p.uniqueId !== uid);
            winner = null;
            renderList();
            drawWheel();
            broadcast('participants_update', { participants });
          } catch (e) { toast?.showToast?.({ type: 'error', message: e.message || 'Error al eliminar' }); }
        }, { signal });
      });
    }
    updateStats();
  }

  function updateStats() {
    const count = participants.length;
    const entries = participants.reduce((s, p) => s + (p.entries || 1), 0);
    document.getElementById('smCount').textContent = count;
    document.getElementById('smEntries').textContent = entries;
    document.getElementById('smWins').textContent = winner ? '1' : '0';
    const hasData = participants.length > 0;
    spinBtn.disabled = !hasData || spinning;
    resetBtn.disabled = !hasData;
    statusEl.textContent = hasData
      ? (spinning ? '🎰 Girando…' : `${participants.length} participante(s) · ${entries} entradas`)
      : 'Agrega participantes para empezar';
  }

  function broadcast(type, payload) {
    if (!overlayChannel) return;
    try { overlayChannel.postMessage({ type, ...payload, ts: Date.now() }); } catch {}
  }

  function pickWinnerWeighted() {
    const total = participants.reduce((s, p) => s + (p.entries || 1), 0);
    if (total === 0) return null;
    let r = Math.random() * total;
    for (const p of participants) {
      r -= (p.entries || 1);
      if (r <= 0) return p;
    }
    return participants[0];
  }

  function spin() {
    if (spinning || participants.length === 0) return;
    spinning = true;
    winner = pickWinnerWeighted();
    if (!winner) { spinning = false; return; }

    const totalEntries = participants.reduce((s, p) => s + (p.entries || 1), 0);
    let acc = 0;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const slice = ((p.entries || 1) / totalEntries) * Math.PI * 2;
      if (p.uniqueId === winner.uniqueId) {
        const mid = acc + slice / 2;
        const extraSpins = 6 + Math.floor(Math.random() * 3);
        targetAngle = -mid + (Math.PI * 2) * extraSpins + (Math.random() - 0.5) * 0.15;
        break;
      }
      acc += slice;
    }

    const startT = performance.now();
    const duration = 5500;
    const fromAngle = currentAngle;
    const toAngle = targetAngle;

    statusEl.className = 'wheel-status';
    statusEl.textContent = '🎰 Girando…';
    broadcast('spin_start', { winner: winner.displayName || winner.uniqueId });
    updateStats();

    function step(t) {
      const elapsed = t - startT;
      const k = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - k, 4);
      currentAngle = fromAngle + (toAngle - fromAngle) * ease;
      drawWheel();
      if (k < 1) animFrame = requestAnimationFrame(step);
      else finish();
    }
    animFrame = requestAnimationFrame(step);
  }

  async function finish() {
    spinning = false;
    const name = winner.displayName || winner.uniqueId;
    statusEl.className = 'wheel-status won';
    statusEl.textContent = `🏆 ¡@${name} gana!`;
    toast?.showToast?.({ type: 'success', message: `Ganador: @${name}` });
    renderList();
    broadcast('spin_end', { winner: name, participants });

    /* confetti celebration! */
    const wheelWrap = document.querySelector('.wheel-wrap');
    if (wheelWrap) {
      const rect = wheelWrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      spawnConfetti(cx, cy, 80, ['#ffd700', '#ff6b00', '#ff006e', '#00f5ff', '#8b5cf6', '#00ff88', '#fff']);
    }

    /* persist: reduce entries via backend */
    try {
      const res = await api.post(`/roulette/participants/${encodeURIComponent(winner.uniqueId)}/eliminate`, {}, { signal });
      if (res && (res.entries !== undefined)) {
        const idx = participants.findIndex(p => p.uniqueId === winner.uniqueId);
        if (idx >= 0) {
          if (res.entries <= 0) {
            participants.splice(idx, 1);
            winner = null;
          } else {
            participants[idx] = res;
          }
        }
      }
    } catch (e) {
      console.warn('[ROULETTE] persist eliminate failed', e);
      /* fallback to local */
      if (winner.entries > 1) winner.entries -= 1;
      else participants = participants.filter(p => p !== winner);
    }
    setTimeout(() => { drawWheel(); renderList(); }, 1800);
  }

  /* load participants from backend */
  async function loadParticipants() {
    try {
      const data = await api.get('/roulette/participants', { signal });
      participants = (data || []).map(p => ({
        uniqueId: p.unique_id || p.uniqueId,
        displayName: p.display_name || p.displayName,
        entries: p.entries || 1,
        profileImage: p.profile_image || p.profileImage,
        id: p.id
      }));
      drawWheel();
      renderList();
      broadcast('participants_update', { participants });
    } catch (e) {
      console.error('[ROULETTE] load failed', e);
      statusEl.textContent = 'Error al cargar participantes';
    }
  }

  /* add participant (persist) */
  document.getElementById('btnAdd')?.addEventListener('click', async () => {
    const name = document.getElementById('addName').value.trim().replace(/^@/, '');
    const entries = parseInt(document.getElementById('addEntries').value) || 1;
    if (!name) { toast?.showToast?.({ type: 'warning', message: 'Ingresa un usuario' }); return; }
    try {
      const result = await api.post('/roulette/participants', {
        uniqueId: name,
        displayName: name,
        entries,
        profileImage: null
      }, { signal });
      const idx = participants.findIndex(p => p.uniqueId === name);
      const newP = {
        uniqueId: result.unique_id || name,
        displayName: result.display_name || name,
        entries: result.entries || entries,
        profileImage: result.profile_image
      };
      if (idx >= 0) participants[idx] = newP;
      else participants.push(newP);
      winner = null;
      document.getElementById('addName').value = '';
      document.getElementById('addEntries').value = '1';
      drawWheel();
      renderList();
      broadcast('participants_update', { participants });
    } catch (err) { toast?.showToast?.({ type: 'error', message: err.message || 'Error al agregar' }); }
  }, { signal });

  document.getElementById('addName')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnAdd')?.click();
  }, { signal });

  spinBtn?.addEventListener('click', spin, { signal });
  resetBtn?.addEventListener('click', async () => {
    if (!confirm('¿Reiniciar el juego? Se borrarán todos los participantes.')) return;
    try {
      /* delete each from backend */
      for (const p of [...participants]) {
        await api.del(`/roulette/participants/${encodeURIComponent(p.uniqueId)}`, { signal });
      }
    } catch (e) { /* partial ok */ }
    participants = []; winner = null; currentAngle = 0;
    statusEl.className = 'wheel-status';
    statusEl.textContent = 'Agrega participantes para empezar';
    drawWheel(); renderList();
    broadcast('reset', {});
  }, { signal });

  document.getElementById('btnOpenOverlay')?.addEventListener('click', () => {
    const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return ''; } })();
    const url = `${location.origin}/overlays/overlay-ruleta.html${userId ? '?userId=' + userId : ''}`;
    window.open(url, '_blank');
  }, { signal });

  /* initial load from backend */
  await loadParticipants();

  /* attach magnetic to action buttons */
  document.querySelectorAll('.controls-row .btn').forEach(b => magneticButton(b));

  /* cleanup */
  return () => {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (overlayChannel) try { overlayChannel.close(); } catch {}
  };
}
