const { Events } = require('discord.js');
const { upsertFromMessage } = require('../utils/botGuidanceSync');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    try {
      await upsertFromMessage(message);
    } catch (error) {
      console.error('[BotGuidance] create sync failed:', error);
    }
  },
};
