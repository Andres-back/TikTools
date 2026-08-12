import { countUp, formatNum } from '/app/js/core/visual-helpers.js';
import { getAccessToken } from '/app/js/core/auth.js';
import * as wsService from '/app/js/core/ws.js';

export async function mount({ target, api, user, toast, signal }) {
  let supporters = [];
  let events = [];
  const giftImages = {};
  const $ = (selector) => target.querySelector(selector);

  target.innerHTML = `
    <div class="studio-page">
      <section class="studio-hero">
        <div class="studio-welcome">
          <p class="studio-eyebrow">Tu centro de control</p>
          <h1>Prepara el LIVE, conecta TikTok y deja que la audiencia juegue.</h1>
          <p>Todo empieza aquí. Conecta tu cuenta y supervisa regalos, chat y automatizaciones desde una sola pantalla.</p>
        </div>
        <section class="studio-connect" aria-labelledby="connectTitle">
          <div class="studio-connect-head">
            <div><h2 id="connectTitle">Conectar TikTok LIVE</h2><p>Escribe el usuario que está transmitiendo</p></div>
            <span class="studio-status" id="connectionStatus"><span class="status-dot"></span><span>Desconectado</span></span>
          </div>
          <div class="studio-connect-form">
            <label class="studio-input-wrap"><span class="sr-only">Usuario de TikTok</span><i class="fa-solid fa-at"></i><input id="tiktokUser" placeholder="usuario_sin_arroba" autocomplete="off"></label>
            <button class="btn btn-primary" id="btnConnect"><i class="fa-solid fa-link"></i><span>Conectar LIVE</span></button>
          </div>
        </section>
      </section>

      <section class="studio-stats" aria-label="Resumen del LIVE">
        <article class="studio-stat"><span class="studio-stat-icon"><i class="fa-solid fa-coins"></i></span><div><strong id="statCoins">0</strong><small>Monedas</small></div></article>
        <article class="studio-stat"><span class="studio-stat-icon"><i class="fa-solid fa-gift"></i></span><div><strong id="statGifts">0</strong><small>Regalos</small></div></article>
        <article class="studio-stat"><span class="studio-stat-icon"><i class="fa-solid fa-users"></i></span><div><strong id="statDonors">0</strong><small>Donantes</small></div></article>
        <article class="studio-stat"><span class="studio-stat-icon"><i class="fa-regular fa-gem"></i></span><div><strong id="statPlan">—</strong><small>Plan actual</small></div></article>
      </section>

      <div class="studio-layout">
        <section class="studio-panel">
          <div class="studio-panel-head"><h2><i class="fa-regular fa-comments"></i> Actividad en tiempo real</h2><small>Últimos eventos</small></div>
          <div class="studio-feed" id="liveFeed"><div class="studio-empty"><div><i class="fa-solid fa-satellite-dish"></i><p>Conecta un LIVE para ver aquí mensajes, regalos y seguidores.</p></div></div></div>
        </section>
        <section class="studio-panel">
          <div class="studio-panel-head"><h2><i class="fa-solid fa-ranking-star"></i> Mayores donantes</h2><small>Esta sesión</small></div>
          <div class="studio-ranking" id="supporterList"><div class="studio-empty"><div><i class="fa-regular fa-star"></i><p>El ranking aparecerá cuando lleguen regalos.</p></div></div></div>
        </section>
      </div>

      <section class="studio-next">
        <h2 class="studio-next-title">Configura tu experiencia</h2>
        <div class="studio-steps">
          <a class="studio-step" href="/app/overlays" data-router-link><span class="studio-step-icon"><i class="fa-solid fa-layer-group"></i></span><span><strong>1. Diseña la pantalla</strong><small>Elige y copia overlays para OBS</small></span><i class="fa-solid fa-chevron-right"></i></a>
          <a class="studio-step" href="/app/actions" data-router-link><span class="studio-step-icon"><i class="fa-solid fa-bolt"></i></span><span><strong>2. Define reacciones</strong><small>Regalos, sonidos y acciones automáticas</small></span><i class="fa-solid fa-chevron-right"></i></a>
          <a class="studio-step" href="/app/minecraft" data-router-link><span class="studio-step-icon"><i class="fa-solid fa-cube"></i></span><span><strong>3. Activa un juego</strong><small>Equipa un preset interactivo de Minecraft</small></span><i class="fa-solid fa-chevron-right"></i></a>
        </div>
      </section>
    </div>`;

  const connectButton = $('#btnConnect');
  const userInput = $('#tiktokUser');
  const savedUser = localStorage.getItem('tiktok_user') || '';
  userInput.value = savedUser.replace(/^@/, '');

  function setConnection(state, text) {
    const badge = $('#connectionStatus');
    badge.className = `studio-status ${state || ''}`;
    badge.innerHTML = `<span class="status-dot ${state || ''}"></span><span>${text}</span>`;
    const connected = state === 'connected';
    connectButton.className = `btn ${connected ? 'btn-danger' : 'btn-primary'}`;
    connectButton.disabled = state === 'connecting';
    connectButton.innerHTML = connected
      ? '<i class="fa-solid fa-link-slash"></i><span>Desconectar</span>'
      : state === 'connecting'
        ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Conectando…</span>'
        : '<i class="fa-solid fa-link"></i><span>Conectar LIVE</span>';
  }

  connectButton.addEventListener('click', () => {
    const state = wsService.getState();
    if (state === wsService.WS_STATE.CONNECTED || state === wsService.WS_STATE.CONNECTING) return wsService.disconnect();
    const uniqueId = userInput.value.trim().replace(/^@/, '');
    if (!uniqueId) {
      userInput.focus();
      toast?.showToast?.({ type:'warning', message:'Escribe el usuario de TikTok que está transmitiendo' });
      return;
    }
    const accessToken = getAccessToken();
    if (!accessToken) return toast?.showToast?.({ type:'error', message:'Tu sesión expiró. Inicia sesión nuevamente.' });
    localStorage.setItem('tiktok_user', uniqueId);
    setConnection('connecting', 'Conectando…');
    wsService.connect({ uniqueId, channelId:user?.id, accessToken });
  }, { signal });

  function addEvent(type, data = {}) {
    const userName = data.nickname || data.uniqueId || 'Espectador';
    let text = data.comment || data.message || '';
    let value = 0;
    if (type === 'gift') {
      value = Number(data.diamondCount || 0) * Number(data.repeatCount || 1);
      text = `envió ${data.giftName || 'un regalo'}`;
      const id = data.uniqueId || userName;
      const existing = supporters.find((entry) => entry.id === id);
      if (existing) { existing.coins += value; existing.gifts += 1; }
      else supporters.push({ id, name:userName, coins:value, gifts:1 });
      renderStats();
      renderSupporters();
    } else if (type === 'follow') text = 'empezó a seguirte';
    else if (type === 'share') text = 'compartió el LIVE';
    else if (type === 'like') text = `envió ${data.likeCount || 1} like${Number(data.likeCount || 1) === 1 ? '' : 's'}`;
    events.unshift({ type, user:userName, text, value, at:Date.now() });
    events = events.slice(0, 60);
    renderFeed();
  }

  function renderFeed() {
    const feed = $('#liveFeed');
    if (!events.length) return;
    feed.innerHTML = events.map((entry) => `
      <article class="studio-event ${entry.type === 'gift' ? 'gift' : ''}">
        <span class="studio-event-icon"><i class="fa-solid ${entry.type === 'gift' ? 'fa-gift' : entry.type === 'follow' ? 'fa-user-plus' : entry.type === 'share' ? 'fa-share-nodes' : entry.type === 'like' ? 'fa-heart' : 'fa-comment'}"></i></span>
        <div><strong>@${escapeHtml(entry.user)}</strong><p>${escapeHtml(entry.text)}</p></div>
        ${entry.value ? `<span class="studio-event-value">+${formatNum(entry.value)}</span>` : ''}
      </article>`).join('');
  }

  function renderSupporters() {
    const list = $('#supporterList');
    const sorted = [...supporters].sort((a,b) => b.coins - a.coins).slice(0,20);
    if (!sorted.length) return;
    list.innerHTML = sorted.map((entry,index) => `<article class="studio-rank"><span class="studio-rank-index">${index + 1}</span><strong>@${escapeHtml(entry.name)}</strong><span>${formatNum(entry.coins)} coins</span></article>`).join('');
  }

  function renderStats() {
    const coins = supporters.reduce((sum,item) => sum + item.coins,0);
    const gifts = supporters.reduce((sum,item) => sum + item.gifts,0);
    animateValue($('#statCoins'), coins);
    animateValue($('#statGifts'), gifts);
    animateValue($('#statDonors'), supporters.length);
  }

  function animateValue(element, value) {
    const from = Number(element.dataset.value || 0);
    element.dataset.value = String(value);
    countUp(element, from, value, 650);
  }

  const unsubscribers = [
    wsService.subscribe('gift', ({ data }) => addEvent('gift', data)),
    wsService.subscribe('chat', ({ data }) => addEvent('chat', data)),
    wsService.subscribe('comment', ({ data }) => addEvent('chat', data)),
    wsService.subscribe('follow', ({ data }) => addEvent('follow', data)),
    wsService.subscribe('share', ({ data }) => addEvent('share', data)),
    wsService.subscribe('like', ({ data }) => addEvent('like', data)),
    wsService.subscribeState((state) => {
      if (state === wsService.WS_STATE.CONNECTED) setConnection('connected', `@${localStorage.getItem('tiktok_user') || 'LIVE'}`);
      else if (state === wsService.WS_STATE.CONNECTING || state === wsService.WS_STATE.RECONNECTING) setConnection('connecting','Conectando…');
      else setConnection('', state === wsService.WS_STATE.ERROR ? 'Error de conexión' : 'Desconectado');
    })
  ];

  if (wsService.getState() === wsService.WS_STATE.CONNECTED) setConnection('connected', `@${savedUser}`);

  try {
    const plan = await api.get('/payments/plan-status', { signal });
    $('#statPlan').textContent = plan?.isActive ? (plan.planType || 'Pro') : 'Free';
  } catch { $('#statPlan').textContent = 'Free'; }

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}
