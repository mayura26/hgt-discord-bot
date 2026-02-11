module.exports = {
  CHANNELS: {
    LANDING_SPOT: 'landing-spot',
  },
  ROLES: {
    STAFF: 'Admin',           // Mentioned in ticket messages; can be highest role
    TICKET_ACCESS: 'Support', // Role given access to ticket channels; must be below the bot's role
    NEW: 'New',
  },
  CUSTOM_IDS: {
    BOOK_TICKET_BUTTON: 'book-ticket',
    CLOSE_TICKET_BUTTON: 'close-ticket',
  },
  COLORS: {
    PRIMARY: 0x2b65ec,
    SUCCESS: 0x57f287,
  },
  URLS: {
    PORTAL: 'https://portal.holygrailtrading.io/',
    GETTING_STARTED: 'https://portal.holygrailtrading.io/support/getting-started',
    BOT_SETUP: 'https://portal.holygrailtrading.io/support/bot-configuration',
    TRADING_STRATEGIES: 'https://portal.holygrailtrading.io/support/trading-strategies',
  },
  TICKET_CATEGORY_NAME: 'Tickets',
};
