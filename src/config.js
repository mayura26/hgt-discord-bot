require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  dbPath: process.env.DB_PATH || null,
  publicIndexUrl: process.env.PUBLIC_INDEX_URL || 'https://holygrailtrading.io/support-index.json',
  portalIndexUrl: process.env.PORTAL_INDEX_URL || 'https://portal.holygrailtrading.io/support-index.json',
  supportConfidenceThreshold: parseFloat(process.env.SUPPORT_CONFIDENCE_THRESHOLD) || 5.0,
};
