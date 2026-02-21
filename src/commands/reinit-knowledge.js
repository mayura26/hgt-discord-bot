'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../constants');
const { reinitSupportIndexes } = require('../utils/supportIndex');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reinit-knowledge')
    .setDescription('Reload the support indexes from remote sources (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { publicLoaded, publicCount, portalLoaded, portalCount } = await reinitSupportIndexes();

    const success = publicLoaded || portalLoaded;
    const embed = new EmbedBuilder()
      .setColor(success ? COLORS.SUCCESS : COLORS.PRIMARY)
      .setTitle(success ? 'Support Indexes Reloaded' : 'Reload Completed with Errors')
      .setDescription(
        `**Public:** ${publicLoaded ? `OK (${publicCount} items)` : 'Failed'}\n` +
        `**Portal:** ${portalLoaded ? `OK (${portalCount} items)` : 'Failed'}`,
      )
      .setFooter({ text: 'Holy Grail Trading Support' });

    await interaction.editReply({ embeds: [embed] });
  },
};
