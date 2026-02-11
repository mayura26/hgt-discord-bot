const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { ROLES, CUSTOM_IDS, COLORS, URLS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Simulates the welcome message for testing (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const member = interaction.member;

    const welcomeEmbed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle('Welcome to Holy Grail Trading!')
      .setDescription(
        `Hey ${member}, welcome aboard!\n\n` +
          `Holy Grail Trading provides automated trading solutions to help you ` +
          `navigate the markets. Get started by visiting our portal:\n` +
          `${URLS.PORTAL}\n\n` +
          `For more info on our system, visit our website: ${URLS.WEBSITE}\n\n` +
          `If you need help getting set up, use the **/onboarding** command for a step-by-step guide.\n\n` +
          `If you have questions or need help getting set up, click the button ` +
          `below to **book a ticket** and a staff member will assist you.`,
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: 'Holy Grail Trading' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.BOOK_TICKET_BUTTON)
        .setLabel('Book a Ticket')
        .setStyle(ButtonStyle.Primary),
    );

    const newRole = interaction.guild.roles.cache.find(
      (r) => r.name === ROLES.NEW,
    );
    if (newRole) {
      await member.roles.add(newRole);
    } else {
      console.warn('Could not find "New" role.');
    }

    await interaction.reply({
      content: `${member}`,
      embeds: [welcomeEmbed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
