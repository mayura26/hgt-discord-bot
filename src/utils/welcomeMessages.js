const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { CUSTOM_IDS, COLORS, URLS } = require('../constants');

/**
 * Returns embed and components for cold join (ad) welcome.
 * Low-pressure, no onboarding — lurk-friendly, /ask or book a ticket.
 */
function getColdJoinWelcome(member) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Welcome to Holy Grail Trading 👋')
    .setDescription(
      `Hey ${member}, glad you found us.\n\n` +
        `If you're coming from an ad, quick reassurance:\n` +
        `You don't need to install anything or talk to anyone right now.\n\n` +
        `Most people here start by just lurking and getting a feel for how things work. That's totally fine.\n\n` +
        `If you're curious, here are a few good places to explore at your own pace:\n\n` +
        `• **Backtests** – historical performance data: ${URLS.BACKTESTS}\n` +
        `• **Website** – more about us and our system: ${URLS.WEBSITE}\n` +
        `• #payout-profits – real trader payouts and results\n` +
        `• #announcements – latest bot updates and performance notes\n` +
        `• #general – open discussion and questions from the community\n\n` +
        `There's no rush and no pressure. Read, scroll, and see if this aligns with how you think about trading.\n\n` +
        `If you ever want help or clarity:\n` +
        `Just post a question in #general or use **/ask** — or click below to **book a ticket** if you'd prefer to talk to staff directly.`,
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

  return { embed, components: [row] };
}

/**
 * Returns embed and components for returning customer welcome.
 * "You're in the right place" — portal, /onboarding, book ticket.
 */
function getReturningCustomerWelcome(member) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Welcome back!')
    .setDescription(
      `Hey ${member}, great to see you here!\n\n` +
        `You're in the right place. Access your portal anytime:\n${URLS.PORTAL}\n\n` +
        `Use **/onboarding** for a step-by-step guide if you need a refresher.\n\n` +
        `Need help? Click below to **book a ticket** and a staff member will assist you.`,
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

  return { embed, components: [row] };
}

/**
 * Returns embed and components for PropHunt / organic Discord discovery welcome.
 * Focus on Discord flow, lurk-friendly — /ask or book a ticket. No /onboarding (customers only).
 */
function getPropHuntWelcome(member) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Welcome to Holy Grail Trading 👋')
    .setDescription(
      `Hey ${member}, welcome aboard!\n\n` +
        `Most people start by just lurking and getting a feel for how things work. That's totally fine.\n\n` +
        `Here are a few good places to explore at your own pace:\n\n` +
        `• **Backtests** – historical performance data: ${URLS.BACKTESTS}\n` +
        `• **Website** – more about us and our system: ${URLS.WEBSITE}\n` +
        `• #payout-profits – real trader payouts and results\n` +
        `• #announcements – latest bot updates and performance notes\n` +
        `• #general – open discussion and questions from the community\n\n` +
        `There's no rush. Read, scroll, and see if this aligns with how you think about trading.\n\n` +
        `If you want help or clarity:\n` +
        `Post a question in #general or use **/ask** — or click below to **book a ticket** to talk to staff directly.`,
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

  return { embed, components: [row] };
}

/**
 * Returns embed and components for self-select (non-DA) welcome.
 * Two buttons: "I'm already a customer" and "I found you on Discord / want to know more".
 */
function getSelfSelectWelcome(member) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Welcome to Holy Grail Trading!')
    .setDescription(
      `Hey ${member}, welcome aboard!\n\n` +
        `How did you find us? Click a button below so we can point you in the right direction.`,
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: 'Holy Grail Trading' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.WELCOME_CUSTOMER)
      .setLabel("I'm already a customer")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.WELCOME_PROP)
      .setLabel('Found you on Discord / want to know more')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embed, components: [row] };
}

module.exports = {
  getColdJoinWelcome,
  getReturningCustomerWelcome,
  getPropHuntWelcome,
  getSelfSelectWelcome,
};
