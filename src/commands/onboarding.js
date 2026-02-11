const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, URLS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('onboarding')
    .setDescription('Shows the setup steps for Holy Grail Trading'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Onboarding Steps')
      .setDescription('Follow these steps to get started with Holy Grail Trading:')
      .addFields(
        {
          name: 'Step 1 — Sign Up',
          value: `Create your account on the portal:\n${URLS.PORTAL}`,
        },
        {
          name: 'Step 2 — User Management',
          value:
            'Follow the steps in **User Management** to sign the contract and ' +
            'complete the payment flow.',
        },
        {
          name: 'Step 3 — Getting Started Guide',
          value: `Complete the getting started guide to finish your setup:\n${URLS.GETTING_STARTED}`,
        },
        {
          name: 'Step 4 — Setup Your Bots',
          value: `Setup your bots following the instructions on the portal:\n${URLS.BOT_SETUP}`,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    await interaction.reply({ embeds: [embed] });
  },
};
