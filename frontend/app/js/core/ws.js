/**
 * WebSocket Service — TikToolStream
 * Conexión centralizada con reconexión automática
 */

import { emit, on } from './event-bus.js';

const STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

let ws = null;
let currentOptions = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let intentionalDisconnect = false;
const subscribers = new Map();
const stateCallbacks = new Set();
let currentState = STATE.IDLE;
let messageQueue = [];
const MAX_QUEUE = 50;
const MAX_RECONNECT_DELAY = 30000;

function setState(newState) {
  currentState = newState;
  stateCallbacks.forEach(cb => { try { cb(newState); } catch {} });
  emit('ws:state', newState);
}

export function subscribeState(callback) {
  stateCallbacks.add(callback);
  return () => stateCallbacks.delete(callback);
}

export function getState() { return currentState; }

function getBackoffDelay() {
  const base = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  const jitter = Math.random() * 1000;
  return base + jitter;
}

function doConnect() {
  if (!currentOptions) return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  setState(currentOptions.sessionToken ? STATE.CONNECTING : STATE.RECONNECTING);
  intentionalDisconnect = false;

  const url = currentOptions.url || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live`;

  try {
    ws = new WebSocket(url);
  } catch (err) {
    setState(STATE.ERROR);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    setState(STATE.CONNECTED);
    if (currentOptions.sessionToken) {
      ws.send(JSON.stringify({ type: 'auth', sessionToken: currentOptions.sessionToken }));
    } else if (currentOptions.uniqueId) {
      ws.send(JSON.stringify({ type: 'connect', uniqueId: currentOptions.uniqueId }));
    }
    // Enviar mensajes encolados
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      try { ws.send(JSON.stringify(msg)); } catch {}
    }
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch { return; }
    if (!data || typeof data !== 'object') return;
    const type = data.type || '_unknown';
    const cbs = subscribers.get(type);
    if (cbs) cbs.forEach(cb => { try { cb(data); } catch {} });
    emit(`ws:message:${type}`, data);
  };

  ws.onclose = () => {
    if (intentionalDisconnect) {
      setState(STATE.DISCONNECTED);
      return;
    }
    setState(STATE.RECONNECTING);
    scheduleReconnect();
  };

  ws.onerror = () => {
    setState(STATE.ERROR);
  };
}

function scheduleReconnect() {
  if (intentionalDisconnect) return;
  reconnectAttempts++;
  const delay = getBackoffDelay();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => doConnect(), delay);
}

export function connect(options = {}) {
  intentionalDisconnect = false;
  currentOptions = options;
  reconnectAttempts = 0;
  doConnect();
}

export function disconnect(reason = 'user') {
  intentionalDisconnect = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  messageQueue = [];
  if (ws) {
    try { ws.close(1000, reason); } catch {}
    ws = null;
  }
  setState(STATE.DISCONNECTED);
}

export function send(type, payload = {}) {
  const msg = { type, ...payload };
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch {}
  } else {
    if (messageQueue.length < MAX_QUEUE) messageQueue.push(msg);
  }
}

export function subscribe(eventType, callback) {
  if (!subscribers.has(eventType)) subscribers.set(eventType, new Set());
  subscribers.get(eventType).add(callback);
  return () => unsubscribe(eventType, callback);
}

export function unsubscribe(eventType, callback) {
  const set = subscribers.get(eventType);
  if (set) { set.delete(callback); if (set.size === 0) subscribers.delete(eventType); }
}

export { STATE as WS_STATE };
