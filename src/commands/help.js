const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available bot commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Bot Commands')
      .setDescription(
        '**/help**\nShows this list of available commands.\n\n' +
        '**/onboarding**\nWalks you through the steps to get set up with Holy Grail Trading.\n\n' +
        '**/support**\nShows links to our main support pages (Getting Started, Bot Setup, Trading Strategies).\n\n' +
        '**/adminonboarding**\nAdmin checklist for onboarding a new user.',
      )
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
