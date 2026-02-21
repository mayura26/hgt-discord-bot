const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../constants');
const { addKnowledge } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-knowledge')
    .setDescription('Add a custom knowledge entry to the /ask knowledge base')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('topic')
        .setDescription('Short topic or title for this knowledge entry')
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption((opt) =>
      opt
        .setName('content')
        .setDescription('The knowledge content to inject into /ask answers')
        .setRequired(true)
        .setMaxLength(1500),
    ),

  async execute(interaction) {
    const topic = interaction.options.getString('topic');
    const content = interaction.options.getString('content');

    const entry = addKnowledge(topic, content, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle('Knowledge Entry Added')
      .setDescription(`**ID ${entry.id}** — ${entry.topic}\n\n${entry.content}`)
      .setFooter({ text: `Added by ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
