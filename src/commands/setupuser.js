const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const {
  ROLES,
  PERSONAL_GUIDANCE_CATEGORY_NAME,
} = require('../constants');

// Discord channel names: 2-100 chars; only a-z, 0-9, hyphen, underscore.
function channelNameSlug(user) {
  const raw = (user.displayName || user.username || 'user').trim();
  let slug = raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length < 2) {
    slug = `${(user.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
  }
  return slug.slice(0, 100);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupuser')
    .setDescription('Set up a user as a customer (private channel + role).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('Customer to set up')
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName('role')
        .setDescription('Role to assign')
        .setRequired(true)
        .addChoices(
          { name: 'Trial', value: 'trial' },
          { name: 'Subscriber', value: 'subscriber' },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('user');
    const roleOption = interaction.options.getString('role');

    // Resolve category
    const category = guild.channels.cache.find(
      (ch) =>
        ch.name === PERSONAL_GUIDANCE_CATEGORY_NAME &&
        ch.type === ChannelType.GuildCategory,
    );
    if (!category) {
      return interaction.editReply({
        content: `Category "${PERSONAL_GUIDANCE_CATEGORY_NAME}" not found. Please create it first.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const channelName = channelNameSlug(user);
    const existingChannel = guild.channels.cache.find(
      (ch) =>
        ch.parentId === category.id &&
        ch.name === channelName &&
        ch.type === ChannelType.GuildText,
    );
    if (existingChannel) {
      return interaction.editReply({
        content: `A channel **#${channelName}** already exists under Personal Guidance for this user.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const botId = guild.members.me?.id ?? interaction.client.user.id;
    const staffRole = guild.roles.cache.find((r) => r.name === ROLES.TICKET_ACCESS);
    const permissionOverwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: botId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];
    const botHighestRole = guild.members.me?.roles?.highest;
    if (
      staffRole &&
      botHighestRole &&
      staffRole.position < botHighestRole.position
    ) {
      permissionOverwrites.push({
        id: staffRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    let channel;
    try {
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites,
      });
    } catch (err) {
      if (err.code === 50013) {
        return interaction.editReply({
          content:
            'The bot does not have permission to create channels. ' +
            'Ensure it has **Manage Channels** and that its role is **above** the Staff role.',
          flags: MessageFlags.Ephemeral,
        });
      }
      throw err;
    }

    // Step 2: assign role
    const roleName =
      roleOption === 'trial' ? ROLES.TRIAL : ROLES.SUBSCRIBER;
    const role = guild.roles.cache.find((r) => r.name === roleName);

    let member;
    try {
      member = await guild.members.fetch(user.id);
    } catch {
      return interaction.editReply({
        content: `Channel ${channel} was created, but **${user.tag}** is not in this server. Could not assign role.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!role) {
      return interaction.editReply({
        content: `Channel ${channel} was created, but role "${roleName}" was not found. Assign it manually.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    let roleError = null;
    try {
      await member.roles.add(role);
    } catch (err) {
      roleError = err;
    }

    if (roleError) {
      return interaction.editReply({
        content: `Channel ${channel} was created. Failed to assign role **${roleName}**: ${roleError.message}. Ensure the bot has **Manage Roles** and its role is above **${roleName}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.editReply({
      content: `Set up **${user.tag}** as customer: channel ${channel} created under Personal Guidance and role **${roleName}** assigned.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
