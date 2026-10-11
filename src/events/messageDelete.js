const { Events } = require('discord.js');
const { deleteMessage } = require('../utils/botGuidanceSync');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message) {
    try {
      await deleteMessage(message);
    } catch (error) {
      console.error('[BotGuidance] delete sync failed:', error);
    }
  },
};
