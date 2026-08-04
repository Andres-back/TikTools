import { escapeHtml } from '/app/js/core/sanitize.js';

/**
 * Juego Kaetram — integración de donaciones.
 * Estado del juego, control ON/OFF, umbrales de monedas, modo apoyo, historial HTTP.
 */
export async function mount({ target, api, toast, signal }) {
  let status = { online: false, info: null };
  let config = null;
  let runs = [];
  let statusTimer = null;
  let busy = false;

  const $ = (sel) => target.querySelector(sel);
  const showToast = (type, message) => toast?.showToast?.({ type, message });
  const setBusy = (btn, loadingText) => {
    if (!btn) return;
    if (loadingText) {
      btn.dataset.label = btn.textContent;
      btn.textContent = loadingText;
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.label || btn.textContent;
      btn.disabled = false;
    }
  };

  target.innerHTML = `
    <style>
      .gm-hero { position:relative; overflow:hidden; display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-lg); padding:clamp(20px,3vw,34px); margin-bottom:var(--space-xl); border:1px solid rgba(0,212,255,.2); border-radius:22px; background:linear-gradient(135deg,rgba(0,212,255,.11),rgba(124,58,237,.08) 52%,rgba(254,44,85,.08)); }
      .gm-hero::after { content:''; position:absolute; width:230px; height:230px; right:-80px; top:-130px; border-radius:50%; background:#00d4ff; filter:blur(80px); opacity:.15; pointer-events:none; }
      .gm-kicker { color:#00d4ff; font-size:var(--text-xs); font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
      .gm-title { margin:7px 0 5px; font-family:var(--font-display); font-size:clamp(1.7rem,3vw,2.65rem); line-height:1; letter-spacing:-.04em; }
      .gm-subtitle { max-width:760px; margin:0; color:var(--text-secondary); line-height:1.65; }
      .gm-pill { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid rgba(255,255,255,.12); border-radius:999px; background:rgba(255,255,255,.05); font-size:var(--text-xs); font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
      .gm-pill .gm-dot-mini { width:8px; height:8px; border-radius:50%; background:#788197; }
      .gm-pill.online { border-color:rgba(0,255,136,.25); color:#59f2ad; }
      .gm-pill.online .gm-dot-mini { background:#00ff88; box-shadow:0 0 8px rgba(0,255,136,.8); }
      .gm-pill.offline { border-color:rgba(254,44,85,.25); color:#ff7793; }
      .gm-pill.offline .gm-dot-mini { background:#fe2c55; }
      .gm-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--space-xl); }
      .gm-card { padding:var(--space-xl); }
      .gm-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:var(--space-lg); }
      .gm-card-title { margin:0; font-size:1rem; font-weight:800; }
      .gm-badge { padding:4px 8px; border-radius:999px; background:rgba(255,255,255,.06); color:var(--text-muted); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .gm-state-row { display:flex; align-items:center; gap:16px; }
      .gm-dot { width:16px; height:16px; border-radius:50%; background:#788197; flex-shrink:0; }
      .gm-dot.online { background:#00ff88; box-shadow:0 0 12px rgba(0,255,136,.8); animation:gmPulse 2s infinite; }
      .gm-dot.offline { background:#fe2c55; }
      @keyframes gmPulse { 0%,100% { box-shadow:0 0 6px rgba(0,255,136,.5); } 50% { box-shadow:0 0 16px rgba(0,255,136,.95); } }
      .gm-state-text { margin:0; font-size:var(--text-lg); font-weight:800; }
      .gm-meta { margin:4px 0 0; color:var(--text-muted); font-size:var(--text-xs); line-height:1.5; }
      .gm-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:var(--space-lg); }
      .gm-hint { margin:var(--space-md) 0 0; color:var(--text-muted); font-size:10px; line-height:1.55; }
      .gm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
      .gm-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
      .gm-field label { color:var(--text-muted); font-size:var(--text-xs); font-weight:700; }
      .gm-field input { width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:9px; outline:none; background:var(--bg-input); color:var(--text-primary); font:inherit; font-size:var(--text-sm); }
      .gm-field input:focus { border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(0,217,255,.08); }
      .gm-toggles { display:flex; flex-direction:column; gap:14px; margin-top:var(--space-lg); }
      .gm-toggle { display:flex; align-items:center; gap:12px; color:var(--text-secondary); font-size:var(--text-sm); cursor:pointer; }
      .gm-url-row { display:flex; gap:10px; margin-top:var(--space-md); }
      .gm-url-row input { flex:1; min-width:0; padding:10px 12px; border:1px solid var(--border-color); border-radius:9px; background:var(--bg-input); color:var(--text-primary); font:12px/1.5 var(--font-mono); }
      .gm-span { grid-column:1 / -1; }
      .gm-table-wrap { overflow:auto; }
      .gm-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); }
      .gm-table th,.gm-table td { padding:11px 10px; border-bottom:1px solid rgba(255,255,255,.06); text-align:left; white-space:nowrap; }
      .gm-table th { color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
      .gm-table td.gm-cell-main { max-width:280px; overflow:hidden; text-overflow:ellipsis; }
      .gm-pill-run { display:inline-flex; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.06); font-weight:700; }
      .gm-pill-run.succeeded { background:rgba(0,255,136,.09); color:#59f2ad; }
      .gm-pill-run.failed,.gm-pill-run.unknown { background:rgba(254,44,85,.1); color:#ff7793; }
      .gm-pill-run.queued,.gm-pill-run.running { background:rgba(255,200,60,.12); color:#ffd166; }
      .gm-pill-run.skipped { background:rgba(255,255,255,.05); color:var(--text-muted); }
      .gm-empty { padding:var(--space-xl); border:1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); text-align:center; font-size:var(--text-sm); }
      .gm-spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:gmSpin .7s linear infinite; vertical-align:-2px; margin-right:8px; }
      @keyframes gmSpin { to { transform:rotate(360deg); } }
      @media (max-width:980px) { .gm-grid { grid-template-columns:1fr; } }
      @media (max-width:600px) { .gm-form-grid { grid-template-columns:1fr; } .gm-url-row { flex-direction:column; } }
    </style>

    <section class="gm-hero">
      <div>
        <p class="gm-kicker">🎮 Game Integration</p>
        <h1 class="gm-title">Juego Kaetram</h1>
        <p class="gm-subtitle">El streamer juega en vivo y el chat lanza jefes con sus regalos: oleadas, élites y bosses según las monedas. En modo apoyo, los regalos curan en vez de atacar.</p>
      </div>
      <div class="gm-pill offline" id="gmHeroPill"><span class="gm-dot-mini"></span><span id="gmHeroPillText">Offline</span></div>
    </section>

    <div class="gm-grid">
      <article class="card gm-card">
        <div class="gm-card-head"><h2 class="gm-card-title">Estado del juego</h2><span class="gm-badge" id="gmStateBadge">—</span></div>
        <div class="gm-state-row">
          <div class="gm-dot offline" id="gmDot"></div>
          <div>
            <p class="gm-state-text" id="gmStateText">Comprobando…</p>
            <p class="gm-meta" id="gmStateMeta">Consultando la API del juego en :9002</p>
          </div>
        </div>
        <div class="gm-actions">
          <button class="btn btn-primary" id="gmStartBtn">▶ Iniciar juego</button>
          <button class="btn btn-danger" id="gmStopBtn" disabled>⏹ Detener juego</button>
          <button class="btn btn-secondary" id="gmTestBtn" disabled>🧪 Probar donación</button>
        </div>
        <p class="gm-hint">Iniciar tarda ~20 s (arranca server + cliente del juego). Detener apaga los puertos 9000/9001/9002.</p>
      </article>

      <article class="card gm-card">
        <div class="gm-card-head"><h2 class="gm-card-title">Umbrales de monedas</h2><span class="gm-badge">Regalos 1–1000 💎</span></div>
        <div class="gm-form-grid">
          <label class="gm-field"><label>Oleada (mobs normales)</label><input type="number" id="gmWaveMin" min="1" max="99" inputmode="numeric"></label>
          <label class="gm-field"><label>Élite</label><input type="number" id="gmEliteMin" min="100" max="499" inputmode="numeric"></label>
          <label class="gm-field"><label>BOSS</label><input type="number" id="gmBossMin" min="500" max="1000" inputmode="numeric"></label>
          <label class="gm-field"><label>Enemigos simultáneos</label><input type="number" id="gmMaxMobs" min="1" max="10" inputmode="numeric"></label>
        </div>
        <div class="gm-toggles">
          <div class="gm-toggle"><button type="button" class="toggle-switch active" id="gmEnabled" role="switch" aria-checked="true"></button><span>Donaciones hacia el juego activas</span></div>
          <div class="gm-toggle"><button type="button" class="toggle-switch" id="gmSupportMode" role="switch" aria-checked="false"></button><span>Modo apoyo: los regalos curan al streamer en vez de atacarlo</span></div>
        </div>
        <div class="gm-actions">
          <button class="btn btn-primary" id="gmSaveBtn">💾 Guardar configuración</button>
        </div>
      </article>

      <article class="card gm-card">
        <div class="gm-card-head"><h2 class="gm-card-title">En OBS</h2><span class="gm-badge">Browser Source</span></div>
        <p class="gm-hint" style="margin-top:0">Agrega una fuente de navegador apuntando a:</p>
        <div class="gm-url-row">
          <input readonly value="http://localhost:9000" id="gmObsUrl" spellcheck="false">
          <button class="btn btn-secondary" id="gmCopyUrl">Copiar</button>
        </div>
        <p class="gm-hint">Resolución recomendada 1920×1080 a 60 FPS. El juego se ve en transmisión y los regalos del chat disparan los eventos configurados en Acciones.</p>
        <p class="gm-hint">Los regalos solo activan efectos dentro del juego (oleadas, élites, bosses, curaciones). No otorgan premios, dinero ni recompensas fuera de la transmisión — conforme a las normas de monetización de TikTok LIVE.</p>
      </article>

      <article class="card gm-card gm-span">
        <div class="gm-card-head">
          <h2 class="gm-card-title">Historial de donaciones al juego</h2>
          <button class="btn btn-secondary" id="gmRefreshRuns" title="Actualizar">↻ Actualizar</button>
        </div>
        <div class="gm-table-wrap" id="gmRunsWrap" hidden>
          <table class="gm-table">
            <thead><tr><th>Fecha</th><th>Evento</th><th>Envío</th><th>Conexión</th><th>Estado</th><th>Duración</th></tr></thead>
            <tbody id="gmRunsBody"></tbody>
          </table>
        </div>
        <div class="gm-empty" id="gmRunsEmpty">Sin interacciones todavía. Cuando el chat envíe donaciones por la conexión HTTP del juego, aparecerán aquí.</div>
      </article>
    </div>
  `;

  // ---------- render ----------

  function renderStatus() {
    const online = status.online;
    const info = status.info || {};
    $('#gmDot').className = `gm-dot ${online ? 'online' : 'offline'}`;
    $('#gmHeroPill').className = `gm-pill ${online ? 'online' : 'offline'}`;
    $('#gmHeroPillText').textContent = online ? 'Online' : 'Offline';
    $('#gmStateBadge').textContent = online ? `v${info.gameVersion || '—'}` : 'Apagado';
    $('#gmStateText').textContent = online ? 'Juego en línea' : 'Juego apagado';
    $('#gmStateMeta').textContent = online
      ? `${info.playerCount ?? 0} jugador(es) conectado(s) · API :9002 · WS :9001 · OBS :9000`
      : 'No responde en :9002. Inícialo con el botón de arriba.';
    $('#gmStartBtn').disabled = online || busy;
    $('#gmStopBtn').disabled = !online || busy;
    $('#gmTestBtn').disabled = !online || busy;
  }

  function renderRuns() {
    const wrap = $('#gmRunsWrap');
    const empty = $('#gmRunsEmpty');
    if (!runs.length) {
      wrap.hidden = true;
      empty.hidden = false;
      return;
    }
    wrap.hidden = false;
    empty.hidden = true;
    $('#gmRunsBody').innerHTML = runs
      .map((run) => {
        const date = new Date(run.created_at);
        const time = Number.isNaN(date.getTime())
          ? escapeHtml(String(run.created_at || ''))
          : date.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const summary = escapeHtml(String(run.request_summary || run.error_message || '—')).slice(0, 140);
        return `<tr>
          <td>${time}</td>
          <td>${escapeHtml(String(run.event_type || '—'))}</td>
          <td class="gm-cell-main" title="${summary}">${summary}</td>
          <td>${escapeHtml(String(run.connection_name || '—'))}</td>
          <td><span class="gm-pill-run ${escapeHtml(String(run.status || ''))}">${escapeHtml(String(run.status || '—'))}</span></td>
          <td>${run.duration_ms != null ? `${run.duration_ms} ms` : '—'}</td>
        </tr>`;
      })
      .join('');
  }

  // ---------- data ----------

  async function refreshStatus() {
    try {
      status = await api.get('/game/status', { signal });
    } catch {
      status = { online: false, info: null };
    }
    renderStatus();
  }

  async function refreshConfig() {
    try {
      config = await api.get('/game/config', { signal });
    } catch {
      config = null;
    }
    if (!config) return;
    $('#gmWaveMin').value = config.waveMin;
    $('#gmEliteMin').value = config.eliteMin;
    $('#gmBossMin').value = config.bossMin;
    $('#gmMaxMobs').value = config.maxMobs;
    setToggle($('#gmEnabled'), !!config.enabled);
    setToggle($('#gmSupportMode'), !!config.supportMode);
  }

  async function refreshRuns() {
    try {
      runs = await api.get('/integrations/runs/history?kind=http&limit=15', { signal });
    } catch {
      runs = [];
    }
    renderRuns();
  }

  function setToggle(btn, active) {
    if (!btn) return;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  }

  // ---------- actions ----------

  $('#gmStartBtn').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    setBusy($('#gmStartBtn'), '⏳ Iniciando… (~20 s)');
    renderStatus();
    try {
      const result = await api.post('/game/start', {}, { signal });
      showToast(result.ok ? 'success' : 'warning', result.ok ? 'Juego iniciado' : `No arrancó: ${result.error || 'sin respuesta'}`);
    } catch (e) {
      showToast('error', `Error al iniciar: ${e?.message || 'desconocido'}`);
    } finally {
      busy = false;
      setBusy($('#gmStartBtn'));
      await refreshStatus();
    }
  });

  $('#gmStopBtn').addEventListener('click', async () => {
    if (busy || !status.online) return;
    if (!window.confirm('¿Detener el juego? Los jugadores se desconectarán.')) return;
    busy = true;
    setBusy($('#gmStopBtn'), '⏳ Deteniendo…');
    renderStatus();
    try {
      const result = await api.post('/game/stop', {}, { signal });
      showToast('success', result.ok ? 'Juego detenido' : 'Ya estaba apagado');
    } catch (e) {
      showToast('error', `Error al detener: ${e?.message || 'desconocido'}`);
    } finally {
      busy = false;
      setBusy($('#gmStopBtn'));
      await refreshStatus();
    }
  });

  $('#gmTestBtn').addEventListener('click', async () => {
    if (busy || !status.online) return;
    busy = true;
    setBusy($('#gmTestBtn'), '⏳ Enviando…');
    try {
      const result = await api.post('/game/test', {}, { signal });
      if (result.ok) {
        showToast('success', 'Donación de prueba recibida por el juego 🎉');
      } else {
        showToast('warning', `El juego respondió: ${result.data?.error || result.error || 'rechazó la prueba'}`);
      }
    } catch (e) {
      showToast('error', `Error en la prueba: ${e?.message || 'desconocido'}`);
    } finally {
      busy = false;
      setBusy($('#gmTestBtn'));
      await refreshRuns();
    }
  });

  $('#gmSaveBtn').addEventListener('click', async () => {
    const payload = {
      waveMin: Number($('#gmWaveMin').value),
      eliteMin: Number($('#gmEliteMin').value),
      bossMin: Number($('#gmBossMin').value),
      maxMobs: Number($('#gmMaxMobs').value),
      enabled: $('#gmEnabled').classList.contains('active'),
      supportMode: $('#gmSupportMode').classList.contains('active')
    };
    setBusy($('#gmSaveBtn'), '💾 Guardando…');
    try {
      config = await api.put('/game/config', payload, { signal });
      showToast('success', 'Configuración guardada');
    } catch (e) {
      showToast('error', `No se pudo guardar: ${e?.message || 'desconocido'}`);
    } finally {
      setBusy($('#gmSaveBtn'));
    }
  });

  $('#gmCopyUrl').addEventListener('click', () => {
    const input = $('#gmObsUrl');
    input.select();
    navigator.clipboard?.writeText(input.value);
    showToast('success', 'URL copiada');
  });

  $('#gmRefreshRuns').addEventListener('click', refreshRuns);

  // Toda la fila del toggle es clickeable (área grande, mejor UX).
  // Un solo listener por fila evita el doble toggle del <label> con botón.
  target.querySelectorAll('.gm-toggle').forEach((row) => {
    const btn = row.querySelector('.toggle-switch');
    if (!btn) return;
    row.addEventListener('click', () => setToggle(btn, !btn.classList.contains('active')));
  });

  // ---------- init ----------

  await Promise.all([refreshStatus(), refreshConfig(), refreshRuns()]);
  statusTimer = setInterval(refreshStatus, 5000);

  return () => {
    if (statusTimer) clearInterval(statusTimer);
  };
}
