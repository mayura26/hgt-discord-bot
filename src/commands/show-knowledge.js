const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../constants');
const { getAllKnowledge } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show-knowledge')
    .setDescription('List all custom knowledge entries in the /ask knowledge base')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const entries = getAllKnowledge();

    if (!entries.length) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle('Custom Knowledge Base')
        .setDescription('No custom knowledge entries yet.');
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    let description = '';
    for (const e of entries) {
      const date = e.created_at.slice(0, 10);
      const preview = e.content.length > 150 ? e.content.slice(0, 150) + '…' : e.content;
      const line = `**ID ${e.id}** — ${e.topic}  *(${date})*\n${preview}\n\n`;
      if (description.length + line.length > 4000) break;
      description += line;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`Custom Knowledge Base (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})`)
      .setDescription(description.trim());

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
