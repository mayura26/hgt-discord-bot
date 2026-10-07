const { SlashCommandBuilder } = require('discord.js');
const { getOnboardingEmbeds } = require('../utils/onboardingEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('onboarding')
    .setDescription('Shows the setup steps for Holy Grail Trading'),

  async execute(interaction) {
    const [first, ...rest] = getOnboardingEmbeds(interaction.guild);
    await interaction.reply({ embeds: [first] });
    for (const embed of rest) {
      await interaction.followUp({ embeds: [embed] });
    }
  },
};
