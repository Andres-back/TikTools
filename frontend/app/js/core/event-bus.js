/**
 * Event Bus — TikToolStream
 * Pub/sub centralizado para comunicación entre componentes
 */

const listeners = new Map();

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => off(event, callback);
}

export function off(event, callback) {
  const set = listeners.get(event);
  if (set) { set.delete(callback); if (set.size === 0) listeners.delete(event); }
}

export function once(event, callback) {
  const wrapper = (payload) => { off(event, wrapper); callback(payload); };
  return on(event, wrapper);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (set) set.forEach(cb => { try { cb(payload); } catch (e) { console.error(`[EventBus] Error in ${event}:`, e); } });
}

export function clear(event) {
  if (event) listeners.delete(event);
  else listeners.clear();
}

export function getEvents() {
  return Array.from(listeners.keys());
}
