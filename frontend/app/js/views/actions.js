/**
 * Actions & Events View — TikToolStream
 * Multi-step actions: alert, text, sound, video, gif, image, RCON, HTTP
 */
export async function mount({ target, api, signal }) {
  const { showToast } = await import('/app/js/core/toast.js');
  let integrations = [];
  let gifts = [];

  // Cargar catálogo de regalos e integraciones
  try {
    const [giftResp, intResp] = await Promise.all([
      fetch('/gifts.json').then(r => r.json()),
      api.get('/integrations', { signal }).catch(() => [])
    ]);
    gifts = Object.values(giftResp);
    integrations = intResp || [];
  } catch {}

  target.innerHTML = `
    <style>
      .ax-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--space-xl); }
      .ax-card { padding:var(--space-xl); }
      .ax-card-title { margin:0 0 var(--space-md); font-size:1rem; font-weight:800; display:flex; align-items:center; gap:8px; }
      .ax-form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:var(--space-md); }
      .ax-field { display:flex; flex-direction:column; gap:5px; }
      .ax-field.full { grid-column:1 / -1; }
      .ax-field label { color:var(--text-muted); font-size:var(--text-xs); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
      .ax-field input,.ax-field select,.ax-field textarea { width:100%; padding:10px 12px; border:1px solid var(--border-color); border-radius:9px; outline:none; background:var(--bg-input); color:var(--text-primary); font:inherit; font-size:var(--text-sm); }
      .ax-field textarea { min-height:70px; resize:vertical; font-family:var(--font-mono); line-height:1.5; }
      .ax-field input:focus,.ax-field select:focus,.ax-field textarea:focus { border-color:var(--color-primary); box-shadow:0 0 0 3px rgba(0,217,255,.08); }
      .ax-steps { display:flex; flex-direction:column; gap:10px; margin-bottom:var(--space-md); }
      .ax-step { border:1px solid var(--border-color); border-radius:12px; padding:var(--space-md); background:rgba(255,255,255,.025); }
      .ax-step-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px; }
      .ax-step-num { font-size:var(--text-xs); font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; }
      .ax-step-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .ax-step-fields .full { grid-column:1 / -1; }
      .ax-step-del { width:30px; height:30px; display:grid; place-items:center; border:1px solid rgba(239,68,68,.3); border-radius:8px; background:rgba(239,68,68,.08); color:var(--color-danger); cursor:pointer; font-size:14px; }
      .ax-step-del:hover { background:rgba(239,68,68,.2); }
      .ax-add-step { width:100%; padding:10px; border:1px dashed var(--border-color); border-radius:10px; background:transparent; color:var(--text-secondary); cursor:pointer; font-size:var(--text-sm); font-weight:600; }
      .ax-add-step:hover { border-color:var(--color-primary); color:var(--color-primary); background:rgba(0,217,255,.04); }
      .ax-list { display:flex; flex-direction:column; gap:8px; }
      .ax-item { padding:var(--space-md); border:1px solid var(--border-color); border-radius:10px; background:rgba(255,255,255,.025); }
      .ax-item-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .ax-item-name { font-weight:700; font-size:var(--text-sm); }
      .ax-item-meta { margin-top:4px; color:var(--text-muted); font-size:var(--text-xs); line-height:1.5; }
      .ax-item-actions { display:flex; gap:4px; flex-shrink:0; }
      .ax-empty { padding:24px; border:1px dashed var(--border-color); border-radius:12px; color:var(--text-muted); text-align:center; font-size:var(--text-sm); }
      .ax-step-type-icon { width:28px; height:28px; display:grid; place-items:center; border-radius:7px; font-size:14px; }
      .ax-gift-preview { width:36px; height:36px; border-radius:6px; object-fit:cover; display:none; background:rgba(255,255,255,.04); }
      .ax-obs-card { background:rgba(0,217,255,.04); border-color:rgba(0,217,255,.2); }
      .ax-obs-url { display:flex; gap:var(--space-sm); }
      .ax-obs-url input { flex:1; padding:10px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; color:var(--color-primary); font:13px var(--font-mono); }
      .ax-test-card { background:rgba(255,215,0,.04); border-color:rgba(255,215,0,.2); }
      @media (max-width:900px) { .ax-grid { grid-template-columns:1fr; } }
      @media (max-width:480px) { .ax-step-fields { grid-template-columns:1fr; } }
    </style>

    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">IFTTT para tu LIVE</div>
        <h1 class="view-title">⚡ Acciones y Eventos</h1>
        <p class="view-subtitle">Crea reglas multi-paso: un regalo puede activar video + sonido + comando Minecraft + webhook al mismo tiempo.</p>
      </div>
    </div>

    <div class="ax-grid">
      <!-- LEFT: Formulario -->
      <div>
        <div class="card ax-card">
          <div class="ax-card-title">➕ Nueva Regla</div>

          <div class="ax-field" style="margin-bottom:var(--space-md)">
            <label>Nombre de la regla</label>
            <input type="text" id="axName" class="input-field" placeholder="Ej: Rosa activa efecto completo">
          </div>

          <div class="ax-form-row">
            <div class="ax-field">
              <label>CUÁNDO (trigger)</label>
              <select id="axTrigger" class="input-field">
                <option value="gift">🎁 Cualquier regalo</option>
                <option value="gift_specific">🎯 Regalo específico</option>
                <option value="follow">👤 Nuevo seguidor</option>
                <option value="share">🔄 Share</option>
                <option value="like">❤️ Like</option>
                <option value="goal_completed">🎯 Meta completada</option>
                <option value="connect">🔗 Conexión al live</option>
                <option value="disconnect">🔌 Desconexión</option>
              </select>
            </div>
            <div class="ax-field" id="axGiftGroup" style="display:none">
              <label>Regalo</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input id="axGiftName" list="axGiftList" class="input-field" style="flex:1" placeholder="Escribe o selecciona">
                <datalist id="axGiftList"></datalist>
                <img id="axGiftPreview" class="ax-gift-preview">
              </div>
            </div>
            <div class="ax-field" id="axGoalGroup" style="display:none">
              <label>Tipo de meta</label>
              <select id="axGoalType" class="input-field">
                <option value="likes">❤️ Likes</option>
                <option value="followers">👥 Seguidores</option>
                <option value="shares">🔄 Shares</option>
                <option value="coins">💎 Monedas</option>
              </select>
            </div>
          </div>

          <div class="ax-field" style="margin-bottom:var(--space-md)">
            <label>Cooldown global (segundos)</label>
            <input type="number" id="axCooldown" class="input-field" value="0" min="0" placeholder="0 = sin cooldown">
          </div>

          <div class="ax-card-title" style="font-size:0.9rem;margin-top:var(--space-lg)">🎬 Pasos de la acción</div>
          <div id="axStepsContainer" class="ax-steps"></div>
          <button class="ax-add-step" id="axAddStep">+ Agregar paso</button>
          <br><br>
          <button class="btn btn-primary" id="axSave" style="width:100%">💾 Crear Regla</button>
        </div>

        <!-- OBS URL -->
        <div class="card ax-obs-card" style="margin-top:var(--space-md)">
          <div class="ax-card-title" style="font-size:0.9rem">🎥 Overlay para OBS</div>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-sm)">Agrega como Browser Source en OBS para ver las acciones en vivo:</p>
          <div class="ax-obs-url">
            <input type="text" id="axObsUrl" readonly>
            <button class="btn btn-sm btn-primary" id="axCopyObs">📋</button>
            <button class="btn btn-sm btn-secondary" id="axPreviewObs">👁️</button>
          </div>
        </div>

        <!-- Test -->
        <div class="card ax-test-card" style="margin-top:var(--space-md)">
          <div class="ax-card-title" style="font-size:0.9rem">🧪 Test rápido</div>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-sm)">Prueba cómo se ve una acción sin esperar un regalo real</p>
          <div style="display:flex;gap:var(--space-sm)">
            <input type="text" id="axTestVal" class="input-field" placeholder="Mensaje de prueba" style="flex:1">
            <button class="btn btn-sm btn-primary" id="axTestBtn">▶ Probar</button>
          </div>
        </div>

        <!-- Conexiones (RCON / HTTP) -->
        <details class="card" style="margin-top:var(--space-md);cursor:pointer" id="axConnSection">
          <summary style="font-weight:700;font-size:var(--text-sm);padding:4px 0;cursor:pointer">🔌 Conexiones <span style="font-weight:400;color:var(--text-muted);font-size:var(--text-xs)">(${integrations.length} guardadas)</span></summary>
          <div style="margin-top:var(--space-md)">
            <div class="ax-form-row">
              <div class="ax-field">
                <label>Tipo</label>
                <select id="axConnType" class="input-field">
                  <option value="rcon">🎮 RCON (Minecraft/Source)</option>
                  <option value="http">🌐 HTTP / Webhook</option>
                </select>
              </div>
              <div class="ax-field">
                <label>Nombre</label>
                <input id="axConnName" class="input-field" placeholder="Survival SMP" maxlength="120">
              </div>
            </div>
            <div id="axConnRconFields">
              <div class="ax-form-row">
                <div class="ax-field"><label>Host</label><input id="axConnHost" class="input-field" value="127.0.0.1"></div>
                <div class="ax-field"><label>Puerto</label><input id="axConnPort" type="number" class="input-field" value="25575" min="1" max="65535"></div>
              </div>
              <div class="ax-form-row">
                <div class="ax-field"><label>Contraseña RCON</label><input id="axConnPass" type="password" class="input-field" autocomplete="new-password"></div>
                <div class="ax-field"><label>Motor</label><select id="axConnEngine" class="input-field"><option value="minecraft">Minecraft</option><option value="source">Source/SRCDS</option></select></div>
              </div>
              <div class="ax-field" style="margin-bottom:var(--space-sm)">
                <label>Comandos permitidos</label>
                <input id="axConnAllow" class="input-field" value="say,title,tellraw,summon,effect,give,playsound,particle">
                <span style="font-size:10px;color:var(--text-muted)">Separados por coma</span>
              </div>
            </div>
            <div id="axConnHttpFields" style="display:none">
              <div class="ax-field" style="margin-bottom:var(--space-sm)">
                <label>URL HTTPS</label>
                <input id="axConnUrl" type="url" class="input-field" placeholder="https://api.ejemplo.com/webhook">
              </div>
              <div class="ax-form-row">
                <div class="ax-field"><label>Método</label><select id="axConnMethod" class="input-field"><option>POST</option><option>PUT</option><option>PATCH</option><option>GET</option><option>DELETE</option></select></div>
                <div class="ax-field"><label>Timeout (ms)</label><input id="axConnTimeout" type="number" class="input-field" value="3500" min="500" max="10000"></div>
              </div>
              <div class="ax-field" style="margin-bottom:var(--space-sm)">
                <label>Bearer token (opcional)</label>
                <input id="axConnBearer" type="password" class="input-field" autocomplete="new-password">
              </div>
            </div>
            <button class="btn btn-primary btn-sm" id="axSaveConn" style="width:100%">+ Guardar conexión</button>
            <div id="axConnList" style="margin-top:var(--space-md);display:flex;flex-direction:column;gap:6px"></div>
          </div>
        </details>
      </div>

      <!-- RIGHT: Reglas activas -->
      <div>
        <div class="ax-card-title">📋 Reglas activas</div>
        <div id="axRulesList" class="ax-list"><div class="ax-empty">Cargando...</div></div>
      </div>
    </div>
  `;

  // ============ POBLAR DATALIST DE REGALOS ============
  const giftList = document.getElementById('axGiftList');
  if (giftList && gifts.length) {
    giftList.innerHTML = gifts
      .sort((a, b) => (a.diamond_count || a.cost || 0) - (b.diamond_count || b.cost || 0))
      .filter((g, i, arr) => arr.findIndex((x) => x.name === g.name) === i)
      .map((g) => `<option value="${g.name}">${g.name} (${g.diamond_count || g.cost}💎)</option>`)
      .join('');
  }

  // Vista previa del regalo seleccionado
  document.getElementById('axGiftName')?.addEventListener('input', function() {
    const preview = document.getElementById('axGiftPreview');
    const match = gifts.find(g => g.name === this.value);
    if (match?.image) { preview.src = match.image; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
  }, { signal });

  document.getElementById('axTrigger')?.addEventListener('change', function() {
    document.getElementById('axGiftGroup').style.display = this.value === 'gift_specific' ? 'block' : 'none';
    document.getElementById('axGoalGroup').style.display = this.value === 'goal_completed' ? 'block' : 'none';
  }, { signal });

  // ============ STEPS MANAGER ============
  let stepCount = 1;
  const stepTypeLabels = {
    alert: '🔔 Alerta visual', text: '📝 Texto en pantalla', sound: '🔊 Sonido',
    video: '🎬 Video', gif: '🖼️ GIF', image: '🖼️ Imagen',
    rcon: '🎮 Comando Minecraft', http: '🌐 Webhook HTTP'
  };
  const stepDefaultValues = {
    alert: '🎯 ¡GRAN REGALO!', text: '¡Gracias por el regalo!', sound: '', video: '',
    gif: '', image: '', rcon: 'say {{user.nickname}} envió {{gift.name}} 🎉',
    http: '{\n  "viewer": "{{user.nickname}}",\n  "gift": "{{gift.name}}",\n  "coins": {{gift.coins}}\n}'
  };
  const stepHints = {
    alert: 'Mensaje de la alerta', text: 'Texto a mostrar en pantalla',
    sound: 'URL del archivo de audio (mp3, wav)', video: 'URL del video (mp4, webm)',
    gif: 'URL del GIF animado', image: 'URL de la imagen (png, jpg)',
    rcon: 'Comando con variables {{user.nickname}}, {{gift.name}}, {{gift.coins}}',
    http: 'JSON con variables {{user.nickname}}, {{gift.name}}, {{gift.coins}}'
  };

  function renderSteps() {
    const container = document.getElementById('axStepsContainer');
    if (!container) return;
    let html = '';
    for (let i = 1; i <= stepCount; i++) {
      const typeEl = document.getElementById(`axStepType_${i}`);
      const currentType = typeEl?.value || 'alert';
      const valEl = document.getElementById(`axStepVal_${i}`);
      const currentVal = valEl?.value || stepDefaultValues[currentType] || '';
      const isRcon = currentType === 'rcon';
      const isHttp = currentType === 'http';
      const isConnType = isRcon || isHttp;

      // Recuperar valores inline guardados previamente
      const hostEl = document.getElementById(`axRconHost_${i}`);
      const portEl = document.getElementById(`axRconPort_${i}`);
      const passEl = document.getElementById(`axRconPass_${i}`);
      const engineEl = document.getElementById(`axRconEngine_${i}`);
      const allowEl = document.getElementById(`axRconAllow_${i}`);
      const urlEl = document.getElementById(`axHttpUrl_${i}`);
      const methodEl = document.getElementById(`axHttpMethod_${i}`);
      const timeoutEl = document.getElementById(`axHttpTimeout_${i}`);
      const bearerEl = document.getElementById(`axHttpBearer_${i}`);

      html += `<div class="ax-step">
        <div class="ax-step-head">
          <span class="ax-step-num">Paso ${i}</span>
          ${i > 1 ? `<button class="ax-step-del" data-del-step="${i}">✕</button>` : ''}
        </div>
        <div class="ax-step-fields">
          <div class="${isConnType ? '' : 'full'}">
            <label style="color:var(--text-muted);font-size:10px;font-weight:700;text-transform:uppercase">Tipo</label>
            <select id="axStepType_${i}" class="input-field" style="font-size:var(--text-sm)">
              ${Object.entries(stepTypeLabels).map(([v, lbl]) => `<option value="${v}" ${v === currentType ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
          </div>

          ${isRcon ? `
            <div class="ax-field"><label>Host</label><input id="axRconHost_${i}" class="input-field" value="${hostEl?.value || '127.0.0.1'}"></div>
            <div class="ax-field"><label>Puerto</label><input id="axRconPort_${i}" type="number" class="input-field" value="${portEl?.value || '25575'}" min="1" max="65535"></div>
            <div class="ax-field"><label>Contraseña RCON</label><input id="axRconPass_${i}" type="password" class="input-field" value="${passEl?.value || ''}" autocomplete="new-password"></div>
            <div class="ax-field"><label>Motor</label><select id="axRconEngine_${i}" class="input-field"><option value="minecraft" ${(engineEl?.value || 'minecraft') === 'minecraft' ? 'selected' : ''}>Minecraft</option><option value="source" ${(engineEl?.value || '') === 'source' ? 'selected' : ''}>Source/SRCDS</option></select></div>
            <div class="ax-field full"><label>Comandos permitidos</label><input id="axRconAllow_${i}" class="input-field" value="${allowEl?.value || 'say,title,tellraw,summon,effect,give,playsound,particle'}"><span style="font-size:10px;color:var(--text-muted)">Separados por coma</span></div>
            <div class="ax-field full" style="margin-top:4px"><label>Comando a ejecutar</label><textarea id="axStepVal_${i}" class="input-field" style="min-height:60px;font-family:var(--font-mono)" placeholder="Ej: say {{user.nickname}} envió {{gift.name}}">${currentVal}</textarea><span style="font-size:10px;color:var(--text-muted)">Variables: {{user.nickname}}, {{gift.name}}, {{gift.coins}}, {{chat.comment}}</span></div>
          ` : isHttp ? `
            <div class="ax-field full"><label>URL HTTPS</label><input id="axHttpUrl_${i}" type="url" class="input-field" value="${urlEl?.value || ''}" placeholder="https://api.ejemplo.com/webhook"></div>
            <div class="ax-field"><label>Método</label><select id="axHttpMethod_${i}" class="input-field"><option>POST</option><option>PUT</option><option ${(methodEl?.value || 'POST') === 'PATCH' ? 'selected' : ''}>PATCH</option><option ${(methodEl?.value || '') === 'GET' ? 'selected' : ''}>GET</option><option ${(methodEl?.value || '') === 'DELETE' ? 'selected' : ''}>DELETE</option></select></div>
            <div class="ax-field"><label>Timeout (ms)</label><input id="axHttpTimeout_${i}" type="number" class="input-field" value="${timeoutEl?.value || '3500'}" min="500" max="10000"></div>
            <div class="ax-field"><label>Bearer token (opcional)</label><input id="axHttpBearer_${i}" type="password" class="input-field" value="${bearerEl?.value || ''}" autocomplete="new-password"></div>
            <div class="ax-field full" style="margin-top:4px"><label>Body JSON</label><textarea id="axStepVal_${i}" class="input-field" style="min-height:60px;font-family:var(--font-mono)">${currentVal}</textarea><span style="font-size:10px;color:var(--text-muted)">Variables: {{user.nickname}}, {{gift.name}}, {{gift.coins}}, {{event.type}}</span></div>
          ` : `
            <div class="full">
              <label style="color:var(--text-muted);font-size:10px;font-weight:700;text-transform:uppercase">${isHttp ? 'Body JSON' : 'Valor'}</label>
              <input type="text" id="axStepVal_${i}" class="input-field" placeholder="${stepHints[currentType]}" value="${currentVal.replace(/"/g, '&quot;')}">
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${stepHints[currentType]}</div>
            </div>
          `}
        </div>
      </div>`;
    }
    container.innerHTML = html;

    // Al cambiar tipo, re-renderizar para mostrar/ocultar campos
    container.querySelectorAll('[id^="axStepType_"]').forEach(el => {
      el.addEventListener('change', () => renderSteps(), { signal });
    });
    // Eliminar paso
    container.querySelectorAll('[data-del-step]').forEach(el => {
      el.addEventListener('click', function() {
        const idx = parseInt(this.dataset.delStep);
        if (stepCount > 1) {
          for (let j = idx; j < stepCount; j++) copyStepData(j + 1, j);
          stepCount--;
          renderSteps();
        }
      }, { signal });
    });
  }

  function copyStepData(from, to) {
    const typeEl = document.getElementById(`axStepType_${from}`);
    const valEl = document.getElementById(`axStepVal_${from}`);
    const connEl = document.getElementById(`axStepConn_${from}`);
    if (typeEl) {
      const toType = document.getElementById(`axStepType_${to}`);
      if (toType) toType.value = typeEl.value;
    }
    if (valEl) {
      const toVal = document.getElementById(`axStepVal_${to}`);
      if (toVal) toVal.value = valEl.value;
    }
    if (connEl) {
      const toConn = document.getElementById(`axStepConn_${to}`);
      if (toConn) toConn.value = connEl.value;
    }
  }

  function getStepsData() {
    const steps = [];
    for (let i = 1; i <= stepCount; i++) {
      const type = document.getElementById(`axStepType_${i}`)?.value;
      if (!type) continue;
      const value = document.getElementById(`axStepVal_${i}`)?.value?.trim();
      const step = { type };
      if (type === 'rcon') {
        step.host = document.getElementById(`axRconHost_${i}`)?.value || '127.0.0.1';
        step.port = parseInt(document.getElementById(`axRconPort_${i}`)?.value) || 25575;
        step.password = document.getElementById(`axRconPass_${i}`)?.value || '';
        step.engine = document.getElementById(`axRconEngine_${i}`)?.value || 'minecraft';
        step.allowedCommands = (document.getElementById(`axRconAllow_${i}`)?.value || 'say')
          .split(',').map(v => v.trim()).filter(Boolean);
        step.command = value || '';
      } else if (type === 'http') {
        step.url = document.getElementById(`axHttpUrl_${i}`)?.value || '';
        step.method = document.getElementById(`axHttpMethod_${i}`)?.value || 'POST';
        step.timeoutMs = parseInt(document.getElementById(`axHttpTimeout_${i}`)?.value) || 3500;
        step.bearerToken = document.getElementById(`axHttpBearer_${i}`)?.value || '';
        step.body = value || '';
      } else {
        step.value = value || '';
      }
      steps.push(step);
    }
    return steps;
  }

  document.getElementById('axAddStep')?.addEventListener('click', () => {
    stepCount++;
    renderSteps();
  }, { signal });

  // Initial render
  renderSteps();

  // ============ OBS URL ============
  const userId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return ''; } })();
  const obsInput = document.getElementById('axObsUrl');
  if (obsInput) obsInput.value = `${window.location.origin}/overlays/overlay-actions.html${userId ? '?userId=' + userId : ''}`;
  document.getElementById('axCopyObs')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(obsInput.value); showToast({ type: 'success', message: 'URL copiada' }); } catch {}
  }, { signal });
  document.getElementById('axPreviewObs')?.addEventListener('click', () => {
    window.open(obsInput.value, '_blank');
  }, { signal });

  // ============ TEST ============
  document.getElementById('axTestBtn')?.addEventListener('click', () => {
    const val = document.getElementById('axTestVal').value.trim() || '¡Acción de prueba!';
    const popup = window.open('', 'testPreview', 'width=400,height=300');
    if (!popup) { showToast({ type: 'warning', message: 'Permite ventanas emergentes para el preview' }); return; }
    popup.document.write(`<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:transparent">
      <div style="background:rgba(0,0,0,0.85);backdrop-filter:blur(12px);border-radius:20px;padding:30px 50px;border:3px solid #ffd700;text-align:center;animation:fadeIn 0.5s;color:#fff;font-family:sans-serif">
        <div style="font-size:48px;margin-bottom:8px">🎯</div>
        <div style="color:#ffd700;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:2px">TEST</div>
        <div style="font-size:24px;font-weight:700;margin-top:8px">${val}</div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}</style>
      <script>setTimeout(()=>window.close(),4000)</script>
    </body></html>`);
  }, { signal });

  // ============ CONEXIONES (RCON / HTTP) ============
  function renderConnList() {
    const container = document.getElementById('axConnList');
    if (!container) return;
    if (!integrations.length) {
      container.innerHTML = '<div class="ax-empty" style="padding:12px">Sin conexiones aún</div>';
      return;
    }
    container.innerHTML = integrations.map(c =>
      `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.02)">
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-xs);font-weight:700">${c.kind === 'rcon' ? '🎮' : '🌐'} ${c.name}</div>
          <div style="font-size:10px;color:var(--text-muted)">${c.kind === 'rcon' ? c.config.host + ':' + c.config.port : c.config.method + ' · ' + (c.config.targetHost || 'cifrado')}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary" data-conn-test="${c.id}" style="min-width:28px;padding:2px 6px;font-size:10px" title="Probar">▶</button>
          <button class="btn btn-sm btn-danger" data-conn-del="${c.id}" style="min-width:28px;padding:2px 6px;font-size:10px" title="Eliminar">✕</button>
        </div>
      </div>`
    ).join('');
    // Actualizar contador
    const summary = document.querySelector('#axConnSection summary span');
    if (summary) summary.textContent = `(${integrations.length} guardadas)`;
  }

  document.getElementById('axConnType')?.addEventListener('change', function() {
    const isRcon = this.value === 'rcon';
    document.getElementById('axConnRconFields').style.display = isRcon ? 'block' : 'none';
    document.getElementById('axConnHttpFields').style.display = isRcon ? 'none' : 'block';
  }, { signal });

  document.getElementById('axSaveConn')?.addEventListener('click', async () => {
    const kind = document.getElementById('axConnType').value;
    const name = document.getElementById('axConnName').value.trim();
    if (!name) { showToast({ type: 'warning', message: 'Nombre requerido' }); return; }

    const body = { name, kind };
    if (kind === 'rcon') {
      body.config = {
        host: document.getElementById('axConnHost').value,
        port: Number(document.getElementById('axConnPort').value),
        engine: document.getElementById('axConnEngine').value,
        allowedCommands: document.getElementById('axConnAllow').value.split(',').map(v => v.trim()).filter(Boolean)
      };
      body.secret = { password: document.getElementById('axConnPass').value };
      if (!body.secret.password) { showToast({ type: 'warning', message: 'Contraseña RCON requerida' }); return; }
    } else {
      body.config = {
        url: document.getElementById('axConnUrl').value,
        method: document.getElementById('axConnMethod').value,
        timeoutMs: Number(document.getElementById('axConnTimeout').value)
      };
      body.secret = {
        bearerToken: document.getElementById('axConnBearer').value
      };
      if (!body.config.url) { showToast({ type: 'warning', message: 'URL requerida' }); return; }
    }

    const btn = document.getElementById('axSaveConn');
    btn.disabled = true;
    try {
      await api.post('/integrations', body, { signal });
      showToast({ type: 'success', message: 'Conexión guardada' });
      // Recargar conexiones
      const data = await api.get('/integrations', { signal });
      integrations = data || [];
      renderConnList();
      renderSteps(); // actualizar selects de conexión en pasos
      // Limpiar form
      document.getElementById('axConnName').value = '';
      document.getElementById('axConnPass').value = '';
      document.getElementById('axConnBearer').value = '';
    } catch (error) {
      showToast({ type: 'error', message: error.message || 'Error al guardar' });
    }
    btn.disabled = false;
  }, { signal });

  document.getElementById('axConnList')?.addEventListener('click', async (event) => {
    const testBtn = event.target.closest('[data-conn-test]');
    const delBtn = event.target.closest('[data-conn-del]');
    try {
      if (testBtn) {
        testBtn.disabled = true;
        const result = await api.post(`/integrations/${testBtn.dataset.connTest}/test`, {}, { signal });
        showToast({ type: result.success ? 'success' : 'warning', message: result.success ? 'Conexión OK' : `Falló: ${result.errorCode || 'sin respuesta'}` });
      }
      if (delBtn && confirm('¿Eliminar esta conexión y sus reglas asociadas?')) {
        await api.del(`/integrations/${delBtn.dataset.connDel}`, { signal });
        const data = await api.get('/integrations', { signal });
        integrations = data || [];
        renderConnList();
        renderSteps();
      }
    } catch (error) { showToast({ type: 'error', message: error.message || 'Error' }); }
    finally { if (testBtn) testBtn.disabled = false; }
  }, { signal });

  renderConnList();

  // ============ SAVE ACTION ============
  document.getElementById('axSave')?.addEventListener('click', async () => {
    const name = document.getElementById('axName').value.trim();
    const rawTrigger = document.getElementById('axTrigger').value;
    const isGoal = rawTrigger === 'goal_completed';
    const triggerType = isGoal ? 'goal_completed' : (rawTrigger === 'gift_specific' ? 'gift' : rawTrigger);
    const triggerId = isGoal
      ? document.getElementById('axGoalType').value
      : (rawTrigger === 'gift_specific'
        ? (document.getElementById('axGiftName').value?.trim() || 'any')
        : (rawTrigger === 'gift' ? 'any' : null));
    const cooldown = parseInt(document.getElementById('axCooldown').value) || 0;
    const steps = getStepsData();

    if (!name) { showToast({ type: 'warning', message: 'Nombre de la regla requerido' }); return; }
    if (steps.length === 0) { showToast({ type: 'warning', message: 'Agrega al menos un paso' }); return; }

    const btn = document.getElementById('axSave');
    btn.disabled = true; btn.textContent = 'Creando...';
    try {
      // Guardar como acción multi-step con action_type='chain'
      await api.post('/actions', {
        name,
        triggerType,
        triggerId,
        actionType: 'chain',
        actionConfig: { steps },
        cooldown
      }, { signal });
      showToast({ type: 'success', message: `Regla "${name}" creada con ${steps.length} paso(s)` });
      document.getElementById('axName').value = '';
      stepCount = 1;
      renderSteps();
      loadRules();
    } catch (err) { showToast({ type: 'error', message: err.message || 'Error al crear' }); }
    btn.disabled = false; btn.textContent = '💾 Crear Regla';
  }, { signal });

  // ============ LOAD RULES ============
  async function loadRules() {
    try {
      const data = await api.get('/actions', { signal });
      const acts = Array.isArray(data) ? data : [];
      const container = document.getElementById('axRulesList');
      if (acts.length === 0) {
        container.innerHTML = '<div class="ax-empty">Crea tu primera regla multi-paso</div>';
        return;
      }
      const triggerLabels = { gift: '🎁 Cualquier regalo', gift_specific: '🎯 Regalo específico', follow: '👤 Follow', share: '🔄 Share', like: '❤️ Like', connect: '🔗 Conexión', disconnect: '🔌 Desconexión' };
      const typeIcons = { alert: '🔔', text: '📝', sound: '🔊', video: '🎬', gif: '🖼️', image: '🖼️', rcon: '🎮', http: '🌐' };
      container.innerHTML = acts.map(a => {
        const cfg = typeof a.action_config === 'string' ? JSON.parse(a.action_config || '{}') : (a.action_config || {});
        const steps = cfg.steps || [{ type: a.action_type, value: cfg.value }];
        const stepsPreview = steps.map(s => `${typeIcons[s.type] || '⚡'} ${s.type}`).join(' → ');
        return `<div class="ax-item" style="border-left:4px solid ${a.enabled ? 'var(--color-success)' : 'var(--text-muted)'}">
          <div class="ax-item-head">
            <div style="flex:1;min-width:0">
              <div class="ax-item-name">${a.name}</div>
              <div class="ax-item-meta">${triggerLabels[a.trigger_type] || a.trigger_type} → ${stepsPreview}${a.cooldown > 0 ? ' · cd:' + a.cooldown + 's' : ''}</div>
            </div>
            <div class="ax-item-actions">
              <button class="btn btn-sm ${a.enabled ? 'btn-success' : 'btn-secondary'}" data-toggle="${a.id}" style="min-width:40px">${a.enabled ? 'ON' : 'OFF'}</button>
              <button class="btn btn-sm btn-danger" data-del="${a.id}" style="min-width:32px">✕</button>
            </div>
          </div>
        </div>`;
      }).join('');
      container.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await api.put(`/actions/${btn.dataset.toggle}/toggle`, {}, { signal }); loadRules(); } catch {}
        }, { signal });
      });
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          try { await api.del(`/actions/${btn.dataset.del}`, { signal }); loadRules(); showToast({ type: 'success', message: 'Regla eliminada' }); } catch {}
        }, { signal });
      });
    } catch { document.getElementById('axRulesList').innerHTML = '<div class="ax-empty">Error al cargar reglas</div>'; }
  }

  await loadRules();
}
