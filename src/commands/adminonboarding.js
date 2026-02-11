const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS, URLS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminonboarding')
    .setDescription('Admin checklist for onboarding a new user'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Admin Onboarding Checklist')
      .setDescription('Complete the following steps to onboard a new user:')
      .addFields(
        {
          name: 'Step 1 — Register User on Portal',
          value: `Register the user's account on the portal:\n${URLS.PORTAL}`,
        },
        {
          name: 'Step 2 — Assign Tier',
          value: 'Assign the user their correct tier on the portal.',
        },
        {
          name: 'Step 3 — NT Ecosystem Licensing',
          value: 'Add the user to NinjaTrader ecosystem licensing.',
        },
        {
          name: 'Step 4 — Verify Contract',
          value: 'Verify the user has their contract signed.',
        },
        {
          name: 'Step 5 — Create Private Discord Channel',
          value: 'Create a private channel for the user, set correct permissions and visibility for staff, and the user.',
        },
        {
          name: 'Step 6 — Assign Discord Roles',
          value: 'Assign the user to the correct Discord roles (e.g., Trial, Subscriber, Premium, etc.) within the server.',
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
