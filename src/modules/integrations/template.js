'use strict';

const PLACEHOLDER = /{{\s*([a-zA-Z0-9_.]+)\s*}}/g;
const LEGACY_PLACEHOLDER = /%([a-zA-Z][a-zA-Z0-9]*)%/g;

const LEGACY_PATHS = Object.freeze({
  userId: 'user.id',
  username: 'user.uniqueId',
  uniqueId: 'user.uniqueId',
  nickname: 'user.nickname',
  comment: 'chat.comment',
  commandParams: 'chat.commandParams',
  giftId: 'gift.id',
  giftName: 'gift.name',
  coins: 'gift.coins',
  repeatCount: 'gift.repeatCount',
  likeCount: 'like.count',
  totalLikeCount: 'like.total',
  subMonth: 'subscribe.month',
  eventType: 'event.type',
  channelId: 'stream.channelId'
});

function buildTemplateContext(event = {}, channelId = '') {
  const type = String(event.type || 'unknown');
  const data = event.data || {};
  const comment = String(data.comment || data.message || '');
  const commandParts = comment.trim().split(/\s+/);

  return {
    event: {
      type,
      timestamp: Number(data.timestamp || event.timestamp || Date.now())
    },
    stream: {
      channelId: String(channelId || ''),
      uniqueId: String(event.streamUniqueId || '')
    },
    user: {
      id: String(data.userId || ''),
      uniqueId: String(data.uniqueId || ''),
      nickname: String(data.nickname || data.uniqueId || 'Viewer'),
      subscriber: Boolean(data.isSubscriber),
      moderator: Boolean(data.isModerator)
    },
    gift: {
      id: String(data.giftId || ''),
      name: String(data.giftName || ''),
      coins: finiteNumber(data.coins || (Number(data.diamondCount) || 0) * (Number(data.repeatCount) || 1)),
      diamondCount: finiteNumber(data.diamondCount),
      repeatCount: Math.max(1, finiteNumber(data.repeatCount, 1))
    },
    like: {
      count: finiteNumber(data.likeCount),
      total: finiteNumber(data.totalLikeCount)
    },
    chat: {
      comment,
      command: commandParts[0] || '',
      commandParams: commandParts.slice(1).join(' ')
    },
    subscribe: {
      month: finiteNumber(data.subMonth)
    },
    room: {
      viewers: finiteNumber(data.viewerCount || data.totalUser)
    }
  };
}

function renderTemplate(value, context, options = {}) {
  const mode = options.mode || 'text';
  const maxLength = Math.max(1, Number(options.maxLength) || 4096);
  const exact = typeof value === 'string' ? value.match(/^{{\s*([a-zA-Z0-9_.]+)\s*}}$/) : null;
  if (exact && mode === 'json') {
    const resolved = getPath(context, exact[1]);
    return resolved === undefined || resolved === null ? '' : resolved;
  }

  let result = String(value ?? '').replace(PLACEHOLDER, (_match, path) => {
    return stringifyValue(getPath(context, path), mode);
  });
  result = result.replace(LEGACY_PLACEHOLDER, (_match, name) => {
    const path = LEGACY_PATHS[name];
    return path ? stringifyValue(getPath(context, path), mode) : '';
  });
  return result.slice(0, maxLength);
}

function renderJsonTemplate(value, context, depth = 0) {
  if (depth > 8) throw new Error('La plantilla supera la profundidad permitida');
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => renderJsonTemplate(item, context, depth + 1));
  if (value && typeof value === 'object') {
    const rendered = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      rendered[String(key).slice(0, 100)] = renderJsonTemplate(item, context, depth + 1);
    }
    return rendered;
  }
  if (typeof value === 'string') return renderTemplate(value, context, { mode: 'json', maxLength: 10000 });
  return value;
}

function matchesConditions(conditions = {}, event = {}) {
  const data = event.data || {};
  const coins = finiteNumber(data.coins || (Number(data.diamondCount) || 0) * (Number(data.repeatCount) || 1));
  const likes = finiteNumber(data.likeCount);

  if (conditions.minCoins !== undefined && coins < finiteNumber(conditions.minCoins)) return false;
  if (conditions.maxCoins !== undefined && coins > finiteNumber(conditions.maxCoins, Number.MAX_SAFE_INTEGER)) return false;
  if (conditions.minLikes !== undefined && likes < finiteNumber(conditions.minLikes)) return false;
  if (conditions.giftId && String(data.giftId || '') !== String(conditions.giftId)) return false;
  if (conditions.giftName && normalize(data.giftName) !== normalize(conditions.giftName)) return false;
  if (conditions.subscriberOnly && !data.isSubscriber) return false;
  if (conditions.moderatorOnly && !data.isModerator) return false;

  if (conditions.chatCommand) {
    const comment = normalize(data.comment || data.message);
    const command = normalize(conditions.chatCommand).replace(/^!+/, '');
    if (!comment.startsWith(`!${command}`) && comment !== command) return false;
  }

  return true;
}

function sanitizeRconSubstitution(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f;\\"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function stringifyValue(value, mode) {
  if (value === undefined || value === null) return '';
  if (mode === 'rcon') return sanitizeRconSubstitution(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getPath(object, path) {
  return String(path || '').split('.').reduce((value, key) => {
    if (value === null || value === undefined || !Object.prototype.hasOwnProperty.call(Object(value), key)) return undefined;
    return value[key];
  }, object);
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

module.exports = {
  LEGACY_PATHS,
  buildTemplateContext,
  matchesConditions,
  renderJsonTemplate,
  renderTemplate,
  sanitizeRconSubstitution
};
