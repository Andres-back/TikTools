/**
 * Dashboard View - TikToolStream
 * Premium live auction control: TikTok, timer, leaderboard, manual coins, live chat
 */

import { countUp, formatNum, magneticButton } from '/app/js/core/visual-helpers.js';
import { getAccessToken } from '/app/js/core/auth.js';

export async function mount({ target, api, user, toast, signal }) {
  let ws = null;
  let timerInterval = null;
  let timerState = { remaining: 0, phase: 'idle', total: 0 };
  let leaderboard = [];
  let liveChat = [];
  let userId = user?.id;
  let planInfo = null;

  const TIKTOK_GIFTS = {}; // cacheado
  const GIFT_IMAGES = {}; // cacheado
  const AVATARS = {}; // cache para fallback

  // ============ RENDER ============
  target.innerHTML = `
    <style>
      .dash-grid { display:grid; grid-template-columns: 300px 1fr 340px; gap:var(--space-lg); }
      .dash-card { background:linear-gradient(160deg, rgba(20,25,45,0.95), rgba(15,20,40,0.95)); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:var(--space-lg); box-shadow:0 10px 40px rgba(0,0,0,0.3); position:relative; overflow:hidden; }
      .dash-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg, transparent, rgba(0,217,255,0.4), transparent); }
      .dash-card-title { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px; font-weight:600; margin-bottom:var(--space-md); display:flex; align-items:center; gap:8px; }
      .stat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-sm); margin-top:var(--space-md); }
      .stat-card { background:linear-gradient(135deg, rgba(0,217,255,0.08), rgba(123,47,247,0.05)); border:1px solid rgba(0,217,255,0.15); border-radius:14px; padding:var(--space-md); text-align:center; position:relative; overflow:hidden; transition:all 0.3s; }
      .stat-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,217,255,0.2); }
      .stat-card .stat-icon { font-size:1.5rem; margin-bottom:4px; }
      .stat-card .stat-num { font-size:1.6rem; font-weight:800; background:linear-gradient(135deg, #00d9ff, #7b2ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-family:var(--font-display); }
      .stat-card .stat-label { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
      .timer-display { font-family:var(--font-display); font-size:clamp(2.5rem, 8vw, 5rem); font-weight:800; text-align:center; background:linear-gradient(135deg, #ffffff 0%, #00d9ff 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1; letter-spacing:-2px; text-shadow:0 0 40px rgba(0,217,255,0.3); }
      .timer-display.warn { background:linear-gradient(135deg, #ffffff, #ffd700); -webkit-background-clip:text; background-clip:text; }
      .timer-display.danger { background:linear-gradient(135deg, #ff1744, #ff6b6b); -webkit-background-clip:text; background-clip:text; animation:pulseDanger 0.5s ease-in-out infinite; }
      @keyframes pulseDanger { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:0.85; transform:scale(1.02);} }
      .timer-phase { text-align:center; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:3px; color:var(--text-muted); margin-top:8px; font-weight:600; }
      .timer-phase.live { color:var(--color-success); }
      .timer-phase.warn { color:var(--color-warning); }
      .timer-phase.danger { color:var(--color-danger); animation:pulseDanger 0.5s ease-in-out infinite; }
      .timer-phase.done { color:var(--color-warning); }
      .timer-bar-wrap { height:8px; background:rgba(255,255,255,0.06); border-radius:6px; overflow:hidden; margin-top:var(--space-md); }
      .timer-bar { height:100%; background:linear-gradient(90deg, #00d9ff, #7b2ff7); border-radius:6px; transition:width 0.4s linear; box-shadow:0 0 12px rgba(0,217,255,0.5); }
      .timer-bar.warn { background:linear-gradient(90deg, #ffd700, #ff6b00); }
      .timer-bar.danger { background:linear-gradient(90deg, #ff1744, #ff6b6b); }
      .timer-winner { text-align:center; margin-top:var(--space-md); padding:var(--space-md); background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.05)); border:2px solid #ffd700; border-radius:14px; font-weight:700; color:#ffd700; animation:winnerGlow 2s ease-in-out infinite; display:none; }
      @keyframes winnerGlow { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.3);} 50%{box-shadow:0 0 40px rgba(255,215,0,0.6);} }
      .lb-list { max-height:60vh; overflow-y:auto; padding-right:4px; }
      .lb-list::-webkit-scrollbar { width:5px; }
      .lb-list::-webkit-scrollbar-thumb { background:rgba(0,217,255,0.3); border-radius:3px; }
      .lb-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:10px; margin-bottom:4px; transition:all 0.2s; border:1px solid transparent; }
      .lb-row:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); }
      .lb-row.gold { background:linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,107,0,0.05)); border-color:rgba(255,215,0,0.3); }
      .lb-row.silver { background:linear-gradient(135deg, rgba(192,192,192,0.1), rgba(192,192,192,0.03)); border-color:rgba(192,192,192,0.25); }
      .lb-row.bronze { background:linear-gradient(135deg, rgba(205,127,50,0.1), rgba(205,127,50,0.03)); border-color:rgba(205,127,50,0.25); }
      .lb-rank { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; font-family:var(--font-display); background:rgba(255,255,255,0.06); color:var(--text-secondary); flex-shrink:0; }
      .lb-row.gold .lb-rank { background:linear-gradient(135deg, #ffd700, #ff6b00); color:#1a1a2e; }
      .lb-row.silver .lb-rank { background:linear-gradient(135deg, #c0c0c0, #808080); color:#1a1a2e; }
      .lb-row.bronze .lb-rank { background:linear-gradient(135deg, #cd7f32, #8b4513); color:#fff; }
      .lb-avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #00d9ff, #7b2ff7); display:flex; align-items:center; justify-content:center; font-weight:800; color:#fff; font-size:0.9rem; flex-shrink:0; overflow:hidden; border:2px solid rgba(255,255,255,0.15); }
      .lb-avatar img { width:100%; height:100%; object-fit:cover; }
      .lb-name { flex:1; min-width:0; font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .lb-coins { font-family:var(--font-display); font-weight:700; color:#ffd700; font-size:0.95rem; display:flex; align-items:center; gap:3px; }
      .lb-crown { position:absolute; top:-4px; right:-4px; font-size:0.8rem; }
      .connect-status { display:flex; align-items:center; gap:6px; font-size:var(--text-xs); margin-top:8px; justify-content:center; }
      .status-dot { width:8px; height:8px; border-radius:50%; background:var(--text-muted); }
      .status-dot.connecting { background:var(--color-warning); animation:blink 1s ease-in-out infinite; }
      .status-dot.connected { background:var(--color-success); box-shadow:0 0 8px var(--color-success); }
      @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      .chat-stream { height:60vh; overflow-y:auto; padding:var(--space-sm); display:flex; flex-direction:column; gap:6px; }
      .chat-stream::-webkit-scrollbar { width:4px; }
      .chat-stream::-webkit-scrollbar-thumb { background:rgba(0,217,255,0.3); border-radius:2px; }
      .chat-msg { padding:8px 10px; background:rgba(255,255,255,0.04); border-radius:10px; border-left:3px solid var(--color-primary); font-size:0.85rem; }
      .chat-msg.gift { border-color:#ffd700; background:linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,107,0,0.03)); }
      .chat-msg.follow { border-color:var(--color-success); }
      .chat-msg .chat-user { font-weight:700; color:var(--color-primary); font-size:0.8rem; }
      .chat-msg .chat-text { color:var(--text-secondary); margin-top:2px; word-break:break-word; }
      .chat-msg .chat-amount { color:#ffd700; font-weight:700; margin-left:4px; }
      .chat-msg { display:flex; align-items:flex-start; gap:8px; padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.04); border-left:3px solid var(--color-primary); font-size:0.85rem; margin-bottom:4px; animation: chatIn 0.3s var(--ease-smooth) backwards; }
      .chat-msg.gift { border-color:#ffd700; background:linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,107,0,0.03)); }
      .chat-msg.follow { border-color:var(--color-success); }
      .chat-msg .chat-gift-img { width:36px; height:36px; border-radius:6px; object-fit:contain; flex-shrink:0; background:rgba(0,0,0,0.3); }
      .chat-msg .chat-body { flex:1; min-width:0; }
      @keyframes chatIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .empty-chat { text-align:center; color:var(--text-muted); padding:var(--space-xl); font-size:0.85rem; }
      
      /* Responsive breakpoints */
      @media (max-width: 1280px) { 
        .dash-grid { grid-template-columns: 1fr 1fr; }
        .dash-grid > div:first-child { grid-column: 1 / -1; }
      }
      @media (max-width: 900px) { 
        .dash-grid { grid-template-columns: 1fr; }
        .dash-card { padding:var(--space-md); }
        .stat-grid { grid-template-columns: 1fr; }
        .chat-stream { height:40vh; }
        .lb-list { max-height:40vh; }
      }
      @media (max-width: 480px) {
        .dash-card { padding:var(--space-sm); }
        .stat-card { padding:var(--space-sm); }
        .stat-card .stat-num { font-size:1.3rem; }
      }

      /* Stagger animation for leaderboard rows */
      .lb-stagger { animation: lbSlideIn 0.5s var(--ease-smooth, cubic-bezier(0.16, 1, 0.3, 1)) backwards; }
      @keyframes lbSlideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .lb-coins { transition: transform 0.4s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)); display:inline-block; }
      .lb-coins.bump { animation: coinsBump 0.6s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)); }
      @keyframes coinsBump {
        0%   { transform: scale(1); }
        40%  { transform: scale(1.4); color: #ffd700; text-shadow: 0 0 20px rgba(255,215,0,0.6); }
        100% { transform: scale(1); }
      }
      .lb-row.gold .lb-coins { background: linear-gradient(135deg, #ffd700, #ff6b00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    </style>

    <div class="dash-grid">
      <!-- COL LEFT: ConexiÃ³n + Controles + Stats -->
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">
        <div class="dash-card">
          <div class="dash-card-title">ðŸ”Œ ConexiÃ³n TikTok</div>
          <div style="position:relative;margin-bottom:8px">
            <input type="text" id="tiktokUser" class="input-field" placeholder="@usuario" style="width:100%;padding:10px 14px 10px 36px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:10px;color:#fff;font-size:0.9rem">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)">@</span>
          </div>
          <button class="btn ${ws && ws.readyState === WebSocket.OPEN ? 'btn-danger' : 'btn-primary'}" id="btnConnect" style="width:100%;font-weight:600">
            ${ws && ws.readyState === WebSocket.OPEN ? 'Desconectar' : 'Conectar'}
          </button>
          <div id="connectionStatus" class="connect-status"><span class="status-dot"></span><span>Desconectado</span></div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">ðŸŽ¬ Controles</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <button class="btn btn-primary" id="btnStart" style="font-size:0.85rem;padding:10px;font-weight:600">â–¶ Iniciar</button>
            <button class="btn btn-secondary" id="btnReset" style="font-size:0.85rem;padding:10px;font-weight:600">â†º Reset</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
            <input type="number" id="timerMinutes" class="input-field" placeholder="Min" min="1" value="2" style="padding:8px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:#fff;font-size:0.85rem">
            <input type="number" id="timerDelay" class="input-field" placeholder="Delay (s)" min="0" value="20" style="padding:8px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:#fff;font-size:0.85rem">
          </div>
        </div>

        <div class="dash-card">
          <div class="dash-card-title">ðŸ’Ž Suma Manual</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">
            <input type="text" id="manualUser" class="input-field" placeholder="@usuario" style="padding:8px 12px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:#fff;font-size:0.85rem">
            <input type="number" id="manualCoins" class="input-field" placeholder="Monedas" min="1" style="padding:8px 12px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:#fff;font-size:0.85rem">
          </div>
          <button class="btn btn-success" id="btnManual" style="width:100%;font-size:0.85rem;font-weight:600">+ Agregar Monedas</button>
        </div>

        <div class="stat-grid">
          <div class="stat-card"><div class="stat-icon">💳</div><div class="stat-num" id="statCoins">0</div><div class="stat-label">Monedas</div></div>
          <div class="stat-card"><div class="stat-icon">🎁</div><div class="stat-num" id="statGifts">0</div><div class="stat-label">Regalos</div></div>
          <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-num" id="statDonors">0</div><div class="stat-label">Donantes</div></div>
          <div class="stat-card"><div class="stat-icon">💎</div><div class="stat-num" id="statPlan">-</div><div class="stat-label">Plan</div></div>
        </div>
      </div>

      <!-- COL CENTER: Timer + Chat Live -->
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">
        <div class="dash-card" style="text-align:center;padding:var(--space-xl)">
          <div class="dash-card-title" style="justify-content:center">â± Timer de Subasta</div>
          <div id="timerDisplay" class="timer-display">02:00</div>
          <div id="timerPhase" class="timer-phase">INACTIVO</div>
          <div class="timer-bar-wrap"><div id="timerBar" class="timer-bar" style="width:0%"></div></div>
          <div id="winnerDisplay" class="timer-winner"><span id="winnerName"></span></div>
        </div>

        <div class="dash-card" style="flex:1;display:flex;flex-direction:column">
          <div class="dash-card-title">ðŸ’¬ Chat del Live</div>
          <div id="liveChatStream" class="chat-stream">
            <div class="empty-chat">Conecta TikTok para ver el chat en vivo</div>
          </div>
        </div>
      </div>

      <!-- COL RIGHT: Leaderboard -->
      <div>
        <div class="dash-card">
          <div class="dash-card-title">Top Donadores</div>
          <div id="leaderboardList" class="lb-list">
            <div class="empty-chat">Esperando donaciones...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  normalizeDashboardLabels();

  function normalizeDashboardLabels() {
    const titles = ['Conexion TikTok', 'Controles', 'Suma Manual', 'Timer de Subasta', 'Chat del Live', 'Top Donadores'];
    document.querySelectorAll('.dash-card-title').forEach((el, index) => {
      if (titles[index]) el.textContent = titles[index];
    });

    const stats = [
      ['$', 'Monedas'],
      ['G', 'Regalos'],
      ['U', 'Donantes'],
      ['P', 'Plan']
    ];
    document.querySelectorAll('.stat-card').forEach((card, index) => {
      const icon = card.querySelector('.stat-icon');
      const label = card.querySelector('.stat-label');
      if (stats[index]) {
        if (icon) icon.textContent = stats[index][0];
        if (label) label.textContent = stats[index][1];
      }
    });

    const startButton = document.getElementById('btnStart');
    const resetButton = document.getElementById('btnReset');
    const manualButton = document.getElementById('btnManual');
    if (startButton) startButton.textContent = 'Iniciar';
    if (resetButton) resetButton.textContent = 'Reset';
    if (manualButton) manualButton.textContent = 'Agregar monedas';
  }
  // ============ TIKTOK CONNECTION ============
  const connectBtn = document.getElementById('btnConnect');
  const statusEl = document.getElementById('connectionStatus');
  const tiktokUserInput = document.getElementById('tiktokUser');

  function setStatus(text, kind) {
    statusEl.innerHTML = `<span class="status-dot ${kind || ''}"></span><span>${text}</span>`;
  }

  function tryLoadSession() {
    const saved = localStorage.getItem('tiktok_sessionid');
    if (saved) tiktokUserInput.placeholder = '@usuario (Session ID guardado)';
  }
  tryLoadSession();

  function connectWS() {
    const username = tiktokUserInput.value.trim();
    if (!username) { setStatus('Ingresa un usuario', ''); return; }
    const accessToken = getAccessToken();
    if (!accessToken) {
      setStatus('Sesion expirada. Inicia sesion de nuevo.', '');
      return;
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      ws = new WebSocket(`${protocol}//${location.host}/live`);
    } catch (e) { setStatus('Error al conectar', ''); return; }

    setStatus('Conectando...', 'connecting');
    connectBtn.textContent = 'Conectando...';
    connectBtn.disabled = true;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'connect', uniqueId: username, channelId: userId, accessToken }));
      connectBtn.textContent = 'Desconectar';
      connectBtn.classList.remove('btn-primary'); connectBtn.classList.add('btn-danger');
      connectBtn.disabled = false;
      setStatus(`Conectado a @${username}`, 'connected');
      toast?.showToast?.({ type: 'success', message: `Conectado a @${username}` });
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleTikTokEvent(msg);
      } catch {}
    };

    ws.onclose = () => {
      connectBtn.textContent = 'Conectar';
      connectBtn.classList.add('btn-primary'); connectBtn.classList.remove('btn-danger');
      connectBtn.disabled = false;
      if (statusEl.textContent.includes('Conectado')) {
        setStatus('Desconectado', '');
      }
      ws = null;
    };

    ws.onerror = () => { setStatus('Error de conexiÃ³n', ''); };
  }

  function disconnectWS() {
    if (ws) { ws.close(); }
  }

  connectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) disconnectWS();
    else connectWS();
  }, { signal });

  function handleTikTokEvent(msg) {
    const data = msg.data || {};
    const type = msg.type;
    if (type === 'gift' && data) {
      const dc = data.diamondCount || 0;
      const rc = data.repeatCount || 1;
      const coins = dc * rc;
      const uid = data.uniqueId || 'anon';
      const nick = data.nickname || uid;
      const giftName = data.giftName || 'Regalo';
      const giftId = data.giftId;

      // Leaderboard
      const existing = leaderboard.find(d => d.uid === uid);
      if (existing) { existing.coins += coins; existing.gifts += 1; }
      else leaderboard.push({ uid, nick, coins, gifts: 1, avatar: data.profilePictureUrl });

      renderLeaderboard();
      updateStats();

      // Chat
      const giftImg = GIFT_IMAGES[giftId] || '';
      pushChat({
        type: 'gift',
        user: nick,
        text: `enviÃ³ ${giftName}`,
        amount: coins,
        giftId,
        avatar: data.profilePictureUrl
      });
    } else if (type === 'follow') {
      pushChat({ type: 'follow', user: data.nickname || data.uniqueId, text: 'empezÃ³ a seguirte ðŸ’š' });
    } else if (type === 'share') {
      pushChat({ type: 'follow', user: data.nickname || data.uniqueId, text: 'compartiÃ³ el live ðŸ”„' });
    } else if (type === 'like') {
      pushChat({ type: '', user: data.nickname || data.uniqueId, text: `le dio like â¤ï¸ (${data.likeCount || 1})` });
    } else if (type === 'chat' || type === 'comment') {
      pushChat({ type: '', user: data.nickname || data.uniqueId, text: data.comment || data.message || '' });
    } else if (type === 'connected') {
      setStatus(`Conectado a @${data.uniqueId || ''}`, 'connected');
    } else if (type === 'disconnected' || type === 'streamEnd') {
      setStatus('Live desconectado', '');
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    }
  }

  // ============ TIMER ============
  const timerDisplay = document.getElementById('timerDisplay');
  const timerPhase = document.getElementById('timerPhase');
  const timerBar = document.getElementById('timerBar');
  const winnerDisplay = document.getElementById('winnerDisplay');
  const winnerName = document.getElementById('winnerName');
  const timerMinutes = document.getElementById('timerMinutes');
  const timerDelay = document.getElementById('timerDelay');

  function fmt(s) {
    s = Math.max(0, parseInt(s) || 0);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function applyTimerClass(state) {
    timerDisplay.classList.remove('warn', 'danger');
    timerBar.classList.remove('warn', 'danger');
    timerPhase.classList.remove('live', 'warn', 'danger', 'done');
    if (state === 'warn') { timerDisplay.classList.add('warn'); timerBar.classList.add('warn'); timerPhase.classList.add('warn'); }
    else if (state === 'danger') { timerDisplay.classList.add('danger'); timerBar.classList.add('danger'); timerPhase.classList.add('danger'); }
    else if (state === 'live') timerPhase.classList.add('live');
    else if (state === 'done') timerPhase.classList.add('done');
  }

  function startTimer() {
    const minutes = Math.max(1, parseInt(timerMinutes.value) || 2);
    const total = minutes * 60;
    timerState = { remaining: total, phase: 'running', total };
    timerPhase.textContent = 'â–¶ EN VIVO';
    applyTimerClass('live');
    connectBtn.textContent = 'â¸ Pausar';
    winnerDisplay.style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
    broadcast('timer_update', { remaining: timerState.remaining, phase: 'running', total });
  }

  function pauseTimer() {
    if (timerState.phase === 'running') {
      clearInterval(timerInterval);
      timerState.phase = 'paused';
      timerPhase.textContent = 'â¸ PAUSADO';
      applyTimerClass('');
      connectBtn.textContent = 'â–¶ Reanudar';
    } else if (timerState.phase === 'paused') {
      timerState.phase = 'running';
      timerPhase.textContent = 'â–¶ EN VIVO';
      applyTimerClass('live');
      connectBtn.textContent = 'â¸ Pausar';
      timerInterval = setInterval(tick, 1000);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerState = { remaining: 0, phase: 'idle', total: 0 };
    timerDisplay.textContent = fmt(timerMinutes.value * 60);
    timerPhase.textContent = 'INACTIVO';
    timerBar.style.width = '0%';
    applyTimerClass('');
    connectBtn.textContent = 'â–¶ Iniciar';
    winnerDisplay.style.display = 'none';
    broadcast('timer_reset', {});
  }

  function tick() {
    timerState.remaining = Math.max(0, timerState.remaining - 1);
    timerDisplay.textContent = fmt(timerState.remaining);
    const pct = timerState.total > 0 ? (timerState.remaining / timerState.total) * 100 : 0;
    timerBar.style.width = `${pct}%`;

    if (timerState.remaining <= 10) applyTimerClass('danger');
    else if (timerState.remaining <= 30) applyTimerClass('warn');
    else applyTimerClass('live');

    broadcast('timer_update', { remaining: timerState.remaining, phase: 'running', total: timerState.total });

    if (timerState.remaining <= 0) {
      clearInterval(timerInterval);
      timerState.phase = 'finished';
      timerPhase.textContent = 'ðŸ FINALIZADO';
      applyTimerClass('done');
      connectBtn.textContent = 'â–¶ Iniciar';
      if (leaderboard.length > 0) {
        const w = [...leaderboard].sort((a, b) => b.coins - a.coins)[0];
        winnerName.textContent = `@${w.nick || w.uid} - ${w.coins.toLocaleString()} ðŸ’Ž`;
        winnerDisplay.style.display = 'block';
        broadcast('winner', { winner: w.nick || w.uid, coins: w.coins });
      }
    }
  }

  document.getElementById('btnStart')?.addEventListener('click', () => {
    if (timerState.phase === 'idle' || timerState.phase === 'finished') startTimer();
    else pauseTimer();
  }, { signal });

  document.getElementById('btnReset')?.addEventListener('click', resetTimer, { signal });

  // ============ MANUAL COINS ============
  document.getElementById('btnManual')?.addEventListener('click', () => {
    const user = document.getElementById('manualUser').value.trim();
    const coins = parseInt(document.getElementById('manualCoins').value);
    if (!user) { toast?.showToast?.({ type: 'warning', message: 'Usuario requerido' }); return; }
    if (!coins || coins < 1) { toast?.showToast?.({ type: 'warning', message: 'Monedas invÃ¡lidas' }); return; }

    const existing = leaderboard.find(d => d.uid === user);
    if (existing) existing.coins += coins;
    else leaderboard.push({ uid: user, nick: user, coins, gifts: 0, avatar: null });

    renderLeaderboard();
    updateStats();
    document.getElementById('manualCoins').value = '';
    document.getElementById('manualUser').value = '';
    toast?.showToast?.({ type: 'success', message: `+${coins} ðŸ’Ž para @${user}` });
    pushChat({ type: 'gift', user, text: 'suma manual', amount: coins });
  }, { signal });

  // ============ LEADERBOARD ============
  const lastLeaderboardSnapshot = [];
  function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    const sorted = [...leaderboard].sort((a, b) => b.coins - a.coins);
    if (sorted.length === 0) {
      list.innerHTML = '<div class="empty-chat">Esperando donaciones...</div>';
      return;
    }
    const rankClass = ['gold', 'silver', 'bronze'];
    const previousCoins = new Map(lastLeaderboardSnapshot.map(d => [d.uid, d.coins]));
    list.innerHTML = sorted.slice(0, 50).map((d, i) => {
      const initial = (d.nick || d.uid || '?').charAt(0).toUpperCase();
      const rc = rankClass[i] || '';
      const avatar = d.avatar
        ? `<img src="${escapeAttr(d.avatar)}" onerror="this.style.display='none';this.parentNode.textContent='${initial}'">`
        : initial;
      const fromCoins = previousCoins.get(d.uid) || 0;
      return `<div class="lb-row ${rc} lb-stagger" data-coins="${d.coins}" data-from="${fromCoins}" style="position:relative">
        ${i === 0 ? '<span class="lb-crown">ðŸ‘‘</span>' : ''}
        <div class="lb-rank">${i + 1}</div>
        <div class="lb-avatar">${avatar}</div>
        <div class="lb-name">@${escapeHtml(d.nick || d.uid)}</div>
        <div class="lb-coins" data-count>ðŸ’Ž ${formatNum(d.coins)}</div>
      </div>`;
    }).join('');

    /* stagger cascade animation */
    staggerChildren(list, 'lb-stagger', 50);

    /* countUp only the first row + bump animation if changed */
    const firstRow = list.querySelector('.lb-row');
    if (firstRow) {
      const target = parseInt(firstRow.dataset.coins, 10) || 0;
      const from = parseInt(firstRow.dataset.from, 10) || 0;
      const coinEl = firstRow.querySelector('[data-count]');
      if (coinEl && target !== from) {
        if (from > 0) {
          const startText = `ðŸ’Ž ${formatNum(from)}`;
          const endText = `ðŸ’Ž ${formatNum(target)}`;
          coinEl.textContent = startText;
          countUpAnimate(coinEl, startText, endText, 1000);
        }
        /* trigger bump on coin change */
        setTimeout(() => {
          coinEl.classList.remove('bump');
          void coinEl.offsetWidth; /* reflow */
          coinEl.classList.add('bump');
        }, from > 0 ? 100 : 0);
      }
    }

    /* save snapshot */
    lastLeaderboardSnapshot.length = 0;
    sorted.slice(0, 50).forEach(d => lastLeaderboardSnapshot.push({ ...d }));

    broadcast('leaderboard_update', { donors: sorted.slice(0, 10) });
  }

  function countUpAnimate(el, startText, endText, duration) {
    const startVal = parseInt(startText.replace(/[^\d]/g, ''), 10) || 0;
    const endVal = parseInt(endText.replace(/[^\d]/g, ''), 10) || 0;
    const prefix = endText.replace(/[\d,]/g, '').trim();
    const start = performance.now();
    function frame(now) {
      const k = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      const v = Math.round(startVal + (endVal - startVal) * ease);
      el.textContent = `${prefix} ${formatNum(v)}`;
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updateStats() {
    const totalCoins = leaderboard.reduce((s, d) => s + d.coins, 0);
    const totalGifts = leaderboard.reduce((s, d) => s + d.gifts, 0);
    const donorsCount = leaderboard.length;
    const coinsEl = document.getElementById('statCoins');
    const giftsEl = document.getElementById('statGifts');
    const donorsEl = document.getElementById('statDonors');
    const prevCoins = parseInt(coinsEl.dataset.value || '0', 10) || 0;
    const prevGifts = parseInt(giftsEl.dataset.value || '0', 10) || 0;
    const prevDonors = parseInt(donorsEl.dataset.value || '0', 10) || 0;
    if (totalCoins !== prevCoins) {
      countUp(coinsEl, prevCoins, totalCoins, 1200);
      coinsEl.dataset.value = totalCoins;
    } else {
      coinsEl.textContent = formatNum(totalCoins);
    }
    if (totalGifts !== prevGifts) {
      countUp(giftsEl, prevGifts, totalGifts, 1200);
      giftsEl.dataset.value = totalGifts;
    } else {
      giftsEl.textContent = formatNum(totalGifts);
    }
    if (donorsCount !== prevDonors) {
      countUp(donorsEl, prevDonors, donorsCount, 800);
      donorsEl.dataset.value = donorsCount;
    } else {
      donorsEl.textContent = formatNum(donorsCount);
    }
  }

  // ============ LIVE CHAT ============
  function pushChat({ type, user, text, amount, giftId, avatar }) {
    liveChat.push({ type, user, text, amount, giftId, avatar, time: Date.now() });
    if (liveChat.length > 100) liveChat.shift();
    renderChat();
  }

  function renderChat() {
    const stream = document.getElementById('liveChatStream');
    if (!stream) return;
    if (liveChat.length === 0) {
      stream.innerHTML = '<div class="empty-chat">Conecta TikTok para ver el chat en vivo</div>';
      return;
    }
    stream.innerHTML = liveChat.slice(-30).reverse().map(m => {
      let body = '';
      const giftSrc = m.giftId ? GIFT_IMAGES[m.giftId] : null;
      if (giftSrc) {
        body += `<img class="chat-gift-img" src="${escapeAttr(giftSrc)}" onerror="this.style.display='none'" alt="">`;
      }
      body += `<div class="chat-body"><span class="chat-user">@${escapeHtml(m.user || 'anon')}</span>`;
      if (m.amount) body += ` <span class="chat-amount">+${m.amount.toLocaleString()} ðŸ’Ž</span>`;
      body += `<div class="chat-text">${escapeHtml(m.text || '')}</div></div>`;
      return `<div class="chat-msg ${m.type || ''}">${body}</div>`;
    }).join('');
    stream.scrollTop = 0;
  }

  // ============ BROADCAST ============
  function broadcast(type, payload) {
    try {
      const channel = new BroadcastChannel('tts_dashboard');
      channel.postMessage({ type, ...payload, ts: Date.now() });
      channel.close();
    } catch {}
  }

  // ============ HELPERS ============
  function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  // ============ LOAD GIFTS CATALOG ============
  try {
    const resp = await fetch('/gifts.json');
    if (resp.ok) {
      const data = await resp.json();
      for (const g of Object.values(data)) {
        if (g.id && g.image) GIFT_IMAGES[g.id] = g.image;
      }
    }
  } catch {}

  // ============ LOAD PLAN ============
  try {
    const plan = await api.get('/payments/plan-status', { signal });
    planInfo = plan;
    document.getElementById('statPlan').textContent = plan?.isActive ? '✅' : '❌';
  } catch {}

  // Init timer display
  timerDisplay.textContent = fmt(parseInt(timerMinutes.value) * 60);

  // attach magnetic hover to primary buttons (after DOM is in place)
  document.querySelectorAll('.dash-card .btn-primary, .dash-card .btn-success, .dash-card .btn-danger').forEach(b => magneticButton(b));

  return () => {
    if (timerInterval) clearInterval(timerInterval);
    if (ws) try { ws.close(); } catch {}
  };
}


