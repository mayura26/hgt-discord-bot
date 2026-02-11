const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { ROLES, CUSTOM_IDS, COLORS, TICKET_CATEGORY_NAME } = require('../constants');

async function getOrCreateTicketCategory(guild) {
  let category = guild.channels.cache.find(
    (ch) =>
      ch.name === TICKET_CATEGORY_NAME && ch.type === ChannelType.GuildCategory,
  );
  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });
  }
  return category;
}

async function createTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const member = interaction.member;

  // Prevent duplicate open tickets
  const existingTicket = guild.channels.cache.find(
    (ch) => ch.name.startsWith('ticket-') && ch.topic === `Ticket for ${member.id}`,
  );
  if (existingTicket) {
    return interaction.editReply({
      content: `You already have an open ticket: ${existingTicket}. Please use that channel.`,
    });
  }

  const category = await getOrCreateTicketCategory(guild);
  const staffRole = guild.roles.cache.find((r) => r.name === ROLES.STAFF);
  // Role that gets channel access; must be below the bot (e.g. Support). Admins can have both Admin + this role.
  const ticketAccessRole = ROLES.TICKET_ACCESS
    ? guild.roles.cache.find((r) => r.name === ROLES.TICKET_ACCESS)
    : staffRole;

  const suffix = Math.random().toString(36).substring(2, 6);
  const channelName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${suffix}`;

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  // Only add a role to overwrites if it's below the bot (Discord hierarchy). Use TICKET_ACCESS role
  // (e.g. Support) so Admin can stay highest; give staff both Admin and Support.
  const botHighestRole = guild.members.me?.roles?.highest;
  const roleToAdd = ticketAccessRole || staffRole;
  if (roleToAdd && botHighestRole && roleToAdd.position < botHighestRole.position) {
    permissionOverwrites.push({
      id: roleToAdd.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let ticketChannel;
  try {
    ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Ticket for ${member.id}`,
      permissionOverwrites,
    });
  } catch (err) {
    if (err.code === 50013) {
      console.error('Ticket channel create failed (50013):', err.message);
      return interaction.editReply({
        content:
          'The bot does not have permission to create ticket channels. ' +
          'Please ensure the bot has **Manage Channels** and that its role is **above** the "' +
          (ROLES.TICKET_ACCESS || 'Staff') +
          '" role in Server Settings → Roles.',
      });
    }
    throw err;
  }

  const ticketEmbed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Support Ticket')
    .setDescription(
      `Hello ${member}! A staff member will be with you shortly.\n\n` +
        `Please describe what you need help with. When your issue is resolved, ` +
        `click the **Close Ticket** button below.`,
    )
    .setTimestamp()
    .setFooter({ text: 'Holy Grail Trading' });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.CLOSE_TICKET_BUTTON)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({
    content: staffRole
      ? `${staffRole} — New ticket from ${member}`
      : `New ticket from ${member}`,
    embeds: [ticketEmbed],
    components: [closeRow],
  });

  await interaction.editReply({
    content: `Your ticket has been created: ${ticketChannel}`,
  });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (!channel.name.startsWith('ticket-')) {
    return interaction.reply({
      content: 'This is not a ticket channel.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    content: 'This ticket will be closed and the channel deleted in 10 seconds...',
  });

  setTimeout(async () => {
    try {
      await channel.delete('Ticket closed');
    } catch (err) {
      console.error('Failed to delete ticket channel:', err);
    }
  }, 10_000);
}

module.exports = { createTicket, closeTicket };
