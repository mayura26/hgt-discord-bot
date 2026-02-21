const { Events, MessageFlags, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { CUSTOM_IDS } = require('../constants');
const ticketManager = require('../utils/ticketManager');
const db = require('../utils/database');
const askContext = require('../utils/askContext');
const {
  answerFollowup,
  buildHighConfidenceEmbed,
  buildLowConfidenceEmbed,
  buildAskActionRow,
} = require('../utils/supportIndex');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName}.`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const reply = { content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    // Button interactions
    if (interaction.isButton()) {
      if (interaction.customId === CUSTOM_IDS.BOOK_TICKET_BUTTON) {
        await ticketManager.createTicket(interaction);
        return;
      }
      if (interaction.customId === CUSTOM_IDS.CLOSE_TICKET_BUTTON) {
        await ticketManager.closeTicket(interaction);
        return;
      }

      if (interaction.customId === CUSTOM_IDS.GIVEAWAY_ENTER_BUTTON) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const active = db.getActiveGiveaway();
        if (!active) {
          await interaction.editReply({ content: 'This giveaway has ended.' });
          return;
        }
        const added = db.addEntry(active.id, interaction.user.id);
        if (added) {
          await interaction.editReply({ content: 'You have been entered into the giveaway! Good luck! 🎉' });
        } else {
          await interaction.editReply({ content: 'You are already entered in this giveaway!' });
        }
        return;
      }

      if (interaction.customId === CUSTOM_IDS.ASK_FOLLOWUP_BUTTON) {
        const modal = new ModalBuilder()
          .setCustomId(`${CUSTOM_IDS.ASK_FOLLOWUP_MODAL}:${interaction.message.id}`)
          .setTitle('Ask a follow-up')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId(CUSTOM_IDS.ASK_FOLLOWUP_INPUT)
                .setLabel('Your follow-up question')
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(500)
                .setRequired(true),
            ),
          );
        await interaction.showModal(modal);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith(CUSTOM_IDS.ASK_FOLLOWUP_MODAL + ':')) {
        const messageId = interaction.customId.split(':')[1];
        const ctx = askContext.get(messageId);
        const followupQuestion = interaction.fields.getTextInputValue(CUSTOM_IDS.ASK_FOLLOWUP_INPUT).trim();

        await interaction.deferReply();

        const result = await answerFollowup(
          ctx?.question || '',
          ctx?.openAIAnswer || null,
          followupQuestion,
        );

        const { openAIAnswer, citedResults, results } = result || {};
        const row = buildAskActionRow();

        let embed;
        if (openAIAnswer) {
          embed = buildHighConfidenceEmbed(followupQuestion, results || [], [], openAIAnswer, citedResults);
        } else {
          embed = buildLowConfidenceEmbed(followupQuestion, results || []);
        }

        await interaction.editReply({ embeds: [embed], components: [row] });

        const reply = await interaction.fetchReply();
        askContext.set(reply.id, { question: followupQuestion, openAIAnswer: openAIAnswer || null });
        return;
      }
    }
  },
};
