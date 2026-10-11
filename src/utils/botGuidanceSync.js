const { ChannelType } = require('discord.js');
const config = require('../config');
const { CHANNELS } = require('../constants');

const INDEXED_CHANNEL_NAMES = [CHANNELS.BOT_GUIDANCE, CHANNELS.GETTING_STARTED];
const MAX_MESSAGES = 500;
const MAX_ARCHIVED_PAGES = 10;

/** parent channel id → channel name */
const trackedChannels = new Map();
/** discord message id → note */
const notes = new Map();
let notesListener = null;

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

function jumpUrl(message) {
  const guildId = message.guildId || config.guildId;
  return `https://discord.com/channels/${guildId}/${message.channelId}/${message.id}`;
}

function noteFromMessage(message, meta) {
  const content = flattenMessage(message);
  if (!content) return null;
  return {
    id: message.id,
    channelId: meta.parentChannelId,
    channelName: meta.channelName,
    authorName: message.author?.username || 'unknown',
    content,
    discordCreatedAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    url: jumpUrl(message),
  };
}

function portalNote(note) {
  return {
    id: note.id,
    channelId: note.channelId,
    authorName: note.authorName,
    content: note.content,
    discordCreatedAt: note.discordCreatedAt,
    editedAt: note.editedAt,
  };
}

function notifyNotesChanged() {
  if (typeof notesListener === 'function') notesListener(getChannelNotes());
}

function replaceChannelNotes(channelName, nextNotes) {
  for (const [id, note] of notes) {
    if (note.channelName === channelName) notes.delete(id);
  }
  for (const note of nextNotes) notes.set(note.id, note);
}

function setNotesListener(listener) {
  notesListener = listener;
}

function getChannelNotes() {
  return [...notes.values()];
}

async function postGuidance(body) {
  if (!config.portalBaseUrl || !config.botGuidanceSyncSecret) {
    console.warn('[BotGuidance] PORTAL_BASE_URL or BOT_GUIDANCE_SYNC_SECRET is missing; skip sync.');
    return false;
  }

  const url = `${config.portalBaseUrl.replace(/\/$/, '')}/api/internal/bot-guidance`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.botGuidanceSyncSecret}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[BotGuidance] sync failed', err.message);
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('[BotGuidance] sync failed', response.status, text.slice(0, 300));
    return false;
  }
  return true;
}

async function collectForumNotes(channel, meta) {
  const threads = [...(await channel.threads.fetchActive()).threads.values()];
  const seen = new Set(threads.map((thread) => thread.id));

  let before;
  for (let page = 0; page < MAX_ARCHIVED_PAGES; page += 1) {
    const archived = await channel.threads.fetchArchived({
      limit: 100,
      ...(before ? { before } : {}),
    });
    const batch = [...archived.threads.values()];
    if (batch.length === 0) break;
    for (const thread of batch) {
      if (seen.has(thread.id)) continue;
      seen.add(thread.id);
      threads.push(thread);
    }
    if (!archived.hasMore) break;
    const oldest = batch[batch.length - 1];
    const archivedAt = oldest?.archivedAt;
    if (!archivedAt) break;
    if (before && archivedAt.getTime() === before.getTime()) break;
    before = archivedAt;
  }

  const collected = [];
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
    const note = noteFromMessage(starter, meta);
    if (note) collected.push(note);
    else emptyBodies += 1;
  }
  return { notes: collected, sawMessages: threads.length > 0, emptyBodies };
}

async function collectTextNotes(channel, meta) {
  const collected = [];
  let emptyBodies = 0;
  let before;
  let sawMessages = false;

  while (collected.length + emptyBodies < MAX_MESSAGES) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });
    if (fetched.size === 0) break;
    sawMessages = true;
    for (const message of fetched.values()) {
      const note = noteFromMessage(message, meta);
      if (note) collected.push(note);
      else emptyBodies += 1;
    }
    const oldest = fetched.last();
    if (!oldest || fetched.size < 100) break;
    if (oldest.id === before) break;
    before = oldest.id;
  }

  return { notes: collected, sawMessages, emptyBodies };
}

async function indexChannel(channel, channelName) {
  if (!channel) {
    console.warn(`[BotGuidance] #${channelName} was not found.`);
    return;
  }
  const isForum = channel.type === ChannelType.GuildForum;
  if (!isForum && !channel.isTextBased?.()) {
    console.warn(`[BotGuidance] #${channelName} is not a text or forum channel.`);
    return;
  }

  trackedChannels.set(channel.id, channelName);
  const meta = { parentChannelId: channel.id, channelName };
  const collected = isForum
    ? await collectForumNotes(channel, meta)
    : await collectTextNotes(channel, meta);

  if (collected.sawMessages && collected.notes.length === 0) {
    console.warn(`[BotGuidance] #${channelName} has messages but every body was empty. Enable the Message Content intent before syncing, so an empty read does not wipe stored notes.`);
    return;
  }

  replaceChannelNotes(channelName, collected.notes);

  if (channelName !== CHANNELS.BOT_GUIDANCE) {
    console.log(`[BotGuidance] Indexed ${collected.notes.length} notes from #${channelName}.`);
    return;
  }

  const ok = await postGuidance({
    action: 'replace',
    channelId: channel.id,
    messages: collected.notes.map(portalNote),
  });
  if (ok) {
    console.log(`[BotGuidance] Synced ${collected.notes.length} notes.`);
  }
}

async function syncGuidanceSnapshot(client) {
  const guild = await client.guilds.fetch(config.guildId);
  const channels = await guild.channels.fetch();

  for (const channelName of INDEXED_CHANNEL_NAMES) {
    const channel = channels.find((candidate) => candidate?.name === channelName) ?? null;
    await indexChannel(channel, channelName);
  }
}

async function resolveChannel(message) {
  let channel = message.channel;
  if (!channel || channel.partial) {
    channel = await message.client.channels.fetch(message.channelId).catch(() => null);
  }
  return channel;
}

async function locateIndexedChannel(message) {
  if (trackedChannels.has(message.channelId)) {
    return {
      parentChannelId: message.channelId,
      channelName: trackedChannels.get(message.channelId),
    };
  }

  const channel = await resolveChannel(message);
  if (!channel) return null;

  if (channel.parentId && trackedChannels.has(channel.parentId)) {
    return {
      parentChannelId: channel.parentId,
      channelName: trackedChannels.get(channel.parentId),
    };
  }

  const ownName = INDEXED_CHANNEL_NAMES.includes(channel.name) ? channel.name : null;
  if (ownName) {
    trackedChannels.set(channel.id, ownName);
    return { parentChannelId: channel.id, channelName: ownName };
  }

  if (!channel.parentId) return null;
  const parent = await message.client.channels.fetch(channel.parentId).catch(() => null);
  if (!parent || !INDEXED_CHANNEL_NAMES.includes(parent.name)) return null;
  trackedChannels.set(parent.id, parent.name);
  return { parentChannelId: parent.id, channelName: parent.name };
}

async function upsertFromMessage(message) {
  const located = await locateIndexedChannel(message);
  if (!located) return;

  let full = message;
  if (full.partial) {
    full = await full.fetch().catch(() => null);
    if (!full) return;
  }

  const note = noteFromMessage(full, located);
  if (!note) {
    const removed = notes.delete(full.id);
    if (removed) notifyNotesChanged();
    if (removed && located.channelName === CHANNELS.BOT_GUIDANCE) {
      await postGuidance({ action: 'delete', discordMessageId: full.id });
    }
    return;
  }

  notes.set(note.id, note);
  notifyNotesChanged();
  if (located.channelName === CHANNELS.BOT_GUIDANCE) {
    await postGuidance({ action: 'upsert', message: portalNote(note) });
  }
}

async function deleteMessage(message) {
  const located = await locateIndexedChannel(message);
  const existing = notes.get(message.id);
  if (!located && !existing) return;

  const channelName = located?.channelName || existing?.channelName;
  const removed = notes.delete(message.id);
  if (removed) notifyNotesChanged();
  if (channelName === CHANNELS.BOT_GUIDANCE) {
    await postGuidance({ action: 'delete', discordMessageId: message.id });
  }
}

module.exports = {
  syncGuidanceSnapshot,
  upsertFromMessage,
  deleteMessage,
  getChannelNotes,
  setNotesListener,
};
