const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLORS } = require('../constants');

const USER_COMMANDS =
  '**/help**\nShows this list of available commands.\n\n' +
  '**/onboarding**\nWalks you through the steps to get set up with Holy Grail Trading.\n\n' +
  '**/support**\nShows links to our main support pages (Getting Started, Quick Start Video, Bot Setup, Trading Strategies).\n\n' +
  '**/ask**\nSearch the Holy Grail Trading knowledge base for answers.';

const ADMIN_COMMANDS =
  '**/adminonboarding**\nAdmin checklist for onboarding a new user.\n\n' +
  '**/add-knowledge**\nAdd a custom knowledge entry to the /ask knowledge base.\n\n' +
  '**/delete-knowledge**\nDelete a custom knowledge entry from the /ask knowledge base.\n\n' +
  '**/show-knowledge**\nList all custom knowledge entries in the /ask knowledge base.\n\n' +
  '**/reinit-knowledge**\nReload the support indexes from remote sources.\n\n' +
  '**/giveaway**\nManage giveaways.\n\n' +
  '**/setupuser**\nSet up a user as a customer (private channel + role).\n\n' +
  '**/testwelcome**\nSimulates the welcome message for testing.';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available bot commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Bot Commands')
      .setDescription(USER_COMMANDS)
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      embed.addFields({
        name: 'Admin Commands',
        value: ADMIN_COMMANDS,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
