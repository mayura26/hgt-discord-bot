'use strict';

const TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map(); // messageId → { question, openAIAnswer }

function set(messageId, context) {
  store.set(messageId, context);
  setTimeout(() => store.delete(messageId), TTL_MS);
}

function get(messageId) {
  return store.get(messageId) || null;
}

module.exports = { set, get };
