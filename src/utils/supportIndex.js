'use strict';

const MiniSearch = require('minisearch');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { COLORS } = require('../constants');

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

const _state = {
  public:  { etag: null, items: [], index: null },
  portal:  { etag: null, items: [], index: null },
  refreshTimer: null,
};

// ---------------------------------------------------------------------------
// Source configuration
// ---------------------------------------------------------------------------

const SOURCE_CONFIG = {
  public: {
    url:      config.publicIndexUrl,
    arrayKey: 'items',
    baseUrl:  'https://holygrailtrading.io',
  },
  portal: {
    url:      config.portalIndexUrl,
    arrayKey: 'chunks',
    baseUrl:  'https://portal.holygrailtrading.io',
  },
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build a fresh MiniSearch instance with the project's standard options.
 * @returns {MiniSearch}
 */
function buildIndex() {
  return new MiniSearch({
    idField: 'id',
    fields: ['title', 'tags', 'content', 'category'],
    storeFields: ['id', 'title', 'category', 'content', 'url'],
    searchOptions: {
      boost: { title: 3, tags: 2, content: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

/**
 * Normalize a raw item from the JSON index into a flat, indexable document.
 * @param {object} rawItem
 * @param {string} baseUrl
 * @returns {object}
 */
function normalizeItem(rawItem, baseUrl) {
  const rawUrl = rawItem.url || '';
  const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;

  const tags = Array.isArray(rawItem.tags) ? rawItem.tags.join(' ') : (rawItem.tags || '');

  return {
    id:       rawItem.id || rawItem.slug || rawUrl,
    title:    rawItem.title    || '',
    category: rawItem.category || '',
    tags,
    content:  rawItem.content  || rawItem.excerpt || rawItem.body || '',
    url:      absoluteUrl,
  };
}

/**
 * Trim content to a readable snippet, preferring sentence boundaries.
 * @param {string} content
 * @param {number} max
 * @returns {string}
 */
function truncateSnippet(content, max = 300) {
  if (!content || content.length <= max) return content || '';

  // Try sentence boundary
  const sentenceEnd = content.lastIndexOf('. ', max);
  if (sentenceEnd > max * 0.6) return content.slice(0, sentenceEnd + 1) + '…';

  // Try word boundary
  const wordEnd = content.lastIndexOf(' ', max);
  if (wordEnd > max * 0.6) return content.slice(0, wordEnd) + '…';

  // Hard cut
  return content.slice(0, max) + '…';
}

// ---------------------------------------------------------------------------
// Core fetch logic
// ---------------------------------------------------------------------------

/**
 * Fetch (or conditionally refresh) one source's index.
 * @param {'public'|'portal'} sourceKey
 */
async function fetchSource(sourceKey) {
  const { url, arrayKey, baseUrl } = SOURCE_CONFIG[sourceKey];
  const state = _state[sourceKey];

  const headers = { Accept: 'application/json' };
  if (state.etag) headers['If-None-Match'] = state.etag;

  let response;
  try {
    response = await fetch(url, { headers });
  } catch (err) {
    console.error(`[SupportIndex] Network error fetching ${sourceKey} index:`, err.message);
    return;
  }

  if (response.status === 304) {
    console.log(`[SupportIndex] ${sourceKey} index unchanged (304).`);
    return;
  }

  if (!response.ok) {
    console.error(`[SupportIndex] HTTP ${response.status} fetching ${sourceKey} index from ${url}`);
    return;
  }

  // Capture ETag for next conditional request
  const newEtag = response.headers.get('etag');
  if (newEtag) state.etag = newEtag;

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error(`[SupportIndex] Failed to parse JSON for ${sourceKey}:`, err.message);
    return;
  }

  const rawItems = data[arrayKey];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    console.error(`[SupportIndex] ${sourceKey} index: expected non-empty array at key "${arrayKey}"`);
    return;
  }

  const items = rawItems.map(item => normalizeItem(item, baseUrl));

  const index = buildIndex();
  index.addAll(items);

  state.items = items;
  state.index = index;

  console.log(`[SupportIndex] ${sourceKey} index loaded: ${items.length} items.`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise both support indexes and schedule periodic refreshes.
 * Idempotent — safe to call multiple times.
 */
async function initSupportIndexes() {
  if (_state.refreshTimer !== null) return;

  await Promise.allSettled([fetchSource('public'), fetchSource('portal')]);

  const timer = setInterval(async () => {
    await Promise.allSettled([fetchSource('public'), fetchSource('portal')]);
  }, 30 * 60 * 1000);

  if (timer.unref) timer.unref();
  _state.refreshTimer = timer;
}

/**
 * True if at least one source index has been loaded successfully.
 * @returns {boolean}
 */
function isAvailable() {
  return _state.public.index !== null || _state.portal.index !== null;
}

/**
 * Search all loaded indexes and return merged, ranked results.
 * @param {string} query
 * @returns {{ results: object[], confidence: 'high'|'low' }}
 */
function searchIndexes(query) {
  const threshold = config.supportConfidenceThreshold;
  const combined = [];

  for (const sourceKey of ['public', 'portal']) {
    const { index } = _state[sourceKey];
    if (!index) continue;

    const hits = index.search(query, { limit: 5 });
    for (const hit of hits) {
      combined.push({ ...hit, _source: sourceKey });
    }
  }

  // De-duplicate by id — keep higher-scored copy
  const seen = new Map();
  for (const hit of combined) {
    const existing = seen.get(hit.id);
    if (!existing || hit.score > existing.score) seen.set(hit.id, hit);
  }

  let results = Array.from(seen.values()).sort((a, b) => b.score - a.score);

  // Portal preference: if #2 is portal + Support/Setup category + score ≥ 80% of #1, swap
  if (results.length >= 2) {
    const top = results[0];
    const second = results[1];
    if (
      second._source === 'portal' &&
      /support|setup/i.test(second.category) &&
      second.score >= top.score * 0.8
    ) {
      results = [second, top, ...results.slice(2)];
    }
  }

  const topScore = results.length > 0 ? results[0].score : 0;
  const strongHitsCount = results.filter(r => r.score >= threshold * 0.6).length;
  const confidence = topScore >= threshold && strongHitsCount >= 2 ? 'high' : 'low';

  return { results, confidence };
}

/**
 * Detect queries that are asking for financial/trading advice.
 * @param {string} query
 * @returns {boolean}
 */
function isFinancialAdviceQuery(query) {
  const patterns = [
    /should i trade/i,
    /what should i (buy|sell)/i,
    /trade call/i,
    /\bsignal\b/i,
    /financial advice/i,
    /\bshould i invest\b/i,
    /when (to|should) (buy|sell|trade)/i,
  ];
  return patterns.some(p => p.test(query));
}

/**
 * Find the URL of a disclaimer / financial advice / terms page.
 * @returns {string|null}
 */
function findDisclaimerUrl() {
  for (const sourceKey of ['public', 'portal']) {
    const { items } = _state[sourceKey];
    const match = items.find(item =>
      /disclaimer|financial.advice|terms/i.test(item.title) ||
      /disclaimer|financial.advice|terms/i.test(item.category),
    );
    if (match) return match.url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Embed builders
// ---------------------------------------------------------------------------

const FOOTER = { text: 'Holy Grail Trading Support' };
const MAX_DESCRIPTION = 4000;

function capDescription(text) {
  if (text.length <= MAX_DESCRIPTION) return text;
  return text.slice(0, MAX_DESCRIPTION - 1) + '…';
}

/**
 * Build a high-confidence answer embed showing snippets from top results.
 * @param {string} question
 * @param {object[]} results
 * @returns {EmbedBuilder}
 */
function buildHighConfidenceEmbed(question, results) {
  const top = results.slice(0, 2);
  const linkResults = results.slice(0, 3);

  let description = '';

  for (const result of top) {
    const snippet = truncateSnippet(result.content);
    description += `**${result.title}**\n${snippet}\n\n`;
  }

  if (linkResults.length > 0) {
    description += '**Relevant Links**\n';
    for (const result of linkResults) {
      description += `• [${result.title}](${result.url})\n`;
    }
  }

  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('Here\'s what I found')
    .setDescription(capDescription(description.trim()))
    .setFooter(FOOTER);
}

/**
 * Build a low-confidence embed asking for clarification.
 * @param {string} question
 * @param {object[]} results
 * @returns {EmbedBuilder}
 */
function buildLowConfidenceEmbed(question, results) {
  const linkResults = results.slice(0, 3);

  let description =
    "I wasn't able to find a precise match for your question. Could you provide more detail? " +
    'For example, mention the specific feature, platform, or step you\'re having trouble with.\n\n';

  if (linkResults.length > 0) {
    description += '**Related Resources**\n';
    for (const result of linkResults) {
      description += `• [${result.title}](${result.url})\n`;
    }
  }

  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Can you tell me more?')
    .setDescription(capDescription(description.trim()))
    .setFooter(FOOTER);
}

/**
 * Build the financial advice refusal embed.
 * @param {string|null} disclaimerUrl
 * @returns {EmbedBuilder}
 */
function buildFinancialAdviceEmbed(disclaimerUrl) {
  let description =
    'Holy Grail Trading does not provide financial or investment advice. ' +
    'Our tools and resources are for educational and informational purposes only.\n\n' +
    'For questions about how to use the platform, indicators, or bot configuration, ' +
    'please use `/ask` with a more specific question about our features.';

  if (disclaimerUrl) {
    description += `\n\n[View our full disclaimer](${disclaimerUrl})`;
  }

  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('We Can\'t Provide Financial Advice')
    .setDescription(capDescription(description))
    .setFooter(FOOTER);
}

/**
 * Build the knowledge-base-unavailable fallback embed.
 * @returns {EmbedBuilder}
 */
function buildUnavailableEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle('Knowledge Base Unavailable')
    .setDescription(
      'The support knowledge base is currently unavailable. Please try again in a few minutes.\n\n' +
      'In the meantime, use `/support` to browse our support resources directly.',
    )
    .setFooter(FOOTER);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  initSupportIndexes,
  isAvailable,
  searchIndexes,
  isFinancialAdviceQuery,
  findDisclaimerUrl,
  buildHighConfidenceEmbed,
  buildLowConfidenceEmbed,
  buildFinancialAdviceEmbed,
  buildUnavailableEmbed,
};
