const { Events } = require('discord.js');
const { initSupportIndexes, isAvailable, refreshChannelIndex } = require('../utils/supportIndex');
const { syncGuidanceSnapshot, getChannelNotes } = require('../utils/botGuidanceSync');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot online as ${client.user.tag}`);
    await initSupportIndexes();
    console.log(isAvailable()
      ? '[SupportIndex] Knowledge base ready.'
      : '[SupportIndex] WARNING: Both indexes failed to load.',
    );
    try {
      await syncGuidanceSnapshot(client);
    } catch (error) {
      console.error('[BotGuidance] startup sync failed:', error);
    }
    refreshChannelIndex(getChannelNotes());
  },
};
