import { escapeHtml } from '/app/js/core/sanitize.js';

const OVERLAYS = [
  lastItem('last-follower','\u00DAltimo seguidor','follower','La persona m\u00E1s reciente que sigui\u00F3 tu cuenta.','#29d8ee'),
  lastItem('last-gifter','\u00DAltimo donante','gifter','El \u00FAltimo regalo, su autor y valor en monedas.','#f4bd50'),
  lastItem('last-subscriber','\u00DAltimo suscriptor','subscriber','Destaca al suscriptor o Super Fan m\u00E1s reciente.','#a78bfa'),
  lastItem('last-share','\u00DAltimo en compartir','share','Agradece a quien comparti\u00F3 tu LIVE m\u00E1s recientemente.','#35e59a'),
  lastItem('last-like','\u00DAltimo like','like','Muestra a la \u00FAltima persona que impuls\u00F3 el LIVE con likes.','#ff4d7d'),
  lastItem('last-chatter','\u00DAltimo comentario','chatter','Conserva visible el comentario m\u00E1s reciente del chat.','#25d9f2'),
  item('chat','Chat en vivo','/overlays/overlay-chat.html','Comunidad','Mensajes limpios y legibles en pantalla.','Panel lateral','panel','#29d8ee'),
  item('recent','Eventos recientes','/overlays/overlay-recent-events.html','Comunidad','Follows, shares, likes y regalos en orden.','Panel lateral','panel','#35e59a'),
  item('viewers','Espectadores LIVE','/overlays/overlay-viewer-count.html','HUD','Contador compacto de personas conectadas.','Esquina','hud','#29d8ee'),
  item('marquee','Ticker de regalos','/overlays/overlay-marquee.html','HUD','Actividad reciente en una barra inferior.','Franja inferior','hud','#f4bd50'),
  item('uptime','Tiempo en vivo','/overlays/overlay-uptime.html','HUD','Cronómetro minimalista de la transmisión.','Esquina','hud','#a78bfa'),
  item('top-gift','Mayor regalo','/overlays/overlay-top-gift.html','Alertas','Destaca el regalo más valioso y su autor.','Esquina inferior','alert','#f4bd50'),
  item('sounds','Alertas de sonido','/overlays/overlay-sounds.html','Alertas','Reproduce las alertas configuradas por regalo.','Fuente de audio','alert','#ff4d7d','/app/sounds'),
  item('tts','Texto a voz','/overlays/overlay-tts.html','Alertas','Lee mensajes del chat y muestra quién habló.','Audio + tarjeta','alert','#a78bfa','/app/chatbot'),
  item('actions','Acciones visuales','/overlays/overlay-actions.html','Alertas','Muestra animaciones disparadas por tus reglas.','Pantalla completa','alert','#ff4d7d','/app/actions'),
  item('goal','Meta del LIVE','/overlays/overlay-goal.html','Metas','Progreso de likes, follows, regalos o monedas.','Barra de progreso','goal','#35e59a','/app/goals'),
  item('timer','Temporizador visual','/overlays/overlay-timer.html','Metas','Reto con contador e imágenes personalizadas.','Escena de reto','goal','#29d8ee','/app/timers'),
  item('timer-extend','Timer extensible','/overlays/overlay-timer-extendable.html','Metas','Los regalos agregan tiempo a la partida.','Barra de tiempo','goal','#f4bd50','/app/timers'),
  item('hype','Hype Arena','/overlays/overlay-hype-arena.html','Juegos','Arena visual de likes, regalos, rachas y bosses.','Pantalla completa','game','#ff4d7d','/app/hype-arena',true),
  item('roulette','Ruleta','/overlays/overlay-ruleta.html','Juegos','Ruleta visible para sorteos y recompensas.','Escena interactiva','game','#a78bfa','/app/roulette'),
  item('participants','Participantes','/overlays/overlay-participantes.html','Juegos','Lista de usuarios dentro de la dinámica.','Panel de jugadores','panel','#35e59a'),
  item('auction','Subasta en vivo','/overlays/overlay-auction.html','Juegos','Estado, pujas y ganador de la subasta.','Escena de subasta','game','#f4bd50','/app/auctions'),
  item('ranking','Top donadores','/overlays/overlay-generic.html','Comunidad','Ranking visual de quienes más apoyan el LIVE.','Tabla de posiciones','panel','#f4bd50')
];
const DEFAULT_LASTX = { style:'glass', font:'outfit', accent:'#25d9f2', text:'#ffffff', align:'left', fade:260, avatar:true, label:true };

const CATEGORIES = ['Todos','\u00DAltimos','Comunidad','Alertas','Metas','Juegos','HUD'];
const MODES = {
  landscape:{ label:'Horizontal', icon:'fa-display', resolution:'1920 × 1080', param:null },
  portrait:{ label:'Vertical', icon:'fa-mobile-screen', resolution:'1080 × 1920', param:'mobile' }
};

export async function mount({ target, navigate, toast, signal }) {
  let selected = OVERLAYS.find((overlay) => overlay.featured) || OVERLAYS[0];
  let category = 'Todos';
  let mode = 'landscape';
  const userId = getCurrentUserId();
  let lastX = loadLastXConfig();
  const $ = (selector) => target.querySelector(selector);

  target.innerHTML = `
    <section class="overlay-studio">
      <header class="os-page-head">
        <div><span class="os-kicker">Overlay Studio</span><h1>Tu escena, lista para salir en vivo.</h1><p>Elige un widget, comprueba cómo se verá y copia una sola URL en OBS o TikTok LIVE Studio.</p></div>
        <div class="os-head-badges"><span class="os-head-badge"><i class="fa-solid fa-layer-group"></i>${OVERLAYS.length} overlays incluidos</span><span class="os-head-badge"><i class="fa-solid fa-display"></i>OBS + LIVE Studio</span></div>
      </header>

      <div class="os-flow" aria-label="Flujo para agregar un overlay">
        <div class="os-flow-step"><b>1</b><span><strong>Elige</strong> el widget adecuado</span></div>
        <div class="os-flow-step"><b>2</b><span><strong>Configura y prueba</strong> su contenido</span></div>
        <div class="os-flow-step"><b>3</b><span><strong>Copia la URL</strong> en tu escena</span></div>
      </div>

      <div class="os-workspace">
        <section class="os-catalog" aria-label="Catálogo de overlays">
          <div class="os-catalog-toolbar">
            <div class="os-search-row"><label class="os-search-wrap"><span class="sr-only">Buscar overlay</span><i class="fa-solid fa-magnifying-glass"></i><input class="os-search" id="overlaySearch" placeholder="Buscar chat, meta, ruleta…"></label><span class="os-result-count" id="resultCount"></span></div>
            <div class="os-tabs" id="overlayTabs">${CATEGORIES.map((name) => `<button class="os-tab ${name === category ? 'active' : ''}" data-category="${name}">${name}</button>`).join('')}</div>
          </div>
          <div class="os-grid" id="overlayGrid"></div>
        </section>

        <aside class="os-preview-panel" aria-label="Configuración y vista previa">
          <div class="os-selected-head">
            <div><span class="os-selected-label"><i class="fa-solid fa-eye"></i>Vista previa en vivo</span><h2 id="selectedName"></h2><p id="selectedDescription"></p></div>
            <div class="os-selected-actions"><button class="os-icon-button" id="reloadPreview" title="Recargar preview"><i class="fa-solid fa-rotate-right"></i></button><button class="os-icon-button" id="openPreview" title="Abrir en otra pestaña"><i class="fa-solid fa-arrow-up-right-from-square"></i></button></div>
          </div>
          <div class="os-preview-stage">
            <div class="os-device-bar"><div class="os-device-toggle">${Object.entries(MODES).map(([key,value]) => `<button class="os-mode ${key === mode ? 'active' : ''}" data-mode="${key}"><i class="fa-solid ${value.icon}"></i> ${value.label}</button>`).join('')}</div><span class="os-resolution" id="resolution"></span></div>
            <div class="os-frame-shell" id="frameShell"><iframe class="os-frame" id="previewFrame" title="Vista previa del overlay" allow="autoplay" allowtransparency="true"></iframe><span class="os-frame-state"><span class="status-dot connected"></span> Preview</span></div>
          </div>
          <section class="os-lastx-settings" id="lastxSettings" hidden>
            <div class="os-settings-head"><div><span>Personalizaci\u00F3n</span><strong>Dise\u00F1o Last X</strong></div><button class="os-reset-button" id="resetLastx"><i class="fa-solid fa-arrow-rotate-left"></i> Restablecer</button></div>
            <div class="os-settings-grid">
              <label class="os-field"><span>Estilo</span><select id="lastxStyle"><option value="glass">Glass</option><option value="neon">Ne\u00F3n</option><option value="minimal">Minimal</option></select></label>
              <label class="os-field"><span>Tipograf\u00EDa</span><select id="lastxFont"><option value="outfit">Outfit</option><option value="inter">Inter</option><option value="space">Space Grotesk</option></select></label>
              <label class="os-field"><span>Acento</span><input type="color" id="lastxAccent"></label>
              <label class="os-field"><span>Texto</span><input type="color" id="lastxText"></label>
              <label class="os-field"><span>Alineaci\u00F3n</span><select id="lastxAlign"><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label>
              <label class="os-field os-range-field"><span>Transici\u00F3n <output id="lastxFadeValue"></output></span><input type="range" id="lastxFade" min="0" max="1200" step="20"></label>
            </div>
            <div class="os-checks">
              <label><input type="checkbox" id="lastxAvatar"><span>Mostrar avatar</span></label>
              <label><input type="checkbox" id="lastxLabel"><span>Mostrar etiqueta</span></label>
            </div>
          </section>

          <div class="os-config">
            <div class="os-url-wrap"><label for="overlayUrl">URL para Browser Source</label><input class="os-url" id="overlayUrl" readonly></div>
            <div class="os-copy-actions"><button class="btn btn-secondary" id="testOverlay"><i class="fa-solid fa-flask"></i>Probar</button><button class="btn btn-secondary" id="configureOverlay"><i class="fa-solid fa-sliders"></i>Configurar</button><button class="btn btn-primary" id="copyOverlay"><i class="fa-regular fa-copy"></i>Copiar URL</button></div>
          </div>
          <div class="os-details"><div class="os-detail"><span>Categoría</span><strong id="detailCategory"></strong></div><div class="os-detail"><span>Ubicación ideal</span><strong id="detailPlacement"></strong></div><div class="os-detail"><span>Formato</span><strong id="detailMode"></strong></div></div>
          <div class="os-setup-callout" id="setupCallout"><span><strong>Antes de transmitir:</strong> configura este overlay para que muestre tus datos reales.</span><button class="btn btn-secondary btn-sm" id="setupAction">Ir a configurar</button></div>
        </aside>
      </div>
      <div class="os-help"><i class="fa-regular fa-lightbulb"></i><span>En OBS agrega una <strong>Fuente de navegador</strong>. En TikTok LIVE Studio agrega una <strong>Fuente de enlace</strong>. Usa la resolución mostrada en el preview.</span></div>
    </section>`;

  function getUrl(overlay, preview = false) {
    const url = new URL(overlay.file, window.location.origin);
    if (userId) url.searchParams.set('userId', userId);
    if (MODES[mode].param) url.searchParams.set('mode', MODES[mode].param);
    if (overlay.lastType) {
      url.searchParams.set('x', overlay.lastType);
      url.searchParams.set('style', lastX.style);
      url.searchParams.set('font', lastX.font);
      url.searchParams.set('accent', lastX.accent.replace('#',''));
      url.searchParams.set('text', lastX.text.replace('#',''));
      url.searchParams.set('align', lastX.align);
      url.searchParams.set('fade', String(lastX.fade));
      url.searchParams.set('avatar', lastX.avatar ? '1' : '0');
      url.searchParams.set('label', lastX.label ? '1' : '0');
      if (preview) url.searchParams.set('demo','1');
    } else if (preview && overlay.id === 'hype') url.searchParams.set('demo','1');
    return url.toString();
  }

  function filtered() {
    const term = $('#overlaySearch').value.trim().toLowerCase();
    return OVERLAYS.filter((overlay) => (category === 'Todos' || overlay.category === category) && (!term || `${overlay.name} ${overlay.description} ${overlay.category} ${overlay.placement}`.toLowerCase().includes(term)));
  }

  function renderCatalog() {
    const items = filtered();
    $('#resultCount').textContent = `${items.length} de ${OVERLAYS.length}`;
    $('#overlayGrid').innerHTML = items.length ? items.map((overlay) => `
      <button class="os-overlay-card ${overlay.id === selected.id ? 'active' : ''}" style="--card-accent:${overlay.accent}" data-overlay-id="${overlay.id}">
        <span class="os-card-state ${overlay.settingsPath || overlay.lastType ? 'setup' : ''}">${overlay.lastType ? 'Personalizable' : overlay.settingsPath ? 'Configurable' : 'Listo'}</span>
        <span class="os-mini-preview" data-visual="${overlay.visual}"></span>
        <span class="os-card-copy"><strong>${escapeHtml(overlay.name)}</strong><span>${escapeHtml(overlay.description)}</span><span class="os-card-meta"><span><i class="fa-solid fa-tag"></i> ${overlay.category}</span><span>${overlay.placement}</span></span></span>
      </button>`).join('') : '<div class="os-empty"><div><i class="fa-solid fa-magnifying-glass"></i><p>No hay overlays con ese filtro.</p></div></div>';
  }

  function syncLastXControls() {
    $('#lastxStyle').value = lastX.style;
    $('#lastxFont').value = lastX.font;
    $('#lastxAccent').value = lastX.accent;
    $('#lastxText').value = lastX.text;
    $('#lastxAlign').value = lastX.align;
    $('#lastxFade').value = String(lastX.fade);
    $('#lastxFadeValue').textContent = `${lastX.fade} ms`;
    $('#lastxAvatar').checked = lastX.avatar;
    $('#lastxLabel').checked = lastX.label;
  }

  function renderSelected() {
    $('#selectedName').textContent = selected.name;
    $('#selectedDescription').textContent = selected.description;
    $('#detailCategory').textContent = selected.category;
    $('#detailPlacement').textContent = selected.placement;
    $('#detailMode').textContent = MODES[mode].label;
    $('#resolution').textContent = MODES[mode].resolution;
    $('#frameShell').classList.toggle('portrait', mode === 'portrait');
    $('#overlayUrl').value = getUrl(selected, false);
    $('#configureOverlay').hidden = !selected.settingsPath;
    $('#setupCallout').hidden = !selected.settingsPath;
    $('#lastxSettings').hidden = !selected.lastType;
    if (selected.lastType) syncLastXControls();
    const frame = $('#previewFrame');
    frame.src = 'about:blank';
    requestAnimationFrame(() => { frame.src = getUrl(selected, true); });
  }

  function selectOverlay(id) {
    selected = OVERLAYS.find((overlay) => overlay.id === id) || selected;
    renderCatalog();
    renderSelected();
  }
  function updateLastX() {
    lastX = {
      style:$('#lastxStyle').value,
      font:$('#lastxFont').value,
      accent:$('#lastxAccent').value,
      text:$('#lastxText').value,
      align:$('#lastxAlign').value,
      fade:Number($('#lastxFade').value),
      avatar:$('#lastxAvatar').checked,
      label:$('#lastxLabel').checked
    };
    saveLastXConfig(lastX);
    $('#lastxFadeValue').textContent = `${lastX.fade} ms`;
    $('#overlayUrl').value = getUrl(selected, false);
    const frame = $('#previewFrame');
    clearTimeout(updateLastX.timer);
    updateLastX.timer = setTimeout(() => { frame.src = getUrl(selected, true); }, 120);
  }


  target.addEventListener('click', async (event) => {
    const categoryButton = event.target.closest('[data-category]');
    if (categoryButton) {
      category = categoryButton.dataset.category;
      target.querySelectorAll('[data-category]').forEach((button) => button.classList.toggle('active', button === categoryButton));
      const items = filtered();
      if (!items.some((overlay) => overlay.id === selected.id) && items[0]) selected = items[0];
      renderCatalog(); renderSelected(); return;
    }
    const card = event.target.closest('[data-overlay-id]');
    if (card) return selectOverlay(card.dataset.overlayId);
    const modeButton = event.target.closest('[data-mode]');
    if (modeButton) {
      mode = modeButton.dataset.mode;
      target.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button === modeButton));
      renderSelected(); return;
    }
    if (event.target.closest('#reloadPreview') || event.target.closest('#testOverlay')) {
      renderSelected();
      toast?.showToast?.({ type:'success', message:`Prueba de ${selected.name} ejecutada` });
      return;
    }
    if (event.target.closest('#openPreview')) return window.open(getUrl(selected,false),'_blank','noopener');
    if (event.target.closest('#configureOverlay') || event.target.closest('#setupAction')) return selected.settingsPath && navigate(selected.settingsPath);
    if (event.target.closest('#resetLastx')) {
      lastX = { ...DEFAULT_LASTX };
      saveLastXConfig(lastX);
      syncLastXControls();
      renderSelected();
      return;
    }
    if (event.target.closest('#copyOverlay')) {
      try { await navigator.clipboard.writeText($('#overlayUrl').value); }
      catch { $('#overlayUrl').select(); document.execCommand('copy'); }
      toast?.showToast?.({ type:'success', message:`URL de ${selected.name} copiada` });
    }
  }, { signal });
  $('#overlaySearch').addEventListener('input', renderCatalog, { signal });
  renderCatalog(); renderSelected();
  ['lastxStyle','lastxFont','lastxAccent','lastxText','lastxAlign','lastxFade','lastxAvatar','lastxLabel'].forEach((id) => $(`#${id}`).addEventListener('input', updateLastX, { signal }));
}

function item(id,name,file,category,description,placement,visual,accent,settingsPath=null,featured=false) {
  return { id,name,file,category,description,placement,visual,accent,settingsPath,featured };
}


function lastItem(id,name,lastType,description,accent) {
  return { ...item(id,name,'/overlays/overlay-lastx.html','\u00DAltimos',description,'Esquina o franja','lastx',accent), lastType };
}

function loadLastXConfig() {
  try { return { ...DEFAULT_LASTX, ...JSON.parse(localStorage.getItem('tiktool:lastx:config') || '{}') }; }
  catch { return { ...DEFAULT_LASTX }; }
}

function saveLastXConfig(config) {
  try { localStorage.setItem('tiktool:lastx:config', JSON.stringify(config)); } catch {}
}
function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    return user.id || user.userId || '';
  } catch { return ''; }
}
