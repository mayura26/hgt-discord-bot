const { ChannelType } = require('discord.js');
const config = require('../config');
const { CHANNELS } = require('../constants');

let guidanceChannelId = null;

function flattenMessage(message) {
  const parts = [];
  if (typeof message.content === 'string' && message.content.trim()) {
    parts.push(message.content);
  }
  for (const embed of message.embeds ?? []) {
    const bits = [
      embed.title,
      embed.description,
      ...(embed.fields ?? []).map((field) => `${field.name}: ${field.value}`),
    ].filter((bit) => typeof bit === 'string' && bit.trim());
    if (bits.length > 0) parts.push(bits.join('\n'));
  }
  return parts.join('\n\n').trim();
}

function noteFromMessage(message, channelId) {
  const content = flattenMessage(message);
  if (!content) return null;
  return {
    id: message.id,
    channelId,
    authorName: message.author?.username || 'unknown',
    content,
    discordCreatedAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
  };
}

async function postGuidance(body) {
  if (!config.portalBaseUrl || !config.botGuidanceSyncSecret) {
    console.warn('[BotGuidance] PORTAL_BASE_URL or BOT_GUIDANCE_SYNC_SECRET is missing; skip sync.');
    return false;
  }

  const url = `${config.portalBaseUrl.replace(/\/$/, '')}/api/internal/bot-guidance`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.botGuidanceSyncSecret}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[BotGuidance] sync failed', response.status, text.slice(0, 300));
    return false;
  }
  return true;
}

async function findGuidanceChannel(client) {
  const guild = await client.guilds.fetch(config.guildId);
  const channels = await guild.channels.fetch();
  return channels.find((channel) => channel?.name === CHANNELS.BOT_GUIDANCE) ?? null;
}

async function collectForumNotes(channel) {
  const threads = [...(await channel.threads.fetchActive()).threads.values()];
  const archived = await channel.threads.fetchArchived({ limit: 100 });
  for (const thread of archived.threads.values()) threads.push(thread);

  const notes = [];
  let emptyBodies = 0;
  for (const thread of threads) {
    let starter = null;
    if (typeof thread.fetchStarterMessage === 'function') {
      starter = await thread.fetchStarterMessage().catch(() => null);
    }
    if (!starter) {
      starter = await thread.messages.fetch(thread.id).catch(() => null);
    }
    if (!starter) continue;
    const note = noteFromMessage(starter, channel.id);
    if (note) notes.push(note);
    else emptyBodies += 1;
  }
  return { notes, sawMessages: threads.length > 0, emptyBodies };
}

async function collectTextNotes(channel) {
  const fetched = await channel.messages.fetch({ limit: 100 });
  const notes = [];
  let emptyBodies = 0;
  for (const message of fetched.values()) {
    const note = noteFromMessage(message, channel.id);
    if (note) notes.push(note);
    else emptyBodies += 1;
  }
  return { notes, sawMessages: fetched.size > 0, emptyBodies };
}

async function syncGuidanceSnapshot(client) {
  const channel = await findGuidanceChannel(client);
  if (!channel) {
    console.warn(`[BotGuidance] #${CHANNELS.BOT_GUIDANCE} was not found.`);
    return;
  }
  const isForum = channel.type === ChannelType.GuildForum;
  if (!isForum && !channel.isTextBased?.()) {
    console.warn(`[BotGuidance] #${CHANNELS.BOT_GUIDANCE} is not a text or forum channel.`);
    return;
  }
  guidanceChannelId = channel.id;

  const collected = isForum
    ? await collectForumNotes(channel)
    : await collectTextNotes(channel);

  if (collected.sawMessages && collected.notes.length === 0) {
    console.warn('[BotGuidance] Channel has messages but every body was empty. Enable the Message Content intent before syncing, so an empty read does not wipe stored notes.');
    return;
  }

  const ok = await postGuidance({
    action: 'replace',
    channelId: channel.id,
    messages: collected.notes,
  });
  if (ok) {
    console.log(`[BotGuidance] Synced ${collected.notes.length} notes.`);
  }
}

async function messageInGuidance(message) {
  if (!guidanceChannelId) return false;
  if (message.channelId === guidanceChannelId) return true;

  let channel = message.channel;
  if (!channel || channel.partial) {
    channel = await message.client.channels.fetch(message.channelId).catch(() => null);
  }
  return channel?.parentId === guidanceChannelId;
}

async function upsertFromMessage(message) {
  if (!guidanceChannelId) return;
  if (!(await messageInGuidance(message))) return;

  let full = message;
  if (full.partial) {
    full = await full.fetch().catch(() => null);
    if (!full) return;
  }

  const note = noteFromMessage(full, guidanceChannelId);
  if (!note) return;
  await postGuidance({ action: 'upsert', message: note });
}

async function deleteMessage(message) {
  if (!(await messageInGuidance(message))) return;
  await postGuidance({ action: 'delete', discordMessageId: message.id });
}

module.exports = {
  syncGuidanceSnapshot,
  upsertFromMessage,
  deleteMessage,
};
