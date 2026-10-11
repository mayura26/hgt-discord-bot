const { Events } = require('discord.js');
const { upsertFromMessage } = require('../utils/botGuidanceSync');

module.exports = {
  name: Events.MessageUpdate,
  once: false,
  async execute(_oldMessage, newMessage) {
    try {
      await upsertFromMessage(newMessage);
    } catch (error) {
      console.error('[BotGuidance] edit sync failed:', error);
    }
  },
};
