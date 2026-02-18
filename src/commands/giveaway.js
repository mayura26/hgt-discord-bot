const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { CHANNELS, CUSTOM_IDS, COLORS } = require('../constants');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start an automated giveaway with an Enter button')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('The giveaway message/prize description')
            .setRequired(true),
        )
        .addRoleOption((opt) =>
          opt.setName('role1').setDescription('Eligible role (optional)'),
        )
        .addRoleOption((opt) =>
          opt.setName('role2').setDescription('Eligible role (optional)'),
        )
        .addRoleOption((opt) =>
          opt.setName('role3').setDescription('Eligible role (optional)'),
        )
        .addRoleOption((opt) =>
          opt.setName('role4').setDescription('Eligible role (optional)'),
        )
        .addRoleOption((opt) =>
          opt.setName('role5').setDescription('Eligible role (optional)'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a manual giveaway (no channel post)')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Name of the giveaway')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('entries')
        .setDescription('Show current giveaway entries'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('adduser')
        .setDescription('Manually add a user to the active giveaway')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('The user to add')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End the active giveaway and draw a winner'),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      await handleStart(interaction);
    } else if (sub === 'create') {
      await handleCreate(interaction);
    } else if (sub === 'entries') {
      await handleEntries(interaction);
    } else if (sub === 'adduser') {
      await handleAddUser(interaction);
    } else if (sub === 'end') {
      await handleEnd(interaction);
    }
  },
};

async function handleStart(interaction) {
  const active = db.getActiveGiveaway();
  if (active) {
    return interaction.reply({
      content: `There is already an active giveaway: **${active.name}**. End it first with \`/giveaway end\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const message = interaction.options.getString('message');

  // Collect and deduplicate role options
  const roleIds = [];
  for (let i = 1; i <= 5; i++) {
    const role = interaction.options.getRole(`role${i}`);
    if (role && !roleIds.includes(role.id)) {
      roleIds.push(role.id);
    }
  }

  // Find the #giveaways channel
  const channel = interaction.guild.channels.cache.find(
    (ch) => ch.name === CHANNELS.GIVEAWAYS,
  );
  if (!channel) {
    return interaction.reply({
      content: `Could not find a **#${CHANNELS.GIVEAWAYS}** channel. Please create one first.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Build the giveaway embed
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('Giveaway!')
    .setDescription(message)
    .setFooter({ text: 'Click the button below to enter!' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.GIVEAWAY_ENTER_BUTTON)
      .setLabel('Enter Giveaway')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎉'),
  );

  // Post to Discord first, then save to DB
  const sent = await channel.send({ embeds: [embed], components: [row] });
  db.createGiveaway(message, roleIds.length > 0 ? roleIds : null, sent.id);

  await interaction.reply({
    content: `Giveaway started in ${channel}!`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCreate(interaction) {
  const active = db.getActiveGiveaway();
  if (active) {
    return interaction.reply({
      content: `There is already an active giveaway: **${active.name}**. End it first with \`/giveaway end\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const name = interaction.options.getString('name');
  db.createGiveaway(name, null, null);

  await interaction.reply({
    content: `Manual giveaway **${name}** created. Use \`/giveaway adduser\` to add entries.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEntries(interaction) {
  const active = db.getActiveGiveaway();
  if (!active) {
    return interaction.reply({
      content: 'There is no active giveaway.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const entries = db.getEntries(active.id);
  if (entries.length === 0) {
    return interaction.reply({
      content: `**${active.name}** has no entries yet.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  let list = entries
    .map((e, i) => `${i + 1}. <@${e.user_id}>`)
    .join('\n');

  // Truncate if too long for embed description (4096 char limit)
  if (list.length > 3900) {
    list = list.slice(0, 3900) + `\n\n... and more (${entries.length} total)`;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(`Entries for: ${active.name}`)
    .setDescription(list)
    .setFooter({ text: `${entries.length} total entries` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleAddUser(interaction) {
  const active = db.getActiveGiveaway();
  if (!active) {
    return interaction.reply({
      content: 'There is no active giveaway.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const user = interaction.options.getUser('user');
  const added = db.addEntry(active.id, user.id);

  if (added) {
    await interaction.reply({
      content: `${user} has been added to **${active.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: `${user} is already entered in **${active.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleEnd(interaction) {
  const active = db.getActiveGiveaway();
  if (!active) {
    return interaction.reply({
      content: 'There is no active giveaway to end.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const entries = db.getEntries(active.id);

  if (entries.length === 0) {
    db.endGiveaway(active.id, null);
    return interaction.editReply({
      content: `Giveaway **${active.name}** ended with no entries.`,
    });
  }

  // Filter by eligible roles if set
  let eligibleEntries = entries;
  const roleIds = active.eligible_role_ids
    ? JSON.parse(active.eligible_role_ids)
    : null;

  if (roleIds && roleIds.length > 0) {
    // Fetch all members to populate cache
    await interaction.guild.members.fetch();

    eligibleEntries = entries.filter((entry) => {
      const member = interaction.guild.members.cache.get(entry.user_id);
      if (!member) return false; // Member left server
      return roleIds.some((roleId) => member.roles.cache.has(roleId));
    });
  }

  if (eligibleEntries.length === 0) {
    db.endGiveaway(active.id, null);
    return interaction.editReply({
      content: `Giveaway **${active.name}** ended. There were ${entries.length} entries but no eligible winners.`,
    });
  }

  // Random pick
  const winner =
    eligibleEntries[Math.floor(Math.random() * eligibleEntries.length)];
  db.endGiveaway(active.id, winner.user_id);

  // Post winner announcement to #giveaways
  const channel = interaction.guild.channels.cache.find(
    (ch) => ch.name === CHANNELS.GIVEAWAYS,
  );

  const winnerEmbed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle('🏆 Giveaway Winner! 🏆')
    .setDescription(
      `🎊🎊🎊\n\nCongratulations to <@${winner.user_id}>!\n\n` +
        `**Prize:** ${active.name}`,
    )
    .setTimestamp()
    .setFooter({ text: 'Holy Grail Trading' });

  if (channel) {
    await channel.send({
      content: `🎉 <@${winner.user_id}>`,
      embeds: [winnerEmbed],
    });
  }

  await interaction.editReply({
    content: `Giveaway **${active.name}** ended! Winner: <@${winner.user_id}>`,
  });
}
