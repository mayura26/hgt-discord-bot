const GETTING_STARTED_URL = 'https://portal.holygrailtrading.io/support/getting-started';

module.exports = {
  CHANNELS: {
    LANDING_SPOT: 'landing-spot',
    GIVEAWAYS: 'giveaways',
    BOT_GUIDANCE: 'bot-guidance',
  },
  ROLES: {
    STAFF: 'Admin',           // Mentioned in ticket messages; can be highest role
    TICKET_ACCESS: 'Staff', // Role given access to ticket channels; must be below the bot's role
    DA: 'DA',                 // Cold join from ads; assigned by invite
    NEW: 'New',
    VERIFIED: 'Verified',
    TRIAL: 'Trial',
    SUBSCRIBER: 'Subscriber',
  },
  CUSTOM_IDS: {
    WELCOME_CUSTOMER: 'welcome-customer',
    WELCOME_PROP: 'welcome-prop',
    BOOK_TICKET_BUTTON: 'book-ticket',
    CLOSE_TICKET_BUTTON: 'close-ticket',
    GIVEAWAY_ENTER_BUTTON: 'giveaway-enter',
    ASK_FOLLOWUP_BUTTON: 'ask-followup',
    ASK_FOLLOWUP_MODAL:  'ask-followup-modal',
    ASK_FOLLOWUP_INPUT:  'ask-followup-input',
  },
  COLORS: {
    PRIMARY: 0x2b65ec,
    SUCCESS: 0x57f287,
    GOLD: 0xffd700,
  },
  URLS: {
    WEBSITE: 'https://holygrailtrading.io/',
    BACKTESTS: 'https://portal.holygrailtrading.io/backtests-public',
    PORTAL: 'https://portal.holygrailtrading.io/',
    GETTING_STARTED: GETTING_STARTED_URL,
    VPS_SETUP: `${GETTING_STARTED_URL}#vps-setup`,
    NT_CONFIGURATION: `${GETTING_STARTED_URL}#ninjatrader-configuration`,
    SETUP_INSTALLER: `${GETTING_STARTED_URL}#setup-installer`,
    PLUGIN_INSTALL_VIDEO: 'https://www.youtube.com/watch?v=GCgVpty7hcE',
    BOT_SETUP: 'https://portal.holygrailtrading.io/support/bot-configuration',
    TRADING_STRATEGIES: 'https://portal.holygrailtrading.io/support/trading-strategies',
    VIDEO_TUTORIALS: 'https://portal.holygrailtrading.io/support/video-tutorials',
  },
  TICKET_CATEGORY_NAME: 'Tickets',
  PERSONAL_GUIDANCE_CATEGORY_NAME: 'Personal Guidance',
};
