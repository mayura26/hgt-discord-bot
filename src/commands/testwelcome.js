const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { ROLES } = require('../constants');
const {
  getColdJoinWelcome,
  getReturningCustomerWelcome,
  getPropHuntWelcome,
  getSelfSelectWelcome,
} = require('../utils/welcomeMessages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Simulates the welcome message for testing (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Which welcome flow to simulate')
        .setRequired(true)
        .addChoices(
          { name: 'Both: Cold + Self-select (for review)', value: 'both' },
          { name: 'Cold join (ad)', value: 'cold' },
          { name: 'Self-select (click the button)', value: 'self' },
          { name: 'Already a customer', value: 'customer' },
          { name: 'Found via Discord / want to know more', value: 'prop' },
        ),
    ),

  async execute(interaction) {
    const member = interaction.member;
    const type = interaction.options.getString('type');

    const newRole = interaction.guild.roles.cache.find(
      (r) => r.name === ROLES.NEW,
    );
    if (newRole) {
      await member.roles.add(newRole);
    } else {
      console.warn('Could not find "New" role.');
    }

    if (type === 'both') {
      const cold = getColdJoinWelcome(member);
      const self = getSelfSelectWelcome(member);
      await interaction.reply({
        content: '**1. Cold join (ad)** — what DA-role joiners see:',
        embeds: [cold.embed],
        components: cold.components,
        flags: MessageFlags.Ephemeral,
      });
      await interaction.followUp({
        content: '**2. Self-select** — what non-DA joiners see (click a button):',
        embeds: [self.embed],
        components: self.components,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let result;
    switch (type) {
      case 'cold':
        result = getColdJoinWelcome(member);
        break;
      case 'self':
        result = getSelfSelectWelcome(member);
        break;
      case 'customer':
        result = getReturningCustomerWelcome(member);
        break;
      case 'prop':
        result = getPropHuntWelcome(member);
        break;
      default:
        result = getSelfSelectWelcome(member);
    }

    await interaction.reply({
      content: `${member}`,
      embeds: [result.embed],
      components: result.components,
      flags: MessageFlags.Ephemeral,
    });
  },
};
