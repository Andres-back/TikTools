import { escapeHtml } from '/app/js/core/sanitize.js';

/**
 * Minecraft (Crafty) — panel del servidor de donaciones.
 * Estado, iniciar/detener, dirección de conexión, reglas activas y acceso al panel.
 */
export async function mount({ target, api, toast, signal }) {
  let status = { online: false, version: null, players: { online: null, max: null } };
  let config = null;
  let rules = [];
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
      .mc-hero { position:relative; overflow:hidden; display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-lg); padding:clamp(20px,3vw,34px); margin-bottom:var(--space-xl); border:1px solid rgba(0,212,255,.2); border-radius:22px; background:linear-gradient(135deg,rgba(0,212,255,.11),rgba(124,58,237,.08) 52%,rgba(28,180,120,.08)); }
      .mc-hero::after { content:''; position:absolute; width:230px; height:230px; right:-80px; top:-130px; border-radius:50%; background:#00d4ff; filter:blur(80px); opacity:.15; pointer-events:none; }
      .mc-kicker { color:#00d4ff; font-size:var(--text-xs); font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
      .mc-title { margin:7px 0 5px; font-family:var(--font-display); font-size:clamp(1.7rem,3vw,2.65rem); line-height:1; letter-spacing:-.04em; }
      .mc-subtitle { max-width:760px; margin:0; color:var(--text-secondary); line-height:1.65; }
      .mc-pill { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid rgba(255,255,255,.12); border-radius:999px; background:rgba(255,255,255,.05); font-size:var(--text-xs); font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
      .mc-pill .mc-dot-mini { width:8px; height:8px; border-radius:50%; background:#788197; }
      .mc-pill.online { border-color:rgba(0,255,136,.25); color:#59f2ad; }
      .mc-pill.online .mc-dot-mini { background:#00ff88; box-shadow:0 0 8px rgba(0,255,136,.8); }
      .mc-pill.offline { border-color:rgba(254,44,85,.25); color:#ff7793; }
      .mc-pill.offline .mc-dot-mini { background:#fe2c55; }
      .mc-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--space-xl); }
      .mc-card { padding:var(--space-xl); }
      .mc-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:var(--space-lg); }
      .mc-card-title { margin:0; font-size:1rem; font-weight:800; }
      .mc-badge { padding:4px 8px; border-radius:999px; background:rgba(255,255,255,.06); color:var(--text-muted); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .mc-state-row { display:flex; align-items:center; gap:16px; }
      .mc-dot { width:16px; height:16px; border-radius:50%; background:#788197; flex-shrink:0; }
      .mc-dot.online { background:#00ff88; box-shadow:0 0 12px rgba(0,255,136,.8); animation:mcPulse 2s infinite; }
      .mc-dot.offline { background:#fe2c55; }
      @keyframes mcPulse { 0%,100% { box-shadow:0 0 6px rgba(0,255,136,.5); } 50% { box-shadow:0 0 16px rgba(0,255,136,.95); } }
      .mc-state-text { margin:0; font-size:var(--text-lg); font-weight:800; }
      .mc-meta { margin:4px 0 0; color:var(--text-muted); font-size:var(--text-xs); line-height:1.5; }
      .mc-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:var(--space-lg); }
      .mc-hint { margin:var(--space-md) 0 0; color:var(--text-muted); font-size:10px; line-height:1.55; }
      .mc-url-row { display:flex; gap:10px; margin-top:var(--space-md); }
      .mc-url-row input { flex:1; min-width:0; padding:10px 12px; border:1px solid var(--border-color); border-radius:9px; background:var(--bg-input); color:var(--text-primary); font:12px/1.5 var(--font-mono); }
      .mc-steps { margin:var(--space-md) 0 0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px; }
      .mc-steps li { display:flex; gap:10px; align-items:flex-start; color:var(--text-secondary); font-size:var(--text-sm); line-height:1.55; }
      .mc-steps b { color:var(--text-primary); }
      .mc-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); }
      .mc-table th,.mc-table td { padding:11px 10px; border-bottom:1px solid rgba(255,255,255,.06); text-align:left; white-space:nowrap; }
      .mc-table th { color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
      .mc-table td.mc-cell-main { max-width:320px; overflow:hidden; text-overflow:ellipsis; }
      .mc-empty { padding:var(--space-xl); border:1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); text-align:center; font-size:var(--text-sm); }
      .mc-link-btn { color:var(--color-primary); font-weight:700; text-decoration:none; }
      @media (max-width:980px) { .mc-grid { grid-template-columns:1fr; } }
    </style>

    <section class="mc-hero">
      <div>
        <p class="mc-kicker">⛏️ Minecraft Integration</p>
        <h1 class="mc-title">Minecraft</h1>
        <p class="mc-subtitle">Servidor de donaciones gestionado con Crafty. El chat lanza skins, misiles y monstruos con sus regalos — el streamer juega y los espectadores lo sorprenden. Entran jugadores con Minecraft de pago y TLauncher.</p>
      </div>
      <div class="mc-pill offline" id="mcHeroPill"><span class="mc-dot-mini"></span><span id="mcHeroPillText">Offline</span></div>
    </section>

    <div class="mc-grid">
      <article class="card mc-card">
        <div class="mc-card-head"><h2 class="mc-card-title">Estado del servidor</h2><span class="mc-badge" id="mcStateBadge">—</span></div>
        <div class="mc-state-row">
          <div class="mc-dot offline" id="mcDot"></div>
          <div>
            <p class="mc-state-text" id="mcStateText">Comprobando…</p>
            <p class="mc-meta" id="mcStateMeta">Consultando el servidor en el puerto 25565</p>
          </div>
        </div>
        <div class="mc-actions">
          <button class="btn btn-primary" id="mcStartBtn">▶ Iniciar servidor</button>
          <button class="btn btn-danger" id="mcStopBtn" disabled>⏹ Detener servidor</button>
        </div>
        <p class="mc-hint">Iniciar tarda ~45 s (Crafty arranca Paper 1.21.9 con SkinsRestorer). Detener apaga el puerto 25565.</p>
      </article>

      <article class="card mc-card">
        <div class="mc-card-head"><h2 class="mc-card-title">Conectar jugadores</h2><span class="mc-badge" id="mcConnBadge">—</span></div>
        <div id="mcConnBody"></div>
      </article>

      <article class="card mc-card">
        <div class="mc-card-head"><h2 class="mc-card-title">Regalos → acciones</h2><span class="mc-badge" id="mcRulesBadge">—</span></div>
        <div id="mcRulesBody"></div>
      </article>

      <article class="card mc-card">
        <div class="mc-card-head"><h2 class="mc-card-title">Panel Crafty</h2><span class="mc-badge">Plugins · Archivos · Consola</span></div>
        <p class="mc-hint" style="margin-top:0">Gestión completa del servidor en el panel web de Crafty:</p>
        <div class="mc-url-row">
          <input readonly value="" id="mcCraftyUrl" spellcheck="false">
          <button class="btn btn-secondary" id="mcOpenCrafty">Abrir</button>
        </div>
        <ul class="mc-steps">
          <li><span>1.</span><span><b>Agregar un plugin:</b> en Crafty → <b>Files</b> → carpeta <b>plugins/</b> → subir el .jar → reiniciar el servidor. SkinsRestorer ya está instalado.</span></li>
          <li><span>2.</span><span><b>Consola:</b> desde Crafty puedes escribir comandos al servidor en vivo.</span></li>
          <li><span>3.</span><span><b>Copias de seguridad:</b> Crafty guarda backups del mundo automáticamente.</span></li>
        </ul>
      </article>
    </div>
  `;

  // ---------- render ----------

  function renderStatus() {
    const online = status.online;
    const players = status.players || {};
    $('#mcDot').className = `mc-dot ${online ? 'online' : 'offline'}`;
    $('#mcHeroPill').className = `mc-pill ${online ? 'online' : 'offline'}`;
    $('#mcHeroPillText').textContent = online ? 'Online' : 'Offline';
    $('#mcStateBadge').textContent = online ? (status.version || '—') : 'Apagado';
    $('#mcStateText').textContent = online ? 'Servidor en línea' : 'Servidor apagado';
    $('#mcStateMeta').textContent = online
      ? `${players.online != null ? `${players.online}/${players.max ?? '?'} jugador(es)` : 'Sin datos de jugadores'} · puerto ${status.serverPort ?? 25565}`
      : 'No responde en el puerto 25565. Inícialo con el botón de arriba.';
    $('#mcStartBtn').disabled = online || busy;
    $('#mcStopBtn').disabled = !online || busy;
  }

  function renderConn() {
    const body = $('#mcConnBody');
    const playit = config?.playitUrl;
    const port = config?.serverPort || '25565';
    const local = `${window.location.hostname}:${port}`;
    $('#mcConnBadge').textContent = playit ? 'Playit.gg' : 'Red local';
    body.innerHTML = `
      ${playit ? `
        <p class="mc-hint" style="margin-top:0">Dirección pública (jugadores desde cualquier lugar):</p>
        <div class="mc-url-row">
          <input readonly value="${escapeHtml(playit)}" id="mcPlayitUrl" spellcheck="false">
          <button class="btn btn-secondary" id="mcCopyPlayit">Copiar</button>
        </div>
      ` : `
        <p class="mc-hint" style="margin-top:0">Aún no hay dirección pública configurada. Para que jugadores fuera de tu red entren al servidor:</p>
        <ul class="mc-steps">
          <li><span>1.</span><span>Ejecuta <b>/mnt/playit/playit</b> en la máquina del servidor.</span></li>
          <li><span>2.</span><span>Abre <b>playit.gg/claim</b> con el código que muestra y asocia el puerto <b>25565</b>.</span></li>
          <li><span>3.</span><span>Pega aquí la dirección <b>xxx.playit.gg</b> (config del servidor → Minecraft → Conexión).</span></li>
        </ul>
      `}
      <p class="mc-hint">En la misma red (tu casa/estudio), los jugadores también pueden usar:</p>
      <div class="mc-url-row">
        <input readonly value="${escapeHtml(local)}" spellcheck="false">
        <button class="btn btn-secondary" id="mcCopyLocal">Copiar</button>
      </div>
    `;
    body.querySelector('#mcCopyPlayit')?.addEventListener('click', copyUrl);
    body.querySelector('#mcCopyLocal')?.addEventListener('click', copyUrl);
  }

  function copyUrl(event) {
    const input = event.target.closest('.mc-url-row')?.querySelector('input');
    if (!input) return;
    input.select();
    navigator.clipboard?.writeText(input.value);
    showToast('success', 'Dirección copiada');
  }

  function renderRules() {
    const body = $('#mcRulesBody');
    const mcRules = rules.filter((rule) => rule.connectionKind === 'rcon');
    $('#mcRulesBadge').textContent = `${mcRules.length} regla${mcRules.length === 1 ? '' : 's'}`;
    if (!mcRules.length) {
      body.innerHTML = `<div class="mc-empty">Sin reglas RCON todavía. Créalas en <a class="mc-link-btn" href="/app/actions">Acciones y Eventos</a>.</div>`;
      return;
    }
    body.innerHTML = `
      <div class="mc-table-wrap" style="overflow:auto">
        <table class="mc-table">
          <thead><tr><th>Regalo</th><th>Acción en el juego</th><th>Estado</th></tr></thead>
          <tbody>
            ${mcRules.map((rule) => {
              const cond = rule.conditions || {};
              const range = cond.minCoins != null && cond.maxCoins != null
                ? `${cond.minCoins}–${cond.maxCoins} 💎`
                : cond.minCoins != null ? `≥${cond.minCoins} 💎` : 'cualquier regalo';
              return `<tr>
                <td>${escapeHtml(range)}</td>
                <td class="mc-cell-main" title="${escapeHtml(rule.action?.commandTemplate || '')}">${escapeHtml(rule.action?.commandTemplate || '—')}</td>
                <td>${rule.enabled ? '<span style="color:#59f2ad">activa</span>' : '<span style="color:#788197">pausada</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="mc-hint">Las reglas se editan en <a class="mc-link-btn" href="/app/actions">Acciones y Eventos</a>. Las acciones apuntan al jugador <b>streamer</b> — cámbialo por tu nombre de Minecraft.</p>
    `;
  }

  // ---------- data ----------

  async function refreshStatus() {
    try {
      status = await api.get('/minecraft/status', { signal });
    } catch {
      status = { online: false, version: null, players: { online: null, max: null } };
    }
    renderStatus();
  }

  async function refreshConfig() {
    try {
      config = await api.get('/minecraft/config', { signal });
    } catch {
      config = null;
    }
    renderConn();
  }

  async function refreshRules() {
    try {
      rules = await api.get('/integrations/rules/list', { signal });
    } catch {
      rules = [];
    }
    renderRules();
  }

  // ---------- actions ----------

  $('#mcStartBtn').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    setBusy($('#mcStartBtn'), '⏳ Iniciando… (~45 s)');
    renderStatus();
    try {
      const result = await api.post('/minecraft/start', {}, { signal });
      showToast(result.ok ? 'success' : 'warning', result.ok ? 'Servidor iniciado 🎮' : `No arrancó: ${result.error || 'sin respuesta'}`);
    } catch (e) {
      showToast('error', `Error al iniciar: ${e?.message || 'desconocido'}`);
    } finally {
      busy = false;
      setBusy($('#mcStartBtn'));
      await refreshStatus();
    }
  });

  $('#mcStopBtn').addEventListener('click', async () => {
    if (busy || !status.online) return;
    if (!window.confirm('¿Detener el servidor de Minecraft? Los jugadores se desconectarán.')) return;
    busy = true;
    setBusy($('#mcStopBtn'), '⏳ Deteniendo…');
    renderStatus();
    try {
      const result = await api.post('/minecraft/stop', {}, { signal });
      showToast('success', result.ok ? 'Servidor detenido' : 'Ya estaba apagado');
    } catch (e) {
      showToast('error', `Error al detener: ${e?.message || 'desconocido'}`);
    } finally {
      busy = false;
      setBusy($('#mcStopBtn'));
      await refreshStatus();
    }
  });

  $('#mcOpenCrafty').addEventListener('click', () => {
    const url = $('#mcCraftyUrl').value;
    if (url) window.open(url, '_blank', 'noopener');
  });

  // ---------- init ----------

  const craftyFromConfig = config?.craftyUrl || 'https://localhost:8443';
  $('#mcCraftyUrl').value = craftyFromConfig.replace('https://localhost', `https://${window.location.hostname}`);

  await Promise.all([refreshStatus(), refreshConfig(), refreshRules()]);
  statusTimer = setInterval(refreshStatus, 5000);

  return () => {
    if (statusTimer) clearInterval(statusTimer);
  };
}
