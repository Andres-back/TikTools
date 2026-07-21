// Catálogo completo de gifts de TikTok generado desde gifts-source.html
// Este archivo se genera mediante scripts/generateGiftsJson.js
const GIFT_DATA = require('./gifts.json');

const getGiftData = (giftId) => {
  return GIFT_DATA[giftId] || null;
};

const getGiftName = (giftId, fallbackName = 'Unknown') => {
  const data = getGiftData(giftId);
  return data ? data.name : (fallbackName || `Gift #${giftId}`);
};

const getGiftImage = (giftId) => {
  const data = getGiftData(giftId);
  return data ? data.image : null;
};

const getGiftNameWithFallback = (giftId, eventName) => {
  // Si el evento ya tiene nombre válido, usarlo
  if (eventName && eventName !== 'Unknown' && eventName.trim() !== '') {
    return eventName;
  }
  // Sino, buscar en diccionario
  return getGiftName(giftId, eventName);
};

module.exports = {
  GIFT_DATA,
  getGiftData,
  getGiftName,
  getGiftImage,
  getGiftNameWithFallback
};
