const { SlashCommandBuilder } = require('discord.js');
const { getOnboardingEmbed } = require('../utils/onboardingEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('onboarding')
    .setDescription('Shows the setup steps for Holy Grail Trading'),

  async execute(interaction) {
    await interaction.reply({ embeds: [getOnboardingEmbed()] });
  },
};
