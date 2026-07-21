/**
 * Toast — TikToolStream
 * Notificaciones accesibles no bloqueantes
 */

const TOAST_KEY = '__tts_toast_counter';

function getId() {
  const n = parseInt(sessionStorage.getItem(TOAST_KEY) || '0') + 1;
  sessionStorage.setItem(TOAST_KEY, String(n));
  return `tts-toast-${n}`;
}

const activeToasts = new Set();
let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.id = 'tts-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  return container;
}

const RECENT = new Map();
/* Cleanup old entries every 60s */
setInterval(() => { const cutoff = Date.now() - 60000; for (const [k, t] of RECENT) if (t < cutoff) RECENT.delete(k); }, 60000);

export function showToast({ type = 'info', title, message, duration = 4000, action } = {}) {
  const key = `${type}:${title}:${message}`;
  const now = Date.now();
  if (RECENT.has(key) && now - RECENT.get(key) < 1000) return; // dedup
  RECENT.set(key, now);

  const id = getId();
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', 'alert');
  const bgColors = { success: '#00ff8822', error: '#ff174422', warning: '#ffd70022', info: '#00d9ff22' };
  const borderColors = { success: '#00ff88', error: '#ff1744', warning: '#ffd700', info: '#00d9ff' };
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const bg = bgColors[type] || bgColors.info;
  const border = borderColors[type] || borderColors.info;
  const icon = icons[type] || icons.info;

  el.style.cssText = `background:${bg};border:1px solid ${border};border-radius:12px;padding:12px 16px;color:#fff;font-family:'Poppins',sans-serif;font-size:14px;max-width:360px;pointer-events:auto;display:flex;align-items:flex-start;gap:10px;backdrop-filter:blur(8px);animation:ttsToastIn 0.3s ease-out;box-shadow:0 4px 20px rgba(0,0,0,0.4);`;
  el.innerHTML = `<span style="font-size:18px;flex-shrink:0;">${icon}</span><div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13px;">${title || ''}</div><div style="opacity:0.85;">${message || ''}</div></div><button style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;opacity:0.5;padding:0;line-height:1;flex-shrink:0;" aria-label="Cerrar">&times;</button>`;

  const close = el.querySelector('button');
  close.addEventListener('click', () => dismiss(id));

  let timer = duration > 0 ? setTimeout(() => dismiss(id), duration) : null;

  el.addEventListener('mouseenter', () => { if (timer) { clearTimeout(timer); timer = null; } });
  el.addEventListener('mouseleave', () => { if (duration > 0) timer = setTimeout(() => dismiss(id), duration); });

  getContainer().appendChild(el);
  activeToasts.add(id);

  function dismiss(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    activeToasts.delete(toastId);
  }
}

// Inyectar animación keyframes si no existen
if (!document.getElementById('tts-toast-styles')) {
  const style = document.createElement('style');
  style.id = 'tts-toast-styles';
  style.textContent = `@keyframes ttsToastIn{from{opacity:0;transform:translateX(20px)scale(0.95)}to{opacity:1;transform:translateX(0)scale(1)}}@media(prefers-reduced-motion:reduce){#tts-toast-container *{animation-duration:0.01ms!important}}`;
  document.head.appendChild(style);
}

export function clearToasts() {
  activeToasts.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  activeToasts.clear();
}
