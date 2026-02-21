const { Events } = require('discord.js');
const { initSupportIndexes, isAvailable } = require('../utils/supportIndex');

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
  },
};
