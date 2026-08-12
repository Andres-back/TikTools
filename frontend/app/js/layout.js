import { navigate } from './router.js';

const tools = [
  { path:'/app/dashboard', label:'Centro LIVE', section:'Empezar', icon:'fa-tower-broadcast', hint:'Conectar TikTok y monitorear la transmisión' },
  { path:'/app/chat', label:'Chat en vivo', section:'Empezar', icon:'fa-comments', hint:'Leer la conversación del LIVE' },
  { path:'/app/overlays', label:'Overlays', section:'Diseño', icon:'fa-layer-group', hint:'Elementos visuales para OBS' },
  { path:'/app/sounds', label:'Alertas de sonido', section:'Diseño', icon:'fa-volume-high', hint:'Sonidos activados por regalos' },
  { path:'/app/goals', label:'Metas', section:'Diseño', icon:'fa-bullseye', hint:'Objetivos visibles para la audiencia' },
  { path:'/app/minecraft', label:'Minecraft', section:'Juegos', icon:'fa-cube', hint:'Presets interactivos por RCON' },
  { path:'/app/game', label:'Juego de regalos', section:'Juegos', icon:'fa-gamepad', hint:'Juego nativo para el LIVE' },
  { path:'/app/hype-arena', label:'Hype Arena', section:'Juegos', icon:'fa-fire-flame-curved', hint:'Arena interactiva para espectadores' },
  { path:'/app/actions', label:'Reglas y eventos', section:'Automatizar', icon:'fa-bolt', hint:'Decidir qué activa cada interacción' },
  { path:'/app/integrations', label:'Conexiones', section:'Automatizar', icon:'fa-plug-circle-bolt', hint:'RCON, HTTP y servicios externos' },
  { path:'/app/chatbot', label:'Chatbot', section:'Automatizar', icon:'fa-robot', hint:'Respuestas y comandos automáticos' },
  { path:'/app/auctions', label:'Subastas', section:'Herramientas', icon:'fa-gavel', hint:'Subastas durante el LIVE' },
  { path:'/app/roulette', label:'Ruleta', section:'Herramientas', icon:'fa-dharmachakra', hint:'Sorteos y decisiones en vivo' },
  { path:'/app/timers', label:'Temporizadores', section:'Herramientas', icon:'fa-clock', hint:'Contadores para el stream' },
  { path:'/app/songrequests', label:'Canciones', section:'Herramientas', icon:'fa-music', hint:'Peticiones musicales del chat' },
  { path:'/app/analytics', label:'Estadísticas', section:'Herramientas', icon:'fa-chart-simple', hint:'Resultados de tus transmisiones' },
  { path:'/app/settings', label:'Configuración', section:'Cuenta', icon:'fa-sliders', hint:'Preferencias generales' },
  { path:'/app/profile', label:'Perfil', section:'Cuenta', icon:'fa-user', hint:'Datos de tu cuenta' }
];

export async function initLayout() {
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggle = document.getElementById('sidebarToggle');
  const palette = document.getElementById('commandPalette');
  const search = document.getElementById('commandSearch');

  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    toggle?.setAttribute('aria-expanded','false');
    document.body.classList.remove('nav-open');
  };
  const toggleSidebar = () => {
    const open = !sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open',open);
    overlay?.classList.toggle('active',open);
    toggle?.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('nav-open',open);
  };
  toggle?.addEventListener('click',toggleSidebar);
  overlay?.addEventListener('click',closeSidebar);

  document.addEventListener('click',(event) => {
    const link = event.target.closest('[data-router-link],.nav-item[data-route]');
    if (!link || event.ctrlKey || event.metaKey || event.button === 1) return;
    const path = link.getAttribute('href');
    if (!path?.startsWith('/app')) return;
    event.preventDefault();
    navigate(path);
    closeSidebar();
    closeCommand();
  });

  const auth = await import('/app/js/core/auth.js');
  const user = auth.getCurrentUser();
  const displayName = user?.displayName || user?.username || user?.email || 'Usuario';
  const nameElement = document.getElementById('userNameDisplay');
  const initialElement = document.getElementById('userInitial');
  if (nameElement) nameElement.textContent = displayName;
  if (initialElement) initialElement.textContent = displayName.charAt(0).toUpperCase();
  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.hidden = !auth.isAdmin();
  document.getElementById('userMenuBtn')?.addEventListener('click',() => navigate('/app/profile'));
  document.getElementById('logoutLink')?.addEventListener('click',() => auth.logout());

  function renderCommands(query = '') {
    const normalized = query.trim().toLowerCase();
    const matches = tools.filter((item) => `${item.label} ${item.section} ${item.hint}`.toLowerCase().includes(normalized));
    const results = document.getElementById('commandResults');
    results.innerHTML = matches.length ? matches.map((item) => `
      <button class="command-result" data-command-path="${item.path}">
        <i class="fa-solid ${item.icon}"></i><span><strong>${item.label}</strong><small>${item.section} · ${item.hint}</small></span><i class="fa-solid fa-arrow-right"></i>
      </button>`).join('') : '<div class="empty-state"><p>No encontré esa herramienta.</p></div>';
  }
  function openCommand() {
    palette.hidden = false;
    renderCommands('');
    search.value = '';
    requestAnimationFrame(() => search.focus());
  }
  function closeCommand() { if (palette) palette.hidden = true; }
  document.getElementById('commandButton')?.addEventListener('click',openCommand);
  palette?.addEventListener('click',(event) => {
    if (event.target.closest('[data-close-command]')) return closeCommand();
    const result = event.target.closest('[data-command-path]');
    if (result) { navigate(result.dataset.commandPath); closeCommand(); }
  });
  search?.addEventListener('input',() => renderCommands(search.value));
  document.addEventListener('keydown',(event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); palette.hidden ? openCommand() : closeCommand(); }
    if (event.key === 'Escape') { closeCommand(); closeSidebar(); }
  });
  window.addEventListener('resize',() => { if (window.innerWidth > 1100) closeSidebar(); });
}

export function updateWsIndicator(state) {
  const header = document.getElementById('headerLiveState');
  const sidebar = document.getElementById('globalLiveIndicator');
  const sidebarText = document.getElementById('globalLiveUser');
  if (!header) return;
  const username = localStorage.getItem('tiktok_user') || 'LIVE';
  const connected = state === 'connected';
  const connecting = state === 'connecting' || state === 'reconnecting';
  header.className = `header-live-state ${connected ? 'connected' : connecting ? 'connecting' : ''}`;
  header.innerHTML = `<span class="status-dot ${connected ? 'connected' : connecting ? 'connecting' : ''}"></span><span>${connected ? `@${username}` : connecting ? 'Conectando…' : 'Sin conectar'}</span>`;
  if (sidebar) sidebar.hidden = !connected;
  if (sidebarText && connected) sidebarText.textContent = `@${username} conectado`;
}

export function updatePageContext(route, pathname) {
  const title = document.getElementById('pageTitleDisplay');
  const section = document.getElementById('pageSectionDisplay');
  const exact = tools.find((item) => item.path === pathname);
  if (title) title.textContent = exact?.label || String(route?.title || 'TikToolStream').split('|')[0].trim();
  if (section) section.textContent = exact?.section || (pathname.startsWith('/app/admin') ? 'Administración' : 'TikToolStream');
  const more = document.getElementById('navMore');
  if (more && exact?.section === 'Herramientas') more.open = true;
}
