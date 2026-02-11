const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, URLS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Shows links to main support pages'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Support Resources')
      .setDescription(
        `**Getting Started**\n${URLS.GETTING_STARTED}\n\n` +
        `**Bot Setup**\n${URLS.BOT_SETUP}\n\n` +
        `**Trading Strategies**\n${URLS.TRADING_STRATEGIES}`,
      )
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    await interaction.reply({ embeds: [embed] });
  },
};
