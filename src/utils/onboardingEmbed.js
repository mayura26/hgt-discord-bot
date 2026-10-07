const { EmbedBuilder } = require('discord.js');
const { CHANNELS, COLORS, URLS } = require('../constants');

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTimestamp()
    .setFooter({ text: 'Holy Grail Trading' });
}

function botGuidanceMention(guild) {
  const channel = guild?.channels?.cache?.find(
    (ch) => ch.name === CHANNELS.BOT_GUIDANCE && ch.isTextBased(),
  );
  return channel ? `${channel}` : `#${CHANNELS.BOT_GUIDANCE}`;
}

function getAccountSetupEmbed() {
  return baseEmbed()
    .setTitle('1 — Account Setup')
    .setDescription('Follow these steps to get started with Holy Grail Trading:')
    .addFields(
      {
        name: 'Step 1 — Sign Up',
        value: `Create your account on the portal:\n${URLS.PORTAL}`,
      },
      {
        name: 'Step 2 — User Management',
        value:
          'Follow the steps in **User Management** to sign the contract and ' +
          'complete the payment flow.',
      },
    );
}

function getVpsNtEmbed() {
  return baseEmbed()
    .setTitle('2 — VPS and NT Installation')
    .setDescription(
      'A VPS is optional, however we do recommend one, as it helps make the bots easier to use and manage. ' +
        'Both of us use VPS setups ourselves.\n\n' +
        `For VPS setup, follow the guide below:\n${URLS.VPS_SETUP}\n\n` +
        `For the installation of NinjaTrader, follow the guide below:\n${URLS.NT_CONFIGURATION}`,
    );
}

function getPluginEmbed() {
  return baseEmbed()
    .setTitle('3 — Configuring the Plugin')
    .setDescription(
      'After you have your NinjaTrader and VPS set up, the easiest way to get the plugin installed is to watch our video:\n' +
        `${URLS.PLUGIN_INSTALL_VIDEO}\n\n` +
        `If you prefer text, here is the guide:\n${URLS.SETUP_INSTALLER}`,
    );
}

function getSelectingBotsEmbed(guild) {
  const guidance = botGuidanceMention(guild);
  return baseEmbed()
    .setTitle('4 — Selecting Bots')
    .setDescription(
      `Check out the ${guidance} channel as a starting point to understand the current recommended bots. ` +
        'After you have read this, please reach out to the team, and we will offer some recommendations on what is best for your situation.\n\n' +
        'For adding the bots, follow the example in the video and use the bot configuration section to find further information for each bot:\n' +
        URLS.BOT_SETUP,
    );
}

/**
 * Returns the onboarding embeds in order, used by /onboarding and setupuser.
 * Each embed is sent as its own message.
 */
function getOnboardingEmbeds(guild) {
  return [
    getAccountSetupEmbed(),
    getVpsNtEmbed(),
    getPluginEmbed(),
    getSelectingBotsEmbed(guild),
  ];
}

module.exports = { getOnboardingEmbeds };
