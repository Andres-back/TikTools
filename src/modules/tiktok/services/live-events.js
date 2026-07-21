'use strict';

const FORWARDED_EVENTS = Object.freeze([
  ['CHAT', 'chat'],
  ['MEMBER', 'member'],
  ['LIKE', 'like'],
  ['FOLLOW', 'follow'],
  ['SHARE', 'share'],
  ['ROOM_USER', 'roomUser'],
  ['SUBSCRIBE', 'subscribe'],
  ['EMOTE', 'emote'],
  ['QUESTION_NEW', 'questionNew'],
  ['GOAL_UPDATE', 'goalUpdate'],
  ['RANK_UPDATE', 'rankUpdate']
]);

function normalizeUniqueId(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@+/, '').toLowerCase().slice(0, 64);
}

function normalizeChannelId(value) {
  if (value === null || value === undefined) return '';
  const channelId = String(value).trim();
  return /^[a-zA-Z0-9_-]{1,128}$/.test(channelId) ? channelId : '';
}

function numberValue(value, fallback = 0) {
  if (value && typeof value.toNumber === 'function') {
    value = value.toNumber();
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function profilePictureUrl(event) {
  const value = firstValue(
    event.profilePictureUrl,
    event.user?.profilePictureUrl,
    event.user?.avatarThumb?.urlList?.[0],
    event.user?.avatarMedium?.urlList?.[0]
  );
  return stringValue(value);
}

function eventTimestamp(event, receivedAt) {
  const raw = firstValue(event.createTime, event.timestamp);
  const value = numberValue(raw, 0);
  if (!value) return receivedAt;
  return value < 1e12 ? value * 1000 : value;
}

function normalizeLiveEvent(type, event = {}, receivedAt = Date.now()) {
  const user = event.user || {};
  const data = {
    eventId: stringValue(firstValue(event.msgId, event.messageId, event.id)),
    type,
    timestamp: eventTimestamp(event, receivedAt),
    receivedAt,
    userId: stringValue(firstValue(event.userId, user.userId, user.id)),
    uniqueId: stringValue(firstValue(event.uniqueId, user.uniqueId)),
    nickname: stringValue(firstValue(event.nickname, user.nickname, event.uniqueId, user.uniqueId)),
    profilePictureUrl: profilePictureUrl(event),
    isModerator: Boolean(firstValue(event.isModerator, user.isModerator, false)),
    isSubscriber: Boolean(firstValue(event.isSubscriber, user.isSubscriber, false)),
    followRole: numberValue(firstValue(event.followRole, user.followRole), 0),
    teamMemberLevel: numberValue(firstValue(event.teamMemberLevel, user.teamMemberLevel), 0)
  };

  switch (type) {
    case 'chat':
      data.comment = stringValue(firstValue(event.comment, event.message));
      data.message = data.comment;
      break;
    case 'gift':
    case 'giftProgress': {
      const gift = event.extendedGiftInfo || event.gift || {};
      data.giftId = firstValue(event.giftId, gift.id, '');
      data.giftName = stringValue(firstValue(event.giftName, gift.name, 'Regalo'));
      data.giftType = numberValue(firstValue(event.giftType, gift.type), 0);
      data.diamondCount = numberValue(firstValue(event.diamondCount, gift.diamondCount), 0);
      data.repeatCount = Math.max(1, numberValue(event.repeatCount, 1));
      data.repeatEnd = Boolean(event.repeatEnd);
      data.coins = data.diamondCount * data.repeatCount;
      data.giftPictureUrl = stringValue(firstValue(
        event.giftPictureUrl,
        gift.icon?.urlList?.[0],
        gift.image?.urlList?.[0]
      ));
      break;
    }
    case 'like':
      data.likeCount = Math.max(0, numberValue(firstValue(event.likeCount, event.count), 0));
      data.totalLikeCount = Math.max(0, numberValue(event.totalLikeCount, 0));
      break;
    case 'roomUser':
      data.viewerCount = Math.max(0, numberValue(firstValue(event.viewerCount, event.total), 0));
      data.totalUser = Math.max(0, numberValue(event.totalUser, data.viewerCount));
      break;
    case 'member':
      data.memberCount = Math.max(0, numberValue(firstValue(event.memberCount, event.memberCountForLinkMic), 0));
      break;
    case 'subscribe':
      data.subMonth = Math.max(0, numberValue(firstValue(event.subMonth, event.month), 0));
      data.subscribingStatus = numberValue(event.subscribingStatus, 0);
      break;
    case 'emote':
      data.emoteId = stringValue(firstValue(event.emoteId, event.emote?.emoteId, event.emote?.id));
      data.emoteImageUrl = stringValue(firstValue(
        event.emoteImageUrl,
        event.emote?.image?.urlList?.[0],
        event.emote?.emoteImage?.urlList?.[0]
      ));
      break;
    default:
      data.label = stringValue(firstValue(event.label, event.displayType));
  }

  return data;
}

function classifyGiftEvent(event = {}) {
  const giftType = firstValue(event.giftType, event.extendedGiftInfo?.type, event.gift?.type);
  return numberValue(giftType, 0) === 1 && event.repeatEnd !== true
    ? 'giftProgress'
    : 'gift';
}

function registerLiveEventHandlers(connection, WebcastEvent, emit, now = Date.now) {
  if (!connection || typeof connection.on !== 'function') {
    throw new TypeError('connection.on es requerido');
  }
  if (!WebcastEvent || typeof WebcastEvent !== 'object') {
    throw new TypeError('WebcastEvent es requerido');
  }
  if (typeof emit !== 'function') {
    throw new TypeError('emit es requerido');
  }

  const giftEvent = WebcastEvent.GIFT;
  if (giftEvent) {
    connection.on(giftEvent, (event) => {
      const type = classifyGiftEvent(event);
      emit({ type, data: normalizeLiveEvent(type, event, now()) });
    });
  }

  for (const [eventKey, type] of FORWARDED_EVENTS) {
    const eventName = WebcastEvent[eventKey];
    if (!eventName) continue;
    connection.on(eventName, (event) => {
      emit({ type, data: normalizeLiveEvent(type, event, now()) });
    });
  }
}

module.exports = {
  FORWARDED_EVENTS,
  classifyGiftEvent,
  normalizeChannelId,
  normalizeLiveEvent,
  normalizeUniqueId,
  registerLiveEventHandlers
};
