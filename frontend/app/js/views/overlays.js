/**
 * Overlay Studio View - TikToolStream
 * Organized responsive catalog for OBS overlays.
 */

const OVERLAYS = [
  {
    id: 'hype-arena',
    name: 'Hype Arena',
    file: '/overlays/overlay-hype-arena.html',
    desc: 'Escena central con hype, rachas, regalos y resultados de juego.',
    icon: 'HA',
    category: 'Interactivo',
    scene: 'Show principal',
    tone: 'Premium / competitivo',
    format: 'Full screen',
    bg: '#050713',
    featured: true,
    previewDemo: true,
    badges: ['Nuevo', 'Interactivo', 'Demo']
  },
  {
    id: 'actions',
    name: 'Acciones y Eventos',
    file: '/overlays/overlay-actions.html',
    desc: 'Alertas visuales, audio, video e imagenes disparadas por eventos.',
    icon: 'AE',
    category: 'Alertas',
    scene: 'Momentos especiales',
    tone: 'Impacto visual',
    format: 'Overlay transparente',
    bg: '#070a19',
    badges: ['Cola', 'Automatizable']
  },
  {
    id: 'sounds',
    name: 'Alertas de Sonido',
    file: '/overlays/overlay-sounds.html',
    desc: 'Reproduce sonidos y muestra una tarjeta animada cuando llegan regalos.',
    icon: 'SO',
    category: 'Alertas',
    scene: 'Reacciones',
    tone: 'Energico',
    format: 'Centro / transparente',
    bg: '#080716',
    badges: ['Biblioteca', 'Regalos']
  },
  {
    id: 'tts',
    name: 'Texto a Voz',
    file: '/overlays/overlay-tts.html',
    desc: 'Convierte comentarios seleccionados en una experiencia de voz.',
    icon: 'VO',
    category: 'Comunidad',
    scene: 'Chat interactivo',
    tone: 'Participativo',
    format: 'Audio + tarjeta',
    bg: '#101827',
    badges: ['Chat', 'Voz']
  },
  {
    id: 'chat',
    name: 'Chat en Vivo',
    file: '/overlays/overlay-chat.html',
    desc: 'Muestra mensajes del LIVE en una capa limpia para pantalla.',
    icon: 'CH',
    category: 'Comunidad',
    scene: 'Lateral / full',
    tone: 'Social',
    format: 'Panel',
    bg: '#07101f',
    badges: ['Mensajes']
  },
  {
    id: 'events',
    name: 'Eventos Recientes',
    file: '/overlays/overlay-recent-events.html',
    desc: 'Timeline de follows, shares, likes y regalos para mostrar actividad.',
    icon: 'EV',
    category: 'Comunidad',
    scene: 'Lateral',
    tone: 'Informativo',
    format: 'Feed',
    bg: '#07101f',
    badges: ['Timeline']
  },
  {
    id: 'viewers',
    name: 'Contador Viewers',
    file: '/overlays/overlay-viewer-count.html',
    desc: 'Indicador LIVE compacto con espectadores actuales.',
    icon: 'VW',
    category: 'HUD',
    scene: 'Esquina',
    tone: 'Minimal',
    format: 'Widget',
    bg: '#05111b',
    badges: ['Live']
  },
  {
    id: 'marquee',
    name: 'Ticker de Regalos',
    file: '/overlays/overlay-marquee.html',
    desc: 'Barra inferior con actividad reciente para mantener movimiento.',
    icon: 'TK',
    category: 'HUD',
    scene: 'Lower third',
    tone: 'Dinamico',
    format: 'Barra',
    bg: '#07101f',
    badges: ['Ticker']
  },
  {
    id: 'uptime',
    name: 'Tiempo en Vivo',
    file: '/overlays/overlay-uptime.html',
    desc: 'Cronometro simple para mostrar duracion del stream.',
    icon: 'UP',
    category: 'HUD',
    scene: 'Esquina',
    tone: 'Minimal',
    format: 'Widget',
    bg: '#06111d',
    badges: ['Timer']
  },
  {
    id: 'goal',
    name: 'Metas',
    file: '/overlays/overlay-goal.html',
    desc: 'Barra de progreso para likes, follows, shares o monedas.',
    icon: 'MT',
    category: 'Objetivos',
    scene: 'Superior / inferior',
    tone: 'Motivacional',
    format: 'Progress bar',
    bg: '#10110a',
    badges: ['Progreso']
  },
  {
    id: 'timer',
    name: 'Timer Subasta',
    file: '/overlays/overlay-timer.html',
    desc: 'Temporizador principal con fases, extension y ganador.',
    icon: 'TM',
    category: 'Subasta',
    scene: 'Centro / esquina',
    tone: 'Competitivo',
    format: 'Timer',
    bg: '#110b08',
    badges: ['Subasta']
  },
  {
    id: 'extimer',
    name: 'Timer Extensible',
    file: '/overlays/overlay-timer-extendable.html',
    desc: 'Countdown que aumenta cuando llegan regalos configurados.',
    icon: 'TE',
    category: 'Subasta',
    scene: 'Centro',
    tone: 'Urgente',
    format: 'Timer interactivo',
    bg: '#110b08',
    badges: ['Regalos']
  },
  {
    id: 'roulette',
    name: 'Ruleta',
    file: '/overlays/overlay-ruleta.html',
    desc: 'Escena de ruleta para retos, premios y dinamicas del chat.',
    icon: 'RL',
    category: 'Juego',
    scene: 'Full screen',
    tone: 'Show',
    format: 'Juego',
    bg: '#0c0715',
    badges: ['Juego']
  },
  {
    id: 'participants',
    name: 'Participantes',
    file: '/overlays/overlay-participantes.html',
    desc: 'Lista visual de usuarios participantes en dinamicas.',
    icon: 'PA',
    category: 'Juego',
    scene: 'Panel',
    tone: 'Comunidad',
    format: 'Lista',
    bg: '#0c0715',
    badges: ['Usuarios']
  },
  {
    id: 'leaderboard',
    name: 'Leaderboard',
    file: '/overlays/overlay-generic.html',
    desc: 'Ranking de donadores o actividad para reforzar competencia.',
    icon: 'LB',
    category: 'Ranking',
    scene: 'Panel / full',
    tone: 'Competitivo',
    format: 'Ranking',
    bg: '#071015',
    badges: ['Top']
  }
];

const CATEGORY_ORDER = ['Todos', 'Interactivo', 'Alertas', 'Comunidad', 'HUD', 'Objetivos', 'Subasta', 'Juego', 'Ranking'];
const VIEW_MODES = {
  desktop: { label: 'Desktop', short: '16:9', obs: '1920 x 1080', param: null },
  mobile: { label: 'Vertical', short: '9:16', obs: '1080 x 1920', param: 'mobile' }
};

export async function mount({ target, signal } = {}) {
  const userId = getCurrentUserId();
  let selected = OVERLAYS.find((overlay) => overlay.featured) || OVERLAYS[0];
  let activeCategory = 'Todos';
  let activeMode = 'desktop';

  const categories = CATEGORY_ORDER.filter((category) => category === 'Todos' || OVERLAYS.some((overlay) => overlay.category === category));

  target.innerHTML = `
    <style>
      .overlay-studio { --os-line: rgba(255,255,255,.095); --os-soft: rgba(255,255,255,.055); --os-card: rgba(10,14,28,.78); --os-card-2: rgba(14,20,38,.92); --os-cyan: #25d9f2; --os-pink: #ff3d71; --os-gold: #f2bd4d; display: grid; gap: 22px; }
      .os-hero { position: relative; overflow: hidden; border: 1px solid var(--os-line); border-radius: 26px; padding: clamp(22px, 3vw, 34px); background: radial-gradient(circle at 8% 0%, rgba(37,217,242,.20), transparent 34%), radial-gradient(circle at 92% 12%, rgba(255,61,113,.18), transparent 30%), linear-gradient(135deg, rgba(13,18,36,.96), rgba(8,11,24,.96)); box-shadow: 0 24px 70px rgba(0,0,0,.34); }
      .os-hero::after { content: ''; position: absolute; inset: auto -10% -45% 35%; height: 190px; background: linear-gradient(90deg, transparent, rgba(37,217,242,.16), transparent); transform: rotate(-8deg); pointer-events: none; }
      .os-hero-grid { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; }
      .os-kicker { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px; color: var(--os-cyan); font-size: .78rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
      .os-title { margin: 0; color: #fff; font-size: clamp(2rem, 4vw, 4.6rem); line-height: .95; letter-spacing: -.06em; font-weight: 950; }
      .os-subtitle { max-width: 850px; margin: 14px 0 0; color: rgba(245,248,255,.70); font-size: clamp(.98rem, 1.4vw, 1.12rem); line-height: 1.7; }
      .os-hero-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
      .os-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 22px; max-width: 720px; }
      .os-metric { padding: 14px 16px; border: 1px solid var(--os-line); border-radius: 16px; background: rgba(255,255,255,.045); }
      .os-metric strong { display: block; color: #fff; font-size: 1.35rem; font-weight: 950; }
      .os-metric span { display: block; margin-top: 3px; color: rgba(245,248,255,.58); font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .os-layout { display: grid; grid-template-columns: minmax(290px, 372px) minmax(0, 1fr); gap: 22px; align-items: start; }
      .os-card { border: 1px solid var(--os-line); border-radius: 22px; background: var(--os-card); box-shadow: 0 18px 48px rgba(0,0,0,.25); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
      .os-sidebar { position: sticky; top: calc(var(--header-height, 76px) + 18px); display: grid; gap: 16px; padding: 16px; max-height: calc(100vh - var(--header-height, 76px) - 36px); overflow: hidden; }
      .os-search-wrap { position: relative; }
      .os-search { width: 100%; min-height: 50px; padding: 14px 44px 14px 16px; border: 1px solid var(--os-line); border-radius: 15px; background: rgba(2,5,14,.68); color: #fff; outline: none; font-size: .98rem; }
      .os-search:focus { border-color: rgba(37,217,242,.55); box-shadow: 0 0 0 3px rgba(37,217,242,.12); }
      .os-search-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.40); font-size: .78rem; font-weight: 900; }
      .os-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
      .os-tab { flex: 0 0 auto; min-height: 36px; padding: 9px 12px; border: 1px solid var(--os-line); border-radius: 999px; background: rgba(255,255,255,.04); color: rgba(245,248,255,.68); font-size: .78rem; font-weight: 900; cursor: pointer; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
      .os-tab:hover { transform: translateY(-1px); border-color: rgba(37,217,242,.34); }
      .os-tab.active { border-color: rgba(37,217,242,.55); background: rgba(37,217,242,.14); color: #fff; }
      .os-list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: rgba(245,248,255,.58); font-size: .76rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
      .os-list { display: grid; gap: 10px; overflow: auto; padding-right: 4px; scrollbar-width: thin; }
      .os-item { display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 12px; align-items: center; width: 100%; padding: 12px; border: 1px solid transparent; border-radius: 16px; background: rgba(255,255,255,.035); color: #fff; text-align: left; cursor: pointer; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
      .os-item:hover { transform: translateY(-1px); border-color: rgba(37,217,242,.24); background: rgba(255,255,255,.06); }
      .os-item.active { border-color: rgba(37,217,242,.55); background: linear-gradient(135deg, rgba(37,217,242,.14), rgba(255,61,113,.08)); box-shadow: inset 4px 0 0 var(--os-cyan); }
      .os-item-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, rgba(37,217,242,.20), rgba(255,61,113,.18)); color: var(--os-cyan); font-weight: 950; letter-spacing: -.03em; }
      .os-item-name { display: block; overflow: hidden; font-size: .96rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
      .os-item-meta { display: flex; gap: 7px; align-items: center; margin-top: 5px; color: rgba(245,248,255,.52); font-size: .74rem; font-weight: 700; }
      .os-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(245,248,255,.35); }
      .os-empty { padding: 18px; border: 1px dashed var(--os-line); border-radius: 16px; color: rgba(245,248,255,.58); text-align: center; }
      .os-main { display: grid; gap: 18px; min-width: 0; }
      .os-preview-card { overflow: hidden; background: linear-gradient(180deg, rgba(15,22,42,.92), rgba(8,10,22,.92)); }
      .os-preview-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: start; padding: clamp(18px, 2.2vw, 26px); border-bottom: 1px solid var(--os-line); }
      .os-selected-kicker { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .os-chip { display: inline-flex; align-items: center; min-height: 26px; padding: 5px 9px; border: 1px solid rgba(255,255,255,.12); border-radius: 999px; background: rgba(255,255,255,.055); color: rgba(245,248,255,.72); font-size: .70rem; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
      .os-chip.hot { border-color: rgba(255,61,113,.32); background: rgba(255,61,113,.12); color: #fff; }
      .os-selected-title { display: flex; gap: 14px; align-items: center; min-width: 0; }
      .os-selected-icon { width: 58px; height: 58px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 18px; background: linear-gradient(135deg, rgba(37,217,242,.25), rgba(255,61,113,.20)); color: var(--os-cyan); font-size: 1.05rem; font-weight: 950; }
      .os-selected-title h2 { margin: 0; overflow: hidden; color: #fff; font-size: clamp(1.45rem, 2.4vw, 2.2rem); line-height: 1; letter-spacing: -.04em; text-overflow: ellipsis; white-space: nowrap; }
      .os-selected-title p { margin: 8px 0 0; color: rgba(245,248,255,.66); line-height: 1.65; }
      .os-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; min-width: min(390px, 100%); }
      .os-mode-toggle { display: inline-flex; min-height: 42px; padding: 4px; border: 1px solid var(--os-line); border-radius: 14px; background: rgba(0,0,0,.22); }
      .os-mode { border: 0; border-radius: 10px; padding: 9px 12px; background: transparent; color: rgba(245,248,255,.60); font-size: .78rem; font-weight: 900; cursor: pointer; }
      .os-mode.active { background: linear-gradient(135deg, var(--os-cyan), #7b2ff7); color: #fff; box-shadow: 0 8px 22px rgba(37,217,242,.22); }
      .os-preview-body { padding: clamp(12px, 2vw, 22px); background: radial-gradient(circle at 50% 0%, rgba(37,217,242,.12), transparent 35%), #02040b; }
      .os-frame-shell { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border: 1px solid rgba(255,255,255,.09); border-radius: 20px; background: #02040b; transition: max-width .24s ease, aspect-ratio .24s ease; box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 22px 70px rgba(0,0,0,.35); }
      .os-frame-shell.mobile { aspect-ratio: 9 / 16; max-width: min(420px, 100%); margin-inline: auto; }
      .os-frame-toolbar { position: absolute; z-index: 2; left: 12px; right: 12px; bottom: 12px; display: flex; justify-content: space-between; gap: 10px; pointer-events: none; }
      .os-frame-label { display: inline-flex; align-items: center; min-height: 30px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.10); border-radius: 999px; background: rgba(0,0,0,.62); color: rgba(245,248,255,.68); font: 700 11px/1 var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace); }
      .os-preview-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: transparent; }
      .os-url-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: clamp(16px, 2vw, 22px); border-top: 1px solid var(--os-line); }
      .os-url { min-width: 0; min-height: 46px; padding: 12px 14px; border: 1px solid var(--os-line); border-radius: 14px; background: rgba(0,0,0,.25); color: var(--os-cyan); font: 700 .86rem/1.4 var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace); overflow: hidden; text-overflow: ellipsis; }
      .os-detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .os-detail { padding: 16px; border: 1px solid var(--os-line); border-radius: 18px; background: rgba(255,255,255,.04); }
      .os-detail span { display: block; color: rgba(245,248,255,.48); font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
      .os-detail strong { display: block; margin-top: 6px; color: #fff; font-size: .98rem; line-height: 1.35; }
      .os-guide { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .os-guide-card { position: relative; overflow: hidden; padding: 18px; border: 1px solid var(--os-line); border-radius: 20px; background: rgba(255,255,255,.04); }
      .os-guide-card::before { content: attr(data-step); display: grid; place-items: center; width: 32px; height: 32px; margin-bottom: 14px; border-radius: 10px; background: rgba(37,217,242,.14); color: var(--os-cyan); font-weight: 950; }
      .os-guide-card strong { display: block; color: #fff; margin-bottom: 8px; }
      .os-guide-card span { color: rgba(245,248,255,.62); font-size: .9rem; line-height: 1.65; }
      @media (max-width: 1180px) { .os-layout { grid-template-columns: 1fr; } .os-sidebar { position: relative; top: 0; max-height: none; } .os-list { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: none; } }
      @media (max-width: 860px) { .os-hero-grid, .os-preview-head, .os-url-panel { grid-template-columns: 1fr; } .os-hero-actions, .os-actions { justify-content: flex-start; min-width: 0; } .os-metrics, .os-detail-grid, .os-guide { grid-template-columns: 1fr; } .os-list { grid-template-columns: 1fr; } .os-selected-title { align-items: flex-start; } .os-selected-title h2 { white-space: normal; } }
      @media (max-width: 560px) { .overlay-studio { gap: 16px; } .os-hero, .os-card { border-radius: 18px; } .os-hero { padding: 20px; } .os-title { font-size: 2.15rem; } .os-metrics { gap: 8px; } .os-metric { padding: 12px; } .os-preview-head, .os-preview-body, .os-url-panel { padding: 14px; } .os-selected-title { display: grid; grid-template-columns: 48px minmax(0, 1fr); } .os-selected-icon { width: 48px; height: 48px; border-radius: 14px; } .os-actions > .btn, .os-url-panel > .btn { width: 100%; } .os-mode-toggle { width: 100%; } .os-mode { flex: 1; } }
    </style>

    <section class="overlay-studio" aria-label="Overlay Studio">
      <header class="os-hero">
        <div class="os-hero-grid">
          <div>
            <div class="os-kicker">Overlay Studio</div>
            <h1 class="os-title">Escenas listas para OBS</h1>
            <p class="os-subtitle">Catalogo organizado por uso real: elige la escena, cambia entre formato horizontal o vertical, prueba el preview y copia una URL limpia para Browser Source.</p>
            <div class="os-metrics" aria-label="Resumen de overlays">
              <div class="os-metric"><strong>${OVERLAYS.length}</strong><span>Overlays</span></div>
              <div class="os-metric"><strong>${categories.length - 1}</strong><span>Categorias</span></div>
              <div class="os-metric"><strong>2</strong><span>Formatos OBS</span></div>
            </div>
          </div>
          <div class="os-hero-actions">
            <button class="btn btn-primary" id="openFeaturedOverlay">Abrir destacado</button>
            <a class="btn btn-secondary" href="/app/actions" data-router-link>Configurar acciones</a>
          </div>
        </div>
      </header>

      <div class="os-layout">
        <aside class="os-card os-sidebar" aria-label="Catalogo de overlays">
          <div class="os-search-wrap">
            <input id="overlaySearch" class="os-search" type="search" placeholder="Buscar por nombre, uso o categoria" autocomplete="off">
            <span class="os-search-icon">BUSCAR</span>
          </div>
          <nav class="os-tabs" id="overlayTabs" aria-label="Categorias de overlays">
            ${categories.map((category) => `<button class="os-tab ${category === activeCategory ? 'active' : ''}" type="button" data-category="${escapeAttr(category)}">${escapeHtml(category)} <span>${categoryCount(category)}</span></button>`).join('')}
          </nav>
          <div class="os-list-head"><span>Catalogo</span><span id="overlayCount"></span></div>
          <div class="os-list" id="overlayList"></div>
        </aside>

        <main class="os-main">
          <section class="os-card os-preview-card" aria-label="Preview del overlay seleccionado">
            <div class="os-preview-head">
              <div>
                <div class="os-selected-kicker" id="selectedBadges"></div>
                <div class="os-selected-title">
                  <div class="os-selected-icon" id="selectedIcon"></div>
                  <div>
                    <h2 id="previewName"></h2>
                    <p id="previewDesc"></p>
                  </div>
                </div>
              </div>
              <div class="os-actions">
                <div class="os-mode-toggle" role="group" aria-label="Formato de preview">
                  ${Object.entries(VIEW_MODES).map(([key, mode]) => `<button class="os-mode ${key === activeMode ? 'active' : ''}" type="button" data-mode="${key}">${mode.label} <span>${mode.short}</span></button>`).join('')}
                </div>
                <button class="btn btn-secondary" id="reloadPreview" type="button">Recargar</button>
                <button class="btn btn-primary" id="openOverlay" type="button">Abrir</button>
              </div>
            </div>

            <div class="os-preview-body">
              <div class="os-frame-shell" id="previewShell">
                <iframe id="previewFrame" class="os-preview-frame" title="Preview de overlay" allow="autoplay" allowtransparency="true"></iframe>
                <div class="os-frame-toolbar">
                  <span class="os-frame-label" id="previewLabel"></span>
                  <span class="os-frame-label" id="previewModeLabel"></span>
                </div>
              </div>
            </div>

            <div class="os-url-panel">
              <input id="overlayUrl" class="os-url" readonly aria-label="URL para OBS Browser Source">
              <button class="btn btn-primary" id="copyOverlay" type="button">Copiar URL OBS</button>
            </div>
          </section>

          <section class="os-detail-grid" aria-label="Detalles del overlay seleccionado">
            <div class="os-detail"><span>Uso recomendado</span><strong id="detailScene"></strong></div>
            <div class="os-detail"><span>Estilo</span><strong id="detailTone"></strong></div>
            <div class="os-detail"><span>Formato</span><strong id="detailFormat"></strong></div>
          </section>

          <section class="os-guide" aria-label="Guia rapida OBS">
            <div class="os-guide-card" data-step="1"><strong>Agrega Browser Source</strong><span>En OBS usa la URL copiada. Mant?n ancho y alto segun el formato elegido.</span></div>
            <div class="os-guide-card" data-step="2"><strong>Ordena por capas</strong><span>HUD y alertas arriba; escenas completas como Hype Arena pueden ir como fuente principal.</span></div>
            <div class="os-guide-card" data-step="3"><strong>Prueba con demo</strong><span>El preview puede usar datos falsos. La URL copiada queda limpia para tu stream real.</span></div>
          </section>
        </main>
      </div>
    </section>
  `;

  const refs = {
    list: target.querySelector('#overlayList'),
    search: target.querySelector('#overlaySearch'),
    tabs: target.querySelector('#overlayTabs'),
    count: target.querySelector('#overlayCount'),
    frame: target.querySelector('#previewFrame'),
    shell: target.querySelector('#previewShell'),
    url: target.querySelector('#overlayUrl'),
    name: target.querySelector('#previewName'),
    desc: target.querySelector('#previewDesc'),
    icon: target.querySelector('#selectedIcon'),
    badges: target.querySelector('#selectedBadges'),
    label: target.querySelector('#previewLabel'),
    modeLabel: target.querySelector('#previewModeLabel'),
    detailScene: target.querySelector('#detailScene'),
    detailTone: target.querySelector('#detailTone'),
    detailFormat: target.querySelector('#detailFormat')
  };

  const listen = (node, type, handler) => node?.addEventListener(type, handler, signal ? { signal } : undefined);

  function categoryCount(category) {
    return category === 'Todos' ? OVERLAYS.length : OVERLAYS.filter((overlay) => overlay.category === category).length;
  }

  function currentMode() {
    return VIEW_MODES[activeMode] || VIEW_MODES.desktop;
  }

  function getUrl(overlay, options = {}) {
    const url = new URL(overlay.file, window.location.origin);
    if (userId) url.searchParams.set('userId', userId);
    if (options.preview && overlay.previewDemo) url.searchParams.set('demo', '1');
    if (currentMode().param) url.searchParams.set('mode', currentMode().param);
    return url.toString();
  }

  function filteredOverlays() {
    const term = refs.search.value.trim().toLowerCase();
    return OVERLAYS.filter((overlay) => {
      const matchesCategory = activeCategory === 'Todos' || overlay.category === activeCategory;
      const haystack = `${overlay.name} ${overlay.desc} ${overlay.category} ${overlay.scene} ${overlay.tone} ${(overlay.badges || []).join(' ')}`.toLowerCase();
      return matchesCategory && (!term || haystack.includes(term));
    });
  }

  function renderList(items = filteredOverlays()) {
    refs.count.textContent = `${items.length} visibles`;
    refs.list.innerHTML = items.length ? items.map((overlay) => `
      <button class="os-item ${overlay.id === selected.id ? 'active' : ''}" type="button" data-id="${escapeAttr(overlay.id)}" aria-label="Seleccionar ${escapeAttr(overlay.name)}">
        <span class="os-item-icon">${escapeHtml(overlay.icon)}</span>
        <span style="min-width:0">
          <span class="os-item-name">${escapeHtml(overlay.name)}</span>
          <span class="os-item-meta"><span>${escapeHtml(overlay.category)}</span><span class="os-dot"></span><span>${escapeHtml(overlay.scene)}</span></span>
        </span>
      </button>
    `).join('') : '<div class="os-empty">No hay overlays con este filtro.</div>';
  }

  function renderTabs() {
    target.querySelectorAll('.os-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === activeCategory);
    });
  }

  function updatePreview() {
    const mode = currentMode();
    refs.name.textContent = selected.name;
    refs.desc.textContent = selected.desc;
    refs.icon.textContent = selected.icon;
    refs.detailScene.textContent = selected.scene;
    refs.detailTone.textContent = selected.tone;
    refs.detailFormat.textContent = selected.format;
    refs.label.textContent = mode.obs;
    refs.modeLabel.textContent = selected.previewDemo ? 'Preview demo' : 'Preview real';
    refs.shell.style.background = selected.bg || '#02040b';
    refs.shell.classList.toggle('mobile', activeMode === 'mobile');
    refs.badges.innerHTML = [selected.category, ...(selected.badges || [])].map((badge, index) => `<span class="os-chip ${index === 1 ? 'hot' : ''}">${escapeHtml(badge)}</span>`).join('');
    refs.url.value = getUrl(selected, { preview: false });
    const previewUrl = getUrl(selected, { preview: true });
    refs.frame.src = 'about:blank';
    requestAnimationFrame(() => { refs.frame.src = previewUrl; });
  }

  function refreshCatalog({ keepSelection = true } = {}) {
    const items = filteredOverlays();
    if (!keepSelection || (items.length && !items.some((overlay) => overlay.id === selected.id))) {
      selected = items[0] || OVERLAYS[0];
    }
    renderTabs();
    renderList(items);
    updatePreview();
  }

  function selectOverlay(id) {
    const overlay = OVERLAYS.find((item) => item.id === id);
    if (!overlay) return;
    selected = overlay;
    renderList(filteredOverlays());
    updatePreview();
  }

  async function copyOverlayUrl() {
    const button = target.querySelector('#copyOverlay');
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(refs.url.value);
      button.textContent = 'URL copiada';
    } catch {
      refs.url.select();
      document.execCommand('copy');
      button.textContent = 'URL copiada';
    }
    setTimeout(() => { button.textContent = original; }, 1400);
  }

  listen(refs.tabs, 'click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    refreshCatalog({ keepSelection: false });
  });

  listen(refs.list, 'click', (event) => {
    const button = event.target.closest('[data-id]');
    if (button) selectOverlay(button.dataset.id);
  });

  listen(refs.search, 'input', () => refreshCatalog());

  target.querySelectorAll('.os-mode').forEach((button) => {
    listen(button, 'click', () => {
      activeMode = button.dataset.mode;
      target.querySelectorAll('.os-mode').forEach((modeButton) => modeButton.classList.toggle('active', modeButton === button));
      updatePreview();
    });
  });

  listen(target.querySelector('#reloadPreview'), 'click', () => updatePreview());
  listen(target.querySelector('#openOverlay'), 'click', () => window.open(getUrl(selected, { preview: false }), '_blank', 'noopener'));
  listen(target.querySelector('#openFeaturedOverlay'), 'click', () => window.open(getUrl(OVERLAYS.find((overlay) => overlay.featured) || selected, { preview: false }), '_blank', 'noopener'));
  listen(target.querySelector('#copyOverlay'), 'click', copyOverlayUrl);

  refreshCatalog();
}

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
    const user = JSON.parse(raw);
    return user.id || user.userId || '';
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
