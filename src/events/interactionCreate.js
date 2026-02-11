const { Events, MessageFlags } = require('discord.js');
const { CUSTOM_IDS } = require('../constants');
const ticketManager = require('../utils/ticketManager');

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
    }
  },
};
