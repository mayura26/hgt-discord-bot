const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../constants');
const { getKnowledgeById, deleteKnowledge } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-knowledge')
    .setDescription('Delete a custom knowledge entry from the /ask knowledge base')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((opt) =>
      opt
        .setName('id')
        .setDescription('The ID of the knowledge entry to delete (use /show-knowledge to find IDs)')
        .setRequired(true),
    ),

  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const entry = getKnowledgeById(id);

    if (!entry) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Not Found')
        .setDescription(`No knowledge entry found with ID **${id}**.`);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    deleteKnowledge(id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Knowledge Entry Deleted')
      .setDescription(`Deleted **ID ${entry.id}** — ${entry.topic}`);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
