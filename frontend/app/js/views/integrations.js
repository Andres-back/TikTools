import { escapeHtml } from '/app/js/core/sanitize.js';

export async function mount({ target, api, toast, signal }) {
  let connections = [];
  let rules = [];
  let runs = [];

  target.innerHTML = `
    <style>
      .ix-hero { position:relative; overflow:hidden; display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-lg); padding:clamp(20px,3vw,34px); margin-bottom:var(--space-lg); border:1px solid rgba(37,244,238,.2); border-radius:22px; background:linear-gradient(135deg,rgba(37,244,238,.11),rgba(123,47,247,.08) 52%,rgba(254,44,85,.08)); }
      .ix-hero::after { content:''; position:absolute; width:230px; height:230px; right:-80px; top:-130px; border-radius:50%; background:#25f4ee; filter:blur(80px); opacity:.16; pointer-events:none; }
      .ix-kicker { color:#25f4ee; font-size:var(--text-xs); font-weight:800; letter-spacing:.17em; text-transform:uppercase; }
      .ix-title { margin:7px 0 5px; font-family:var(--font-display); font-size:clamp(1.7rem,3vw,2.65rem); line-height:1; letter-spacing:-.04em; }
      .ix-subtitle { max-width:760px; margin:0; color:var(--text-secondary); line-height:1.65; }
      .ix-safe { flex:0 0 auto; display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid rgba(0,255,136,.22); border-radius:999px; background:rgba(0,255,136,.08); color:#59f2ad; font-size:var(--text-xs); font-weight:700; }
      .ix-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--space-lg); }
      .ix-card { padding:var(--space-lg); }
      .ix-card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:var(--space-md); }
      .ix-card-title { margin:0; font-size:1rem; font-weight:800; }
      .ix-badge { padding:4px 8px; border-radius:999px; background:rgba(255,255,255,.06); color:var(--text-muted); font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .ix-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .ix-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
      .ix-field.full { grid-column:1 / -1; }
      .ix-field label { color:var(--text-muted); font-size:var(--text-xs); font-weight:700; }
      .ix-field input,.ix-field select,.ix-field textarea { width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:9px; outline:none; background:var(--bg-input); color:var(--text-primary); font:inherit; font-size:var(--text-sm); }
      .ix-field textarea { min-height:84px; resize:vertical; font-family:var(--font-mono); line-height:1.5; }
      .ix-field input:focus,.ix-field select:focus,.ix-field textarea:focus { border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(0,217,255,.08); }
      .ix-hint { color:var(--text-muted); font-size:10px; line-height:1.45; }
      .ix-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:var(--space-md); }
      .ix-list { display:flex; flex-direction:column; gap:10px; }
      .ix-connection { display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:center; gap:11px; padding:12px; border:1px solid rgba(255,255,255,.075); border-radius:13px; background:rgba(255,255,255,.025); }
      .ix-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:12px; background:linear-gradient(135deg,rgba(37,244,238,.18),rgba(123,47,247,.17)); font-size:20px; }
      .ix-name { overflow:hidden; font-size:var(--text-sm); font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .ix-meta { margin-top:3px; color:var(--text-muted); font-size:var(--text-xs); }
      .ix-status { display:inline-flex; align-items:center; gap:5px; margin-left:6px; color:var(--text-muted); }
      .ix-status::before { content:''; width:6px; height:6px; border-radius:50%; background:#788197; }
      .ix-status.connected::before { background:#00ff88; box-shadow:0 0 7px rgba(0,255,136,.7); }
      .ix-status.error::before { background:#fe2c55; }
      .ix-mini-actions { display:flex; gap:5px; }
      .ix-icon-btn { width:31px; height:31px; display:grid; place-items:center; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,.04); color:var(--text-secondary); cursor:pointer; }
      .ix-icon-btn:hover { border-color:var(--color-primary); color:var(--text-primary); }
      .ix-empty { padding:24px; border:1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); text-align:center; font-size:var(--text-sm); }
      .ix-rule { padding:12px 13px; border:1px solid rgba(255,255,255,.075); border-radius:13px; background:rgba(255,255,255,.025); }
      .ix-rule-top { display:flex; justify-content:space-between; gap:10px; }
      .ix-rule-flow { margin-top:8px; color:var(--text-muted); font-size:var(--text-xs); line-height:1.5; }
      .ix-arrow { padding:0 5px; color:#25f4ee; }
      .ix-code { margin-top:8px; padding:7px 9px; overflow:hidden; border-radius:8px; background:rgba(0,0,0,.22); color:#c7f7f5; font:11px/1.5 var(--font-mono); text-overflow:ellipsis; white-space:nowrap; }
      .ix-table-wrap { overflow:auto; }
      .ix-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); }
      .ix-table th,.ix-table td { padding:10px; border-bottom:1px solid rgba(255,255,255,.06); text-align:left; white-space:nowrap; }
      .ix-table th { color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
      .ix-result { display:inline-flex; padding:3px 7px; border-radius:999px; background:rgba(255,255,255,.06); font-weight:700; }
      .ix-result.succeeded { background:rgba(0,255,136,.09); color:#59f2ad; }
      .ix-result.failed,.ix-result.unknown { background:rgba(254,44,85,.1); color:#ff7793; }
      .ix-span { grid-column:1 / -1; }
      @media (max-width:980px) { .ix-grid { grid-template-columns:1fr; } .ix-safe { display:none; } }
      @media (max-width:600px) { .ix-form-grid { grid-template-columns:1fr; } .ix-field.full { grid-column:auto; } .ix-connection { grid-template-columns:38px minmax(0,1fr); } .ix-mini-actions { grid-column:1/-1; justify-content:flex-end; } }
    </style>

    <section class="ix-hero">
      <div>
        <div class="ix-kicker">Game & HTTP Lab</div>
        <h1 class="ix-title">Convierte el LIVE en gameplay</h1>
        <p class="ix-subtitle">Regalos, likes, follows y comandos pueden activar Minecraft, juegos compatibles con RCON o APIs HTTP. Las credenciales se cifran y nunca llegan al overlay.</p>
      </div>
      <div class="ix-safe">🔐 Ejecución server-side</div>
    </section>

    <div class="ix-grid">
      <section class="card ix-card">
        <div class="ix-card-head"><h2 class="ix-card-title">1. Conexiones</h2><span class="ix-badge">Vault cifrado</span></div>
        <form id="connectionForm">
          <div class="ix-form-grid">
            <div class="ix-field"><label for="ixKind">Tipo</label><select id="ixKind"><option value="rcon">🎮 RCON · Minecraft / Source</option><option value="http">🌐 HTTP / Webhook</option></select></div>
            <div class="ix-field"><label for="ixName">Nombre</label><input id="ixName" maxlength="120" placeholder="Servidor Survival" required></div>
          </div>
          <div id="rconFields" class="ix-form-grid" style="margin-top:12px">
            <div class="ix-field"><label for="ixHost">Host autorizado</label><input id="ixHost" value="127.0.0.1" placeholder="127.0.0.1"></div>
            <div class="ix-field"><label for="ixPort">Puerto</label><input id="ixPort" type="number" min="1" max="65535" value="25575"></div>
            <div class="ix-field"><label for="ixEngine">Motor</label><select id="ixEngine"><option value="minecraft">Minecraft</option><option value="source">Source / SRCDS</option></select></div>
            <div class="ix-field"><label for="ixPassword">Contraseña RCON</label><input id="ixPassword" type="password" autocomplete="new-password" required></div>
            <div class="ix-field full"><label for="ixAllow">Comandos permitidos</label><input id="ixAllow" value="say,title,tellraw,summon,effect,give,playsound,particle"><span class="ix-hint">Allowlist explícita. Comandos administrativos como op, stop y whitelist siempre están bloqueados.</span></div>
          </div>
          <div id="httpFields" class="ix-form-grid" style="display:none;margin-top:12px">
            <div class="ix-field"><label for="ixMethod">Método</label><select id="ixMethod"><option>POST</option><option>PUT</option><option>PATCH</option><option>GET</option><option>DELETE</option></select></div>
            <div class="ix-field"><label for="ixTimeout">Timeout ms</label><input id="ixTimeout" type="number" min="500" max="10000" value="3500"></div>
            <div class="ix-field full"><label for="ixUrl">URL HTTPS</label><input id="ixUrl" type="url" placeholder="https://api.example.com/tiktok" autocomplete="off"><span class="ix-hint">La URL completa se guarda cifrada; DNS privado y redirects están bloqueados por defecto.</span></div>
            <div class="ix-field"><label for="ixBearer">Bearer token (opcional)</label><input id="ixBearer" type="password" autocomplete="new-password"></div>
            <div class="ix-field"><label for="ixSigning">Firma HMAC (opcional)</label><input id="ixSigning" type="password" autocomplete="new-password"></div>
          </div>
          <div class="ix-actions"><button class="btn btn-primary" type="submit" id="saveConnection">+ Guardar conexión</button></div>
        </form>
        <div id="connectionsList" class="ix-list" style="margin-top:var(--space-lg)"></div>
      </section>

      <section class="card ix-card">
        <div class="ix-card-head"><h2 class="ix-card-title">2. Regla interactiva</h2><span class="ix-badge">Evento → Acción</span></div>
        <form id="ruleForm">
          <div class="ix-form-grid">
            <div class="ix-field full"><label for="ruleName">Nombre de la experiencia</label><input id="ruleName" maxlength="160" placeholder="Rosa activa velocidad" required></div>
            <div class="ix-field"><label for="ruleConnection">Conexión</label><select id="ruleConnection" required></select></div>
            <div class="ix-field"><label for="ruleEvent">Evento TikTok</label><select id="ruleEvent"><option value="gift">🎁 Regalo final</option><option value="like">♥ Likes</option><option value="follow">💫 Follow</option><option value="share">🚀 Share</option><option value="subscribe">👑 Suscripción</option><option value="chat">💬 Comando de chat</option><option value="member">👋 Entrada</option></select></div>
            <div class="ix-field"><label for="ruleMinCoins">Mínimo monedas</label><input id="ruleMinCoins" type="number" min="0" value="1"></div>
            <div class="ix-field"><label for="ruleGiftName">Regalo exacto (opcional)</label><input id="ruleGiftName" placeholder="Rose"></div>
            <div class="ix-field"><label for="ruleChatCommand">Comando chat (opcional)</label><input id="ruleChatCommand" placeholder="!boss"></div>
            <div class="ix-field"><label for="ruleCooldown">Cooldown global (s)</label><input id="ruleCooldown" type="number" min="1" max="3600" value="5"></div>
            <div class="ix-field full"><label id="ruleActionLabel" for="ruleAction">Comando RCON</label><textarea id="ruleAction" spellcheck="false">say {{user.nickname}} activó el evento con {{gift.name}}</textarea><span class="ix-hint" id="ruleActionHint">Variables: {{user.nickname}}, {{gift.name}}, {{gift.coins}}, {{chat.comment}}. El nombre del comando nunca puede venir del viewer.</span></div>
          </div>
          <div class="ix-actions"><button class="btn btn-primary" type="submit" id="saveRule">⚡ Crear regla</button></div>
        </form>
        <div id="rulesList" class="ix-list" style="margin-top:var(--space-lg)"></div>
      </section>

      <section class="card ix-card ix-span">
        <div class="ix-card-head"><h2 class="ix-card-title">Historial de ejecución</h2><button class="btn btn-sm btn-secondary" id="refreshRuns">↻ Actualizar</button></div>
        <div id="runsTable" class="ix-table-wrap"></div>
      </section>
    </div>
  `;

  const kindSelect = document.getElementById('ixKind');
  const rconFields = document.getElementById('rconFields');
  const httpFields = document.getElementById('httpFields');

  function syncConnectionType() {
    const isRcon = kindSelect.value === 'rcon';
    rconFields.style.display = isRcon ? 'grid' : 'none';
    httpFields.style.display = isRcon ? 'none' : 'grid';
    document.getElementById('ixPassword').required = isRcon;
    document.getElementById('ixUrl').required = !isRcon;
  }

  function syncRuleType() {
    const connection = connections.find((item) => String(item.id) === document.getElementById('ruleConnection').value);
    const action = document.getElementById('ruleAction');
    const label = document.getElementById('ruleActionLabel');
    const hint = document.getElementById('ruleActionHint');
    if (connection?.kind === 'http') {
      label.textContent = 'Body JSON';
      hint.textContent = 'JSON con variables: {{user.nickname}}, {{gift.name}}, {{gift.coins}}, {{event.type}}.';
      if (!action.dataset.edited) action.value = '{\n  "viewer": "{{user.nickname}}",\n  "gift": "{{gift.name}}",\n  "coins": "{{gift.coins}}"\n}';
    } else {
      label.textContent = 'Comando RCON';
      hint.textContent = 'Variables: {{user.nickname}}, {{gift.name}}, {{gift.coins}}, {{chat.comment}}. El nombre del comando nunca puede venir del viewer.';
      if (!action.dataset.edited) action.value = 'say {{user.nickname}} activó el evento con {{gift.name}}';
    }
  }

  function renderConnections() {
    const list = document.getElementById('connectionsList');
    if (!connections.length) {
      list.innerHTML = '<div class="ix-empty">Crea una conexión para empezar a activar juegos o APIs.</div>';
    } else {
      list.innerHTML = connections.map((connection) => {
        const target = connection.kind === 'rcon'
          ? `${connection.config.host}:${connection.config.port}`
          : `${connection.config.method || 'POST'} · ${connection.config.targetHost || 'destino cifrado'}`;
        return `<article class="ix-connection">
          <div class="ix-icon">${connection.kind === 'rcon' ? '🎮' : '🌐'}</div>
          <div><div class="ix-name">${escapeHtml(connection.name)} <span class="ix-status ${escapeHtml(connection.status || '')}">${escapeHtml(connection.status || 'untested')}</span></div><div class="ix-meta">${escapeHtml(target)}</div></div>
          <div class="ix-mini-actions"><button class="ix-icon-btn" data-test="${connection.id}" title="Probar conexión">▶</button><button class="ix-icon-btn" data-delete-connection="${connection.id}" title="Eliminar">✕</button></div>
        </article>`;
      }).join('');
    }

    const select = document.getElementById('ruleConnection');
    select.innerHTML = connections.length
      ? connections.map((connection) => `<option value="${connection.id}">${connection.kind === 'rcon' ? '🎮' : '🌐'} ${escapeHtml(connection.name)}</option>`).join('')
      : '<option value="">Primero crea una conexión</option>';
    document.getElementById('saveRule').disabled = !connections.length;
    syncRuleType();
  }

  function renderRules() {
    const list = document.getElementById('rulesList');
    if (!rules.length) {
      list.innerHTML = '<div class="ix-empty">Tus reglas aparecerán aquí como una receta Evento → Juego/API.</div>';
      return;
    }
    list.innerHTML = rules.map((rule) => {
      const filter = rule.conditions?.giftName ? ` · ${escapeHtml(rule.conditions.giftName)}` : rule.conditions?.minCoins ? ` · ≥${rule.conditions.minCoins} monedas` : '';
      const preview = rule.connectionKind === 'rcon' ? rule.action?.commandTemplate : JSON.stringify(rule.action?.bodyTemplate || 'Payload event_v1');
      return `<article class="ix-rule">
        <div class="ix-rule-top"><div><div class="ix-name">${escapeHtml(rule.name)}</div><div class="ix-rule-flow">${escapeHtml(rule.eventType)}${filter}<span class="ix-arrow">→</span>${escapeHtml(rule.connectionName || '')}</div></div>
          <div class="ix-mini-actions"><button class="ix-icon-btn" data-toggle-rule="${rule.id}" title="${rule.enabled ? 'Pausar' : 'Activar'}">${rule.enabled ? '⏸' : '▶'}</button><button class="ix-icon-btn" data-delete-rule="${rule.id}" title="Eliminar">✕</button></div></div>
        <div class="ix-code">${escapeHtml(preview || '')}</div>
      </article>`;
    }).join('');
  }

  function renderRuns() {
    const container = document.getElementById('runsTable');
    if (!runs.length) {
      container.innerHTML = '<div class="ix-empty">Ejecuta una prueba o conecta tu LIVE para ver cada resultado y su latencia.</div>';
      return;
    }
    container.innerHTML = `<table class="ix-table"><thead><tr><th>Estado</th><th>Regla</th><th>Evento</th><th>Conexión</th><th>Latencia</th><th>Fecha</th></tr></thead><tbody>${runs.map((run) => `
      <tr><td><span class="ix-result ${escapeHtml(run.status)}">${escapeHtml(run.status)}</span></td><td>${escapeHtml(run.rule_name || 'Prueba manual')}</td><td>${escapeHtml(run.event_type)}</td><td>${escapeHtml(run.connection_name || '')}</td><td>${Number.isFinite(Number(run.duration_ms)) ? `${Number(run.duration_ms)} ms` : '—'}</td><td>${formatDate(run.created_at)}</td></tr>
    `).join('')}</tbody></table>`;
  }

  async function loadAll() {
    try {
      const [connectionsData, rulesData, runsData] = await Promise.all([
        api.get('/integrations', { signal }),
        api.get('/integrations/rules/list', { signal }),
        api.get('/integrations/runs/history?limit=30', { signal })
      ]);
      connections = connectionsData || [];
      rules = rulesData || [];
      runs = runsData || [];
      renderConnections(); renderRules(); renderRuns();
    } catch (error) {
      if (error.code !== 'ABORTED') showError(error);
    }
  }

  async function loadRuns() {
    try { runs = await api.get('/integrations/runs/history?limit=30', { signal }) || []; renderRuns(); }
    catch (error) { if (error.code !== 'ABORTED') showError(error); }
  }

  kindSelect.addEventListener('change', syncConnectionType, { signal });
  document.getElementById('ruleConnection').addEventListener('change', () => { document.getElementById('ruleAction').dataset.edited = ''; syncRuleType(); }, { signal });
  document.getElementById('ruleAction').addEventListener('input', (event) => { event.target.dataset.edited = '1'; }, { signal });

  document.getElementById('connectionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = kindSelect.value;
    const body = { name: document.getElementById('ixName').value, kind };
    if (kind === 'rcon') {
      body.config = {
        host: document.getElementById('ixHost').value,
        port: Number(document.getElementById('ixPort').value),
        engine: document.getElementById('ixEngine').value,
        allowedCommands: document.getElementById('ixAllow').value.split(',').map((value) => value.trim()).filter(Boolean)
      };
      body.secret = { password: document.getElementById('ixPassword').value };
    } else {
      body.config = { url: document.getElementById('ixUrl').value, method: document.getElementById('ixMethod').value, timeoutMs: Number(document.getElementById('ixTimeout').value) };
      body.secret = { bearerToken: document.getElementById('ixBearer').value, signingSecret: document.getElementById('ixSigning').value };
    }
    const button = document.getElementById('saveConnection');
    button.disabled = true;
    try {
      await api.post('/integrations', body, { signal });
      event.target.reset();
      kindSelect.value = kind;
      syncConnectionType();
      toast?.showToast?.({ type: 'success', message: 'Conexión guardada en el vault cifrado' });
      await loadAll();
    } catch (error) { showError(error); }
    finally { button.disabled = false; }
  }, { signal });

  document.getElementById('ruleForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const connection = connections.find((item) => String(item.id) === document.getElementById('ruleConnection').value);
    if (!connection) return;
    let action;
    try {
      action = connection.kind === 'rcon'
        ? { commandTemplate: document.getElementById('ruleAction').value }
        : { bodyTemplate: JSON.parse(document.getElementById('ruleAction').value) };
    } catch {
      toast?.showToast?.({ type: 'warning', message: 'El body HTTP debe ser JSON válido' });
      return;
    }
    const minCoins = Number(document.getElementById('ruleMinCoins').value);
    const body = {
      name: document.getElementById('ruleName').value,
      connectionId: connection.id,
      eventType: document.getElementById('ruleEvent').value,
      conditions: {
        minCoins: minCoins > 0 ? minCoins : undefined,
        giftName: document.getElementById('ruleGiftName').value || undefined,
        chatCommand: document.getElementById('ruleChatCommand').value || undefined
      },
      action,
      globalCooldownMs: Number(document.getElementById('ruleCooldown').value) * 1000,
      userCooldownMs: Number(document.getElementById('ruleCooldown').value) * 2000
    };
    try {
      await api.post('/integrations/rules', body, { signal });
      toast?.showToast?.({ type: 'success', message: 'Regla interactiva lista' });
      document.getElementById('ruleName').value = '';
      await loadAll();
    } catch (error) { showError(error); }
  }, { signal });

  document.getElementById('connectionsList').addEventListener('click', async (event) => {
    const testButton = event.target.closest('[data-test]');
    const deleteButton = event.target.closest('[data-delete-connection]');
    try {
      if (testButton) {
        testButton.disabled = true;
        const result = await api.post(`/integrations/${testButton.dataset.test}/test`, {}, { signal });
        toast?.showToast?.({ type: result.success ? 'success' : 'warning', message: result.success ? 'Conexión verificada' : `Prueba fallida: ${result.errorCode || 'sin respuesta'}` });
        await loadAll();
      }
      if (deleteButton && confirm('¿Eliminar esta conexión y todas sus reglas?')) {
        await api.del(`/integrations/${deleteButton.dataset.deleteConnection}`, { signal });
        toast?.showToast?.({ type: 'success', message: 'Conexión eliminada' });
        await loadAll();
      }
    } catch (error) { showError(error); }
    finally { if (testButton) testButton.disabled = false; }
  }, { signal });

  document.getElementById('rulesList').addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-toggle-rule]');
    const remove = event.target.closest('[data-delete-rule]');
    try {
      if (toggle) await api.put(`/integrations/rules/${toggle.dataset.toggleRule}/toggle`, {}, { signal });
      if (remove && confirm('¿Eliminar esta regla?')) await api.del(`/integrations/rules/${remove.dataset.deleteRule}`, { signal });
      if (toggle || remove) await loadAll();
    } catch (error) { showError(error); }
  }, { signal });

  document.getElementById('refreshRuns').addEventListener('click', loadRuns, { signal });

  function showError(error) {
    const keyHint = error?.code === 'INTEGRATIONS_KEY_MISSING' || error?.status === 503
      ? ' Configura INTEGRATIONS_ENCRYPTION_KEY en el servidor.' : '';
    toast?.showToast?.({ type: 'error', message: `${error?.message || 'No se pudo completar la operación'}.${keyHint}` });
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : escapeHtml(date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }));
  }

  syncConnectionType();
  await loadAll();
  const poll = setInterval(loadRuns, 12000);
  return () => clearInterval(poll);
}
