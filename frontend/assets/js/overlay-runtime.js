(function bootstrapTikToolOverlay(global) {
  'use strict';

  const VERSION = '1.0.0';
  const REDUCED_MOTION = global.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  class Emitter {
    constructor() {
      this.listeners = new Map();
    }

    on(type, listener) {
      if (typeof listener !== 'function') return () => {};
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(listener);
      return () => this.off(type, listener);
    }

    off(type, listener) {
      const listeners = this.listeners.get(type);
      listeners?.delete(listener);
      if (listeners?.size === 0) this.listeners.delete(type);
    }

    emit(type, payload) {
      this.listeners.get(type)?.forEach((listener) => {
        try { listener(payload); } catch (error) { console.error('[TikToolOverlay]', error); }
      });
    }

    clear() {
      this.listeners.clear();
    }
  }

  class LiveChannelClient extends Emitter {
    constructor(options = {}) {
      super();
      this.channelId = normalizeChannelId(options.channelId);
      this.endpoint = options.endpoint || '/live';
      this.reconnectMin = Math.max(500, Number(options.reconnectMin) || 800);
      this.reconnectMax = Math.max(this.reconnectMin, Number(options.reconnectMax) || 20000);
      this.socket = null;
      this.timer = null;
      this.attempt = 0;
      this.stopped = true;
      this.recentEvents = new Map();
    }

    start() {
      if (!this.channelId) {
        this.emit('status', { state: 'waiting', message: 'Falta userId en la URL' });
        return this;
      }
      this.stopped = false;
      this.connect();
      return this;
    }

    connect() {
      if (this.stopped || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
      clearTimeout(this.timer);
      this.emit('status', { state: this.attempt ? 'reconnecting' : 'connecting', attempt: this.attempt });

      const protocol = global.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const endpoint = this.endpoint.startsWith('/') ? this.endpoint : `/${this.endpoint}`;
      const socket = new WebSocket(`${protocol}//${global.location.host}${endpoint}`);
      this.socket = socket;

      socket.addEventListener('open', () => {
        if (socket !== this.socket) return;
        socket.send(JSON.stringify({ type: 'subscribe', channelId: this.channelId }));
        this.emit('status', { state: 'connected' });
      });

      socket.addEventListener('message', (message) => {
        if (socket !== this.socket) return;
        let event;
        try { event = JSON.parse(message.data); } catch { return; }
        if (!event || typeof event !== 'object') return;

        if (event.type === 'subscribed') {
          this.attempt = 0;
          this.emit('status', { state: event.data?.live ? 'live' : 'ready', data: event.data || {} });
          return;
        }
        if (event.type === 'connected') this.emit('status', { state: 'live', data: event.data || {} });
        if (event.type === 'disconnected' || event.type === 'streamEnd') {
          this.emit('status', { state: 'offline', data: event.data || {} });
        }
        if (event.type === 'error') this.emit('status', { state: 'error', message: event.message || 'Error del LIVE' });

        if (this.isDuplicate(event)) return;
        this.emit('event', event);
        this.emit(event.type, event.data || {});
      });

      socket.addEventListener('close', () => {
        if (socket !== this.socket) return;
        this.socket = null;
        if (!this.stopped) this.scheduleReconnect();
      });

      socket.addEventListener('error', () => {
        if (socket === this.socket) socket.close();
      });
    }

    isDuplicate(event) {
      const data = event.data || {};
      const explicitId = data.eventId ? `${event.type}:${data.eventId}` : '';
      if (!explicitId) return false;
      const now = Date.now();
      for (const [key, timestamp] of this.recentEvents) {
        if (now - timestamp > 45000) this.recentEvents.delete(key);
      }
      if (this.recentEvents.has(explicitId)) return true;
      this.recentEvents.set(explicitId, now);
      return false;
    }

    scheduleReconnect() {
      this.attempt += 1;
      const base = Math.min(this.reconnectMax, this.reconnectMin * (2 ** Math.min(this.attempt - 1, 5)));
      const delay = Math.round(base * (0.8 + Math.random() * 0.4));
      this.emit('status', { state: 'reconnecting', attempt: this.attempt, delay });
      this.timer = setTimeout(() => this.connect(), delay);
    }

    stop() {
      this.stopped = true;
      clearTimeout(this.timer);
      this.timer = null;
      const socket = this.socket;
      this.socket = null;
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'overlay stopped');
      this.emit('status', { state: 'stopped' });
    }
  }

  class SerialQueue {
    constructor(worker, options = {}) {
      this.worker = worker;
      this.maxLength = Math.max(1, Number(options.maxLength) || 12);
      this.items = [];
      this.running = false;
    }

    push(item, options = {}) {
      if (options.priority) this.items.unshift(item);
      else this.items.push(item);
      if (this.items.length > this.maxLength) this.items.splice(this.maxLength);
      this.drain();
    }

    async drain() {
      if (this.running) return;
      this.running = true;
      while (this.items.length) {
        const item = this.items.shift();
        try { await this.worker(item); } catch (error) { console.error('[TikToolOverlay queue]', error); }
      }
      this.running = false;
    }

    clear() {
      this.items.length = 0;
    }
  }

  const motion = {
    reduced: REDUCED_MOTION,
    available: Boolean(global.gsap),
    fromTo(target, fromVars, toVars) {
      if (!target) return null;
      if (global.gsap && !REDUCED_MOTION) return global.gsap.fromTo(target, fromVars, toVars);
      Object.assign(target.style || {}, fallbackStyles(toVars));
      toVars?.onComplete?.();
      return null;
    },
    to(target, vars) {
      if (!target) return null;
      if (global.gsap && !REDUCED_MOTION) return global.gsap.to(target, vars);
      Object.assign(target.style || {}, fallbackStyles(vars));
      vars?.onComplete?.();
      return null;
    },
    set(target, vars) {
      if (!target) return;
      if (global.gsap) global.gsap.set(target, vars);
      else Object.assign(target.style || {}, fallbackStyles(vars));
    },
    timeline(options = {}) {
      if (global.gsap && !REDUCED_MOTION) return global.gsap.timeline(options);
      return createFallbackTimeline(options);
    },
    kill(target) {
      if (global.gsap && target) global.gsap.killTweensOf(target);
    }
  };

  function createFallbackTimeline(options) {
    const api = {
      fromTo(target, _from, to) { motion.fromTo(target, _from, to); return api; },
      to(target, vars) { motion.to(target, vars); return api; },
      set(target, vars) { motion.set(target, vars); return api; }
    };
    queueMicrotask(() => options?.onComplete?.());
    return api;
  }

  function fallbackStyles(vars = {}) {
    const styles = {};
    if (vars.opacity !== undefined) styles.opacity = String(vars.opacity);
    if (vars.autoAlpha !== undefined) {
      styles.opacity = String(vars.autoAlpha);
      styles.visibility = Number(vars.autoAlpha) === 0 ? 'hidden' : 'visible';
    }
    const transforms = [];
    if (vars.xPercent !== undefined) transforms.push(`translateX(${numberWithUnit(vars.xPercent, '%')})`);
    if (vars.yPercent !== undefined) transforms.push(`translateY(${numberWithUnit(vars.yPercent, '%')})`);
    if (vars.x !== undefined) transforms.push(`translateX(${numberWithUnit(vars.x, 'px')})`);
    if (vars.y !== undefined) transforms.push(`translateY(${numberWithUnit(vars.y, 'px')})`);
    if (vars.scale !== undefined) transforms.push(`scale(${vars.scale})`);
    if (vars.rotation !== undefined) transforms.push(`rotate(${numberWithUnit(vars.rotation, 'deg')})`);
    if (transforms.length) styles.transform = transforms.join(' ');
    return styles;
  }

  function numberWithUnit(value, unit) {
    return typeof value === 'number' ? `${value}${unit}` : String(value);
  }

  function normalizeChannelId(value) {
    const id = value === null || value === undefined ? '' : String(value).trim();
    return /^[a-zA-Z0-9_-]{1,128}$/.test(id) ? id : '';
  }

  function getParams() {
    return new URLSearchParams(global.location.search);
  }

  function channelIdFromUrl() {
    const params = getParams();
    return normalizeChannelId(params.get('channelId') || params.get('userId'));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function formatCompact(value) {
    const number = Number(value) || 0;
    try { return new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(number); }
    catch { return String(Math.round(number)); }
  }

  function safeImageUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value), global.location.origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function displayName(data = {}) {
    return String(data.nickname || data.uniqueId || 'Viewer').trim().slice(0, 48);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function createParticleBurst(container, options = {}) {
    if (!container || REDUCED_MOTION) return;
    const count = Math.min(120, Math.max(1, Number(options.count) || 14));
    const palette = options.palette || ['#25f4ee', '#fe2c55', '#ffd166', '#9b5cff', '#ffffff'];
    const originX = Number(options.x ?? global.innerWidth / 2);
    const originY = Number(options.y ?? global.innerHeight / 2);

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'tts-particle';
      particle.setAttribute('aria-hidden', 'true');
      if (options.emoji) particle.textContent = options.emoji;
      else particle.style.background = palette[index % palette.length];
      container.appendChild(particle);

      const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.35;
      const distance = 90 + Math.random() * 170;
      motion.set(particle, { x: originX, y: originY, scale: 0.4, opacity: 1, rotation: Math.random() * 120 });
      motion.to(particle, {
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance + 80,
        scale: options.emoji ? 1.15 : 0.8,
        rotation: 360 + Math.random() * 260,
        opacity: 0,
        duration: 1.15 + Math.random() * 0.55,
        ease: 'power2.out',
        onComplete: () => particle.remove()
      });
    }
  }

  function screenShake(intensity = 1) {
    if (REDUCED_MOTION) return;
    const el = document.documentElement || document.body;
    const duration = Math.min(600, 200 + intensity * 80);
    const maxX = Math.min(20, 4 + intensity * 3);
    const maxY = Math.min(12, 2 + intensity * 2);
    const start = performance.now();
    function frame(now) {
      const k = Math.min(1, (now - start) / duration);
      if (k >= 1) { el.style.transform = ''; return; }
      const ease = 1 - Math.pow(1 - k, 3);
      const x = (Math.random() - 0.5) * 2 * maxX * (1 - ease);
      const y = (Math.random() - 0.5) * 2 * maxY * (1 - ease);
      el.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function flashOverlay(color = '#ffffff', duration = 200) {
    if (REDUCED_MOTION) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;background:' + color + ';opacity:0';
    document.body.appendChild(el);
    motion.set(el, { opacity: 0.6 });
    motion.to(el, { opacity: 0, duration: duration / 1000, onComplete: () => el.remove() });
  }

  function createDemoFeed(emit, options = {}) {
    if (typeof emit !== 'function') return () => {};
    const names = ['LunaPlay', 'MateoCraft', 'ValenLive', 'NicoGG', 'SaraPixel', 'DaniWave'];
    const gifts = [
      ['Rosa', 1, '🌹'], ['Perfume', 20, '✨'], ['Sombrero', 99, '🎩'], ['León', 29999, '🦁'], ['Castillo', 20000, '🏰']
    ];
    let stopped = false;
    let timer;
    let totalLikes = 12640;
    let viewers = 842;
    let cursor = 0;

    const fixtures = [
      () => ({ type: 'like', data: person({ likeCount: 3 + cursor % 7, totalLikeCount: totalLikes += 3 + cursor % 7 }) }),
      () => ({ type: 'follow', data: person() }),
      () => ({ type: 'chat', data: person({ comment: ['¡Vamos por el hype!', 'Esto está brutal 🔥', '!hype', '¿Qué regalo activa el boss?'][cursor % 4] }) }),
      () => {
        const gift = gifts[cursor % gifts.length];
        return { type: 'gift', data: person({ giftName: gift[0], diamondCount: gift[1], repeatCount: cursor % 3 + 1, coins: gift[1] * (cursor % 3 + 1), giftEmoji: gift[2], repeatEnd: true }) };
      },
      () => ({ type: 'share', data: person() }),
      () => ({ type: 'subscribe', data: person({ subMonth: cursor % 8 + 1 }) }),
      () => ({ type: 'roomUser', data: { viewerCount: viewers += cursor % 2 ? 7 : -2 } })
    ];

    function person(extra = {}) {
      const name = names[cursor % names.length];
      return { uniqueId: name.toLowerCase(), nickname: name, ...extra };
    }

    function tick() {
      if (stopped) return;
      const fixture = fixtures[cursor % fixtures.length];
      emit(fixture());
      cursor += 1;
      timer = setTimeout(tick, 600 + Math.random() * 700);
    }

    timer = setTimeout(tick, options.immediate === false ? 900 : 120);
    return () => { stopped = true; clearTimeout(timer); };
  }

  global.TikToolOverlay = Object.freeze({
    VERSION,
    Emitter,
    LiveChannelClient,
    SerialQueue,
    motion,
    channelIdFromUrl,
    clamp,
    createDemoFeed,
    createParticleBurst,
    screenShake,
    flashOverlay,
    displayName,
    formatCompact,
    getParams,
    normalizeChannelId,
    safeImageUrl,
    sleep
  });
})(window);
