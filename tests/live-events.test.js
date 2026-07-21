'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  classifyGiftEvent,
  normalizeChannelId,
  normalizeLiveEvent,
  normalizeUniqueId,
  registerLiveEventHandlers
} = require('../src/modules/tiktok/services/live-events');

test('normaliza identificadores de canal y TikTok', () => {
  assert.equal(normalizeUniqueId('  @Mi.Canal  '), 'mi.canal');
  assert.equal(normalizeUniqueId(null), '');
  assert.equal(normalizeChannelId(42), '42');
  assert.equal(normalizeChannelId('canal_publico-1'), 'canal_publico-1');
  assert.equal(normalizeChannelId('../secreto'), '');
});

test('normaliza chat a un esquema estable', () => {
  const data = normalizeLiveEvent('chat', {
    msgId: 99,
    uniqueId: 'viewer_1',
    nickname: 'Viewer Uno',
    comment: 'hola',
    createTime: 123
  }, 5000);

  assert.equal(data.eventId, '99');
  assert.equal(data.uniqueId, 'viewer_1');
  assert.equal(data.comment, 'hola');
  assert.equal(data.message, 'hola');
  assert.equal(data.timestamp, 123000);
  assert.equal(data.receivedAt, 5000);
});

test('clasifica combos en progreso y calcula monedas solo con el total final', () => {
  assert.equal(classifyGiftEvent({ giftType: 1, repeatEnd: false }), 'giftProgress');
  assert.equal(classifyGiftEvent({ giftType: 1, repeatEnd: true }), 'gift');
  assert.equal(classifyGiftEvent({ giftType: 0 }), 'gift');

  const data = normalizeLiveEvent('gift', {
    uniqueId: 'donante',
    giftId: 5655,
    giftName: 'Rose',
    giftType: 1,
    diamondCount: 1,
    repeatCount: 12,
    repeatEnd: true
  }, 1000);

  assert.equal(data.repeatCount, 12);
  assert.equal(data.coins, 12);
  assert.equal(data.repeatEnd, true);
});

test('normaliza viewers y likes numéricos', () => {
  const viewers = normalizeLiveEvent('roomUser', { viewerCount: '321' }, 1000);
  const likes = normalizeLiveEvent('like', { likeCount: '7', totalLikeCount: '90' }, 1000);
  assert.equal(viewers.viewerCount, 321);
  assert.equal(likes.likeCount, 7);
  assert.equal(likes.totalLikeCount, 90);
});

test('registra y emite el catálogo esencial de eventos Live', () => {
  const connection = new EventEmitter();
  const events = [];
  const names = {
    GIFT: 'gift', CHAT: 'chat', MEMBER: 'member', LIKE: 'like',
    FOLLOW: 'follow', SHARE: 'share', ROOM_USER: 'roomUser',
    SUBSCRIBE: 'subscribe', EMOTE: 'emote'
  };

  registerLiveEventHandlers(connection, names, (event) => events.push(event), () => 1234);
  connection.emit('chat', { uniqueId: 'ana', comment: 'hola' });
  connection.emit('roomUser', { viewerCount: 25 });
  connection.emit('gift', { giftType: 1, repeatEnd: false, repeatCount: 2 });
  connection.emit('gift', { giftType: 1, repeatEnd: true, repeatCount: 2, diamondCount: 5 });

  assert.deepEqual(events.map((event) => event.type), ['chat', 'roomUser', 'giftProgress', 'gift']);
  assert.equal(events[3].data.coins, 10);
});
