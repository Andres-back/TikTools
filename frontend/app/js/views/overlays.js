/**
 * Overlays View - TikToolStream
 * Fast OBS preview with clean copy/open workflow.
 */

const OVERLAYS = [
  { id: 'hype-arena', name: 'Hype Arena', file: '/overlays/overlay-hype-arena.html', desc: 'Hype, rachas, regalos y resultados de juego en una escena premium.', icon: 'HA', bg: '#070914', category: 'Interactivo', featured: true, previewDemo: true, badges: ['Nuevo', 'Interactivo'] },
  { id: 'actions', name: 'Acciones y Eventos', file: '/overlays/overlay-actions.html', desc: 'Alertas visuales, audio, video e imagenes por evento.', icon: 'AE', bg: '#0a0a1e', category: 'Alertas', badges: ['Cola'] },
  { id: 'chat', name: 'Chat en Vivo', file: '/overlays/overlay-chat.html', desc: 'Comentarios del LIVE para mostrar en pantalla.', icon: 'CH', bg: '#0a0a1e', category: 'Comunidad' },
  { id: 'events', name: 'Eventos Recientes', file: '/overlays/overlay-recent-events.html', desc: 'Timeline lateral de follows, shares y regalos.', icon: 'EV', bg: '#0a0a1e', category: 'Comunidad' },
  { id: 'viewers', name: 'Contador Viewers', file: '/overlays/overlay-viewer-count.html', desc: 'Indicador LIVE con espectadores actuales.', icon: 'VW', bg: '#0a0a1e', category: 'HUD' },
  { id: 'marquee', name: 'Ticker de Regalos', file: '/overlays/overlay-marquee.html', desc: 'Barra inferior para actividad reciente de regalos.', icon: 'TK', bg: '#0a0a1e', category: 'HUD' },
  { id: 'goal', name: 'Metas', file: '/overlays/overlay-goal.html', desc: 'Barra de progreso para likes, shares, follows o monedas.', icon: 'MT', bg: '#0a0a1e', category: 'Objetivos' },
  { id: 'timer', name: 'Timer Subasta', file: '/overlays/overlay-timer.html', desc: 'Temporizador principal con fases y ganador.', icon: 'TM', bg: '#0a0a1e', category: 'Subasta' },
  { id: 'extimer', name: 'Timer Extensible', file: '/overlays/overlay-timer-extendable.html', desc: 'Countdown que aumenta con regalos.', icon: 'TE', bg: '#0a0a1e', category: 'Subasta' },
  { id: 'roulette', name: 'Ruleta', file: '/overlays/overlay-ruleta.html', desc: 'Escena de ruleta para dinamicas en vivo.', icon: 'RL', bg: '#0a0a1e', category: 'Juego' },
  { id: 'participants', name: 'Participantes', file: '/overlays/overlay-participantes.html', desc: 'Lista de usuarios participantes.', icon: 'PA', bg: '#0a0a1e', category: 'Juego' },
  { id: 'leaderboard', name: 'Leaderboard', file: '/overlays/overlay-generic.html', desc: 'Top donadores generico.', icon: 'LB', bg: '#0a0a1e', category: 'Ranking' },
  { id: 'sounds', name: 'Alertas de Sonido', file: '/overlays/overlay-sounds.html', desc: 'Reproduce sonidos al recibir regalos.', icon: 'SO', bg: '#0a0a1e', category: 'Alertas' },
  { id: 'tts', name: 'Texto a Voz', file: '/overlays/overlay-tts.html', desc: 'Lee comentarios del chat en voz alta.', icon: 'VO', bg: '#111827', category: 'Comunidad' },
  { id: 'uptime', name: 'Tiempo en Vivo', file: '/overlays/overlay-uptime.html', desc: 'Contador de duracion del stream.', icon: 'UP', bg: '#0a0a1e', category: 'HUD' }
];

export async function mount({ target }) {
  const userId = getCurrentUserId();
  let selected = OVERLAYS[0];
  let activeCategory = 'Todos';
  let mobileMode = false;

  const categories = ['Todos', ...new Set(OVERLAYS.map((item) => item.category))];

  target.innerHTML = `
    <style>
      .ov-shell { display:grid; grid-template-columns:minmax(260px, 340px) minmax(0, 1fr); gap:18px; min-height:calc(100vh - var(--header-height) - 44px); }
      .ov-sidebar { display:flex; flex-direction:column; gap:12px; min-width:0; }
      .ov-search { width:100%; min-height:40px; padding:9px 11px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-input); color:var(--text-primary); }
      .ov-tabs { display:flex; gap:6px; overflow:auto; padding-bottom:2px; }
      .ov-tab { flex:0 0 auto; min-height:32px; padding:6px 10px; border:1px solid var(--border-color); border-radius:999px; background:rgba(255,255,255,.035); color:var(--text-secondary); font-size:var(--text-xs); font-weight:700; }
      .ov-tab.active { border-color:rgba(37,217,242,.45); background:rgba(37,217,242,.12); color:var(--text-primary); }
      .ov-list { display:flex; flex-direction:column; gap:8px; overflow:auto; padding-right:2px; }
      .ov-item { display:grid; grid-template-columns:38px minmax(0,1fr) auto; gap:10px; align-items:center; width:100%; min-height:64px; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,.035); color:var(--text-primary); text-align:left; }
      .ov-item:hover { border-color:rgba(37,217,242,.32); background:rgba(255,255,255,.055); }
      .ov-item.active { border-color:rgba(37,217,242,.55); background:rgba(37,217,242,.11); box-shadow:inset 3px 0 0 var(--color-primary); }
      .ov-icon { width:38px; height:38px; display:grid; place-items:center; border-radius:8px; background:linear-gradient(135deg, rgba(37,217,242,.18), rgba(255,61,113,.14)); color:var(--color-primary); font-size:12px; font-weight:900; }
      .ov-name { overflow:hidden; font-size:var(--text-sm); font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
      .ov-desc { overflow:hidden; margin-top:2px; color:var(--text-muted); font-size:var(--text-xs); text-overflow:ellipsis; white-space:nowrap; }
      .ov-pill { padding:3px 7px; border-radius:999px; background:rgba(255,255,255,.06); color:var(--text-muted); font-size:10px; font-weight:800; text-transform:uppercase; }
      .ov-stage { display:grid; grid-template-rows:auto minmax(0,1fr) auto; gap:12px; min-width:0; }
      .ov-panel { border:1px solid var(--border-color); border-radius:8px; background:rgba(18,22,34,.88); box-shadow:0 18px 50px rgba(0,0,0,.28); overflow:hidden; }
      .ov-preview-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-bottom:1px solid var(--border-color); }
      .ov-preview-title { min-width:0; }
      .ov-preview-title h2 { margin:0; overflow:hidden; font-size:1rem; text-overflow:ellipsis; white-space:nowrap; }
      .ov-preview-title p { margin:3px 0 0; color:var(--text-muted); font-size:var(--text-xs); }
      .ov-preview-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
      .ov-mode-toggle { display:flex; border:1px solid var(--border-color); border-radius:8px; overflow:hidden; }
      .ov-mode-btn { min-height:32px; padding:6px 12px; border:none; background:rgba(255,255,255,.035); color:var(--text-muted); font-size:var(--text-xs); font-weight:700; cursor:pointer; transition:all .15s; }
      .ov-mode-btn.active { background:var(--color-primary-gradient); color:#fff; }
      .ov-mode-btn:not(:last-child) { border-right:1px solid var(--border-color); }
      .ov-frame-wrap { position:relative; aspect-ratio:16/9; background:#02030a; transition:aspect-ratio .3s ease; }
      .ov-frame-wrap.mobile { aspect-ratio:9/16; max-height:70vh; margin:0 auto; width:auto; }
      .ov-frame-wrap .ov-label { position:absolute; left:10px; bottom:8px; z-index:1; padding:4px 7px; border-radius:6px; background:rgba(0,0,0,.55); color:rgba(255,255,255,.62); font:10px var(--font-mono); pointer-events:none; }
      .ov-frame { width:100%; height:100%; border:0; background:transparent; }
      .ov-url-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:12px; border-top:1px solid var(--border-color); }
      .ov-url { min-width:0; padding:10px 11px; border:1px solid var(--border-color); border-radius:8px; background:var(--bg-input); color:var(--color-primary); font:12px var(--font-mono); }
      .ov-help { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
      .ov-help-item { padding:12px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,.035); }
      .ov-help-item strong { display:block; margin-bottom:4px; font-size:var(--text-sm); }
      .ov-help-item span { color:var(--text-muted); font-size:var(--text-xs); line-height:1.5; }
      @media (max-width: 1040px) { .ov-shell { grid-template-columns:1fr; } .ov-list { max-height:360px; } }
      @media (max-width: 680px) { .ov-preview-head, .ov-url-row { grid-template-columns:1fr; } .ov-preview-head { align-items:flex-start; flex-direction:column; } .ov-preview-actions { justify-content:flex-start; } .ov-help { grid-template-columns:1fr; } }
    </style>

    <div class="ux-page-head">
      <div>
        <div class="ux-kicker">OBS Studio</div>
        <h1 class="view-title">Overlays</h1>
        <p class="view-subtitle">Selecciona una escena, prueba el preview y copia una URL limpia para OBS. El modo demo solo se usa dentro de la vista previa.</p>
      </div>
      <div class="ux-page-actions">
        <a class="btn btn-secondary" href="/app/integrations" data-router-link>Game Lab</a>
        <a class="btn btn-secondary" href="/app/actions" data-router-link>Acciones</a>
      </div>
    </div>

    <div class="ov-shell">
      <aside class="ov-sidebar" aria-label="Catalogo de overlays">
        <input id="overlaySearch" class="ov-search" type="search" placeholder="Buscar overlay">
        <div class="ov-tabs" id="overlayTabs">${categories.map((category) => `<button class="ov-tab ${category === activeCategory ? 'active' : ''}" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`).join('')}</div>
        <div class="ov-list" id="overlayList"></div>
      </aside>

      <section class="ov-stage">
        <div class="ov-panel">
          <div class="ov-preview-head">
            <div class="ov-preview-title">
              <h2 id="previewName"></h2>
              <p id="previewDesc"></p>
            </div>
            <div class="ov-preview-actions">
              <div class="ov-mode-toggle">
                <button class="ov-mode-btn active" data-mode="pc">🖥 PC</button>
                <button class="ov-mode-btn" data-mode="mobile">📱 Móvil</button>
              </div>
              <button class="btn btn-secondary" id="reloadPreview">Recargar</button>
              <button class="btn btn-primary" id="openOverlay">Abrir</button>
            </div>
          </div>
          <div class="ov-frame-wrap" id="previewBg">
            <span class="ov-label" id="previewLabel">1920 × 1080 · PC</span>
            <iframe id="previewFrame" class="ov-frame" allowtransparency="true" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
          </div>
          <div class="ov-url-row">
            <input id="overlayUrl" class="ov-url" readonly>
            <button class="btn btn-primary" id="copyOverlay">Copiar URL</button>
          </div>
        </div>

        <div class="ov-help">
          <div class="ov-help-item"><strong>Resolucion</strong><span>Usa 1920 x 1080 para PC y 1080 x 1920 para movil. Cambia entre modos con el toggle.</span></div>
          <div class="ov-help-item"><strong>Transparencia</strong><span>Activa fondo transparente en Browser Source cuando el overlay lo soporte.</span></div>
          <div class="ov-help-item"><strong>Demo</strong><span>Hype Arena se previsualiza con datos falsos, pero la URL copiada queda lista para tu canal.</span></div>
        </div>
      </section>
    </div>
  `;

  const listEl = document.getElementById('overlayList');
  const searchEl = document.getElementById('overlaySearch');
  const frameEl = document.getElementById('previewFrame');
  const urlEl = document.getElementById('overlayUrl');
  const nameEl = document.getElementById('previewName');
  const descEl = document.getElementById('previewDesc');
  const bgEl = document.getElementById('previewBg');
  const labelEl = document.getElementById('previewLabel');
  const modeBtns = document.querySelectorAll('.ov-mode-btn');

  function getUrl(overlay, options = {}) {
    const url = new URL(overlay.file, window.location.origin);
    if (userId) url.searchParams.set('userId', userId);
    if (options.preview && overlay.previewDemo) url.searchParams.set('demo', '1');
    if (mobileMode) url.searchParams.set('mode', 'mobile');
    return url.toString();
  }

  function setMobileMode(mobile) {
    mobileMode = mobile;
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === (mobile ? 'mobile' : 'pc')));
    bgEl.classList.toggle('mobile', mobile);
    labelEl.textContent = mobile ? '1080 × 1920 · Móvil' : '1920 × 1080 · PC';
    selectOverlay(selected);
  }

  function filteredOverlays() {
    const term = searchEl.value.trim().toLowerCase();
    return OVERLAYS.filter((overlay) => {
      const inCategory = activeCategory === 'Todos' || overlay.category === activeCategory;
      const inSearch = !term || `${overlay.name} ${overlay.desc} ${overlay.category}`.toLowerCase().includes(term);
      return inCategory && inSearch;
    });
  }

  function renderList() {
    const items = filteredOverlays();
    listEl.innerHTML = items.length ? items.map((overlay) => `
      <button class="ov-item ${overlay.id === selected.id ? 'active' : ''}" data-id="${escapeAttr(overlay.id)}">
        <span class="ov-icon">${escapeHtml(overlay.icon)}</span>
        <span style="min-width:0"><span class="ov-name">${escapeHtml(overlay.name)}</span><span class="ov-desc">${escapeHtml(overlay.desc)}</span></span>
        <span class="ov-pill">${escapeHtml(overlay.category)}</span>
      </button>
    `).join('') : '<div class="card ux-muted">No hay overlays para este filtro.</div>';
  }

  function selectOverlay(overlay) {
    selected = overlay;
    nameEl.textContent = overlay.name;
    descEl.textContent = overlay.desc;
    bgEl.style.background = overlay.bg || '#02030a';
    urlEl.value = getUrl(overlay);
    frameEl.removeAttribute('src');
    frameEl.srcdoc = renderPreviewDocument(overlay, mobileMode);
    renderList();
  }

  document.getElementById('overlayTabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll('.ov-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
    const first = filteredOverlays()[0] || OVERLAYS[0];
    selectOverlay(first);
  });

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    const overlay = OVERLAYS.find((item) => item.id === button.dataset.id);
    if (overlay) selectOverlay(overlay);
  });

  searchEl.addEventListener('input', () => {
    renderList();
  });

  modeBtns.forEach(btn => btn.addEventListener('click', () => {
    setMobileMode(btn.dataset.mode === 'mobile');
  }));

  document.getElementById('reloadPreview').addEventListener('click', () => {
    frameEl.srcdoc = renderPreviewDocument(selected, mobileMode);
  });

  document.getElementById('openOverlay').addEventListener('click', () => {
    window.open(getUrl(selected), '_blank', 'noopener');
  });

  document.getElementById('copyOverlay').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlEl.value);
      const button = document.getElementById('copyOverlay');
      button.textContent = 'Copiado';
      setTimeout(() => { button.textContent = 'Copiar URL'; }, 1600);
    } catch {
      urlEl.select();
      document.execCommand('copy');
    }
  });

  selectOverlay(selected);
}

function renderPreviewDocument(overlay, mobileMode) {
  const badges = (overlay.badges || [overlay.category]).map((badge) => `<span>${escapeHtml(badge)}</span>`).join('');
  const title = escapeHtml(overlay.name);
  const desc = escapeHtml(overlay.desc);
  const icon = escapeHtml(overlay.icon);
  const bg = escapeAttr(overlay.bg || '#070914');
  const isMobile = mobileMode;
  const mobileStyles = isMobile ? `.scene{grid-template-columns:1fr;width:82%;padding:24px;min-height:30vh}.mark{width:72px;height:72px;font-size:20px;margin:0 auto}h1{font-size:30px}p{font-size:15px}body::before{content:'📱 MODO MÓVIL · 1080×1920';position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:4px 10px;border-radius:6px;background:rgba(0,0,0,.5);color:rgba(255,255,255,.5);font:10px monospace;letter-spacing:1px}` : '';
  const desktopStyles = !isMobile ? `.scene{width:min(78%,980px);min-height:44%;display:grid;grid-template-columns:110px minmax(0,1fr);gap:26px;align-items:center;padding:34px}` : `.scene{width:min(78%,980px);min-height:44%;display:grid;gap:26px;align-items:center;padding:34px}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{width:100%;height:100%;margin:0;overflow:hidden;background:${bg};color:#f7f9ff;font-family:Inter,Segoe UI,Arial,sans-serif;}
    body{display:grid;place-items:center;background:radial-gradient(circle at 20% 15%,rgba(37,217,242,.18),transparent 34%),radial-gradient(circle at 82% 20%,rgba(255,61,113,.18),transparent 30%),${bg};}
    ${desktopStyles}
    .mark{width:110px;height:110px;display:grid;place-items:center;border-radius:22px;background:linear-gradient(135deg,rgba(37,217,242,.25),rgba(255,61,113,.24));color:#25d9f2;font-size:30px;font-weight:900;letter-spacing:.04em;}
    h1{margin:0 0 10px;font-size:42px;line-height:1;letter-spacing:0;font-weight:900;text-align:${isMobile ? 'center' : 'left'};}
    p{max-width:680px;margin:0;color:rgba(247,249,255,.7);font-size:18px;line-height:1.5;text-align:${isMobile ? 'center' : 'left'};}
    .badges{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap;justify-content:${isMobile ? 'center' : 'flex-start'}}.badges span{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);font-size:12px;font-weight:800;text-transform:uppercase;color:rgba(247,249,255,.78)}
    .meter{height:10px;margin-top:24px;border-radius:999px;background:rgba(255,255,255,.09);overflow:hidden}.meter i{display:block;width:72%;height:100%;background:linear-gradient(90deg,#25d9f2,#f2bd4d,#ff3d71)}
    ${mobileStyles}
  </style></head><body><main class="scene"><div class="mark">${icon}</div><section><h1>${title}</h1><p>${desc}</p><div class="badges">${badges}</div><div class="meter"><i></i></div></section></main></body></html>`;
}
function getCurrentUserId() {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}').id || '';
  } catch {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
