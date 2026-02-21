const { Events } = require('discord.js');
const { CHANNELS, ROLES } = require('../constants');
const {
  getColdJoinWelcome,
  getSelfSelectWelcome,
} = require('../utils/welcomeMessages');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    const channel = member.guild.channels.cache.find(
      (ch) => ch.name === CHANNELS.LANDING_SPOT,
    );
    if (!channel) {
      console.warn('Could not find #landing-spot channel.');
      return;
    }

    const daRole = member.guild.roles.cache.find((r) => r.name === ROLES.DA);
    const hasDA = daRole && member.roles.cache.has(daRole.id);

    const { embed, components } = hasDA
      ? getColdJoinWelcome(member)
      : getSelfSelectWelcome(member);

    const newRole = member.guild.roles.cache.find(
      (r) => r.name === ROLES.NEW,
    );
    if (newRole) {
      await member.roles.add(newRole);
    } else {
      console.warn('Could not find "New" role.');
    }

    await channel.send({
      content: `${member}`,
      embeds: [embed],
      components,
    });
  },
};
