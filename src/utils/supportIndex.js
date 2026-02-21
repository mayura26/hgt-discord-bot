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

const STOPWORDS = new Set([
  'how','do','i','to','the','a','is','are','what','can','my','me','about',
  'in','for','of','and','or','it','on','at','an','with','this','that','get',
  'use','using','does','will','should','would','could','need','want',
]);

/**
 * Strip stopwords from a query and return meaningful lowercase terms.
 * @param {string} query
 * @returns {string[]}
 */
function extractImportantTerms(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Find the sentence(s) containing the most query terms and return a snippet.
 * Falls back to truncateSnippet if no terms are provided.
 * @param {string} content
 * @param {string[]} terms
 * @param {number} max
 * @returns {string}
 */
function extractRelevantSnippet(content, terms, max = 300) {
  if (!content) return '';
  if (!terms.length || content.length <= max) return truncateSnippet(content, max);

  const sentences = content.split(/(?<=[.!?])\s+/);
  let best = { score: -1, index: 0 };
  const lower = terms.map(t => t.toLowerCase());

  sentences.forEach((s, i) => {
    const sl = s.toLowerCase();
    const score = lower.filter(t => sl.includes(t)).length;
    if (score > best.score) best = { score, index: i };
  });

  let snippet = sentences[best.index].trim();
  if (best.index + 1 < sentences.length && snippet.length < max * 0.6) {
    snippet += ' ' + sentences[best.index + 1].trim();
  }

  return truncateSnippet(snippet, max);
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
 * @returns {{ results: object[], confidence: 'high'|'low', importantTerms: string[] }}
 */
function searchIndexes(query) {
  const threshold = config.supportConfidenceThreshold;
  const importantTerms = extractImportantTerms(query);
  const combined = [];

  for (const sourceKey of ['public', 'portal']) {
    const { index } = _state[sourceKey];
    if (!index) continue;

    const hits = index.search(query, { limit: 5 });
    for (const hit of hits) combined.push({ ...hit, _source: sourceKey });
  }

  // De-duplicate by id — keep higher-scored copy
  const seen = new Map();
  for (const hit of combined) {
    const existing = seen.get(hit.id);
    if (!existing || hit.score > existing.score) seen.set(hit.id, hit);
  }

  let results = Array.from(seen.values());

  // Compute term-overlap adjusted score
  for (const r of results) {
    const text = (r.title + ' ' + (r.tags || '') + ' ' + r.content).toLowerCase();
    const matched = importantTerms.length
      ? importantTerms.filter(t => text.includes(t)).length
      : 0;
    r._overlap = importantTerms.length ? matched / importantTerms.length : 1;
    r._adjustedScore = r.score * r._overlap;
  }

  // Filter out zero-overlap results when we have 2+ important terms
  if (importantTerms.length >= 2) {
    results = results.filter(r => r._overlap > 0);
  }

  results.sort((a, b) => b._adjustedScore - a._adjustedScore);

  // Portal preference: if #2 is portal + Support/Setup category + adj score ≥ 80% of #1, promote
  if (results.length >= 2) {
    const [top, second] = results;
    if (
      second._source === 'portal' &&
      /support|setup/i.test(second.category) &&
      second._adjustedScore >= top._adjustedScore * 0.8
    ) {
      results = [second, top, ...results.slice(2)];
    }
  }

  const topScore = results.length ? results[0]._adjustedScore : 0;
  const strongCount = results.filter(r => r._adjustedScore >= threshold * 0.6).length;
  const confidence = topScore >= threshold && strongCount >= 2 ? 'high' : 'low';

  return { results, confidence, importantTerms };
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
 * @param {string[]} importantTerms
 * @returns {EmbedBuilder}
 */
function buildHighConfidenceEmbed(question, results, importantTerms = []) {
  const top = results.slice(0, 2);

  // Deduplicate link candidates by URL
  const linkResults = [];
  const seenUrls = new Set();
  for (const r of results) {
    if (!seenUrls.has(r.url)) {
      seenUrls.add(r.url);
      linkResults.push(r);
    }
    if (linkResults.length === 3) break;
  }

  let description = '';

  for (const result of top) {
    const snippet = extractRelevantSnippet(result.content, importantTerms);
    description += `**${result.title}**\n${snippet}\n\n`;
  }

  if (linkResults.length > 0) {
    description += '**Relevant Links**\n';
    for (const r of linkResults) {
      description += `• [${r.title}](${r.url})\n`;
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
  // Deduplicate link candidates by URL
  const linkResults = [];
  const seenUrls = new Set();
  for (const r of results) {
    if (!seenUrls.has(r.url)) {
      seenUrls.add(r.url);
      linkResults.push(r);
    }
    if (linkResults.length === 3) break;
  }

  let description =
    "I wasn't able to find a precise match for your question. Could you provide more detail? " +
    'For example, mention the specific feature, platform, or step you\'re having trouble with.\n\n';

  if (linkResults.length > 0) {
    description += '**Related Resources**\n';
    for (const r of linkResults) {
      description += `• [${r.title}](${r.url})\n`;
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
