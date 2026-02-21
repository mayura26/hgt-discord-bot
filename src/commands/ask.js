'use strict';

const { SlashCommandBuilder } = require('discord.js');
const {
  isAvailable,
  isFinancialAdviceQuery,
  findDisclaimerUrl,
  searchIndexes,
  buildHighConfidenceEmbed,
  buildLowConfidenceEmbed,
  buildNoConfidenceEmbed,
  buildFinancialAdviceEmbed,
  buildUnavailableEmbed,
  buildAskActionRow,
} = require('../utils/supportIndex');
const askContext = require('../utils/askContext');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Search the Holy Grail Trading knowledge base for answers')
    .addStringOption(opt =>
      opt
        .setName('question')
        .setDescription('What would you like to know?')
        .setRequired(true)
        .setMaxLength(500),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const question = interaction.options.getString('question', true).trim();

    if (!isAvailable()) {
      return interaction.editReply({ embeds: [buildUnavailableEmbed()] });
    }

    if (isFinancialAdviceQuery(question)) {
      return interaction.editReply({ embeds: [buildFinancialAdviceEmbed(findDisclaimerUrl())] });
    }

    const { results, confidence, importantTerms, openAIAnswer, citedResults } = await searchIndexes(question);

    const row = buildAskActionRow();

    if (confidence === 'high') {
      await interaction.editReply({
        embeds: [buildHighConfidenceEmbed(question, results, importantTerms, openAIAnswer, citedResults)],
        components: [row],
      });
    } else if (confidence === 'none') {
      await interaction.editReply({
        embeds: [buildNoConfidenceEmbed(question, results)],
        components: [row],
      });
    } else {
      await interaction.editReply({
        embeds: [buildLowConfidenceEmbed(question, results)],
        components: [row],
      });
    }

    const msg = await interaction.fetchReply();
    askContext.set(msg.id, { question, openAIAnswer: openAIAnswer || null });
  },
};
