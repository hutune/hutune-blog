#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {XMLParser} from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const blogDir = path.join(projectRoot, 'blog');
const outputDir = path.join(blogDir, 'auto');
const sourceConfigPath = path.join(projectRoot, 'config', 'sources.json');

const cli = parseCliArgs(process.argv.slice(2));
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  parseTagValue: false,
  trimValues: true,
});

async function main() {
  const config = await readJson(sourceConfigPath);
  const defaults = config.defaults ?? {};
  const sources = (config.sources ?? []).filter((source) => source.enabled !== false);

  if (sources.length === 0) {
    console.log('No enabled sources found in config/sources.json');
    return;
  }

  await fs.mkdir(outputDir, {recursive: true});

  const existingSourceUrls = await collectExistingSourceUrls(blogDir);
  const seenInRun = new Set();

  let createdCount = 0;
  let skippedCount = 0;
  let failedSources = 0;

  for (const source of sources) {
    if (createdCount >= cli.limit) {
      break;
    }

    const maxItemsPerRun = numberOrDefault(source.maxItemsPerRun, defaults.maxItemsPerRun, 3);
    const requestTimeoutMs = numberOrDefault(source.requestTimeoutMs, defaults.requestTimeoutMs, 15000);
    const requestRetries = numberOrDefault(source.requestRetries, defaults.requestRetries, 2);
    const requestRetryDelayMs = numberOrDefault(
      source.requestRetryDelayMs,
      defaults.requestRetryDelayMs,
      1200,
    );
    const userAgent =
      source.userAgent ||
      defaults.userAgent ||
      'TechBriefingBot/1.0 (+https://mazhnguyen.github.io/hutune-blog/about)';

    try {
      const xml = await fetchFeedWithRetry({
        url: source.feedUrl,
        timeoutMs: requestTimeoutMs,
        userAgent,
        retries: requestRetries,
        retryDelayMs: requestRetryDelayMs,
        sourceId: source.id,
      });
      const items = normalizeFeedItems(parser.parse(xml), source);

      if (items.length === 0) {
        console.log(`[${source.id}] No items found.`);
        continue;
      }

      const candidates = items
        .sort((a, b) => b.publishedAtMs - a.publishedAtMs)
        .slice(0, maxItemsPerRun);

      for (const item of candidates) {
        if (createdCount >= cli.limit) {
          break;
        }

        if (!item.url) {
          skippedCount += 1;
          continue;
        }

        if (existingSourceUrls.has(item.url) || seenInRun.has(item.url)) {
          skippedCount += 1;
          continue;
        }

        const markdown = renderPostMarkdown(source, item);
        const fileName = buildFileName(item);
        const filePath = path.join(outputDir, fileName);

        if (cli.dryRun) {
          console.log(`[DRY] ${source.id} -> ${fileName}`);
        } else {
          await fs.writeFile(filePath, markdown, 'utf8');
          console.log(`[WRITE] ${source.id} -> ${path.relative(projectRoot, filePath)}`);
        }

        existingSourceUrls.add(item.url);
        seenInRun.add(item.url);
        createdCount += 1;
      }
    } catch (error) {
      failedSources += 1;
      console.error(`[${source.id}] Failed: ${error.message}`);
    }
  }

  console.log('---');
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed sources: ${failedSources}`);
}

function parseCliArgs(args) {
  const output = {
    dryRun: false,
    limit: Number.POSITIVE_INFINITY,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--dry-run') {
      output.dryRun = true;
      continue;
    }

    if (arg === '--limit') {
      const value = Number(args[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        output.limit = value;
      }
      i += 1;
    }
  }

  return output;
}

function numberOrDefault(primary, fallback, hardDefault) {
  if (Number.isFinite(Number(primary))) {
    return Number(primary);
  }
  if (Number.isFinite(Number(fallback))) {
    return Number(fallback);
  }
  return hardDefault;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function fetchFeed(url, timeoutMs, userAgent) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'user-agent': userAgent,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFeedWithRetry({url, timeoutMs, userAgent, retries, retryDelayMs, sourceId}) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchFeed(url, timeoutMs, userAgent);
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !isRetryableError(error)) {
        break;
      }

      const delayMs = retryDelayMs * 2 ** attempt;
      console.warn(
        `[${sourceId}] Fetch failed (attempt ${attempt + 1}/${retries + 1}): ${error.message}. Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error('Unknown fetch failure');
}

function isRetryableError(error) {
  const status = Number(error?.status);
  if (Number.isFinite(status)) {
    return status === 408 || status === 429 || status >= 500;
  }

  const message = String(error?.message ?? '').toLowerCase();
  if (message.includes('abort')) {
    return true;
  }

  return message.includes('network') || message.includes('fetch');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFeedItems(parsedFeed, source) {
  if (parsedFeed?.rss?.channel) {
    const channel = parsedFeed.rss.channel;
    const rawItems = toArray(channel.item);
    return rawItems
      .map((item) => normalizeRssItem(item, source))
      .filter((item) => Boolean(item.title) && Boolean(item.url));
  }

  if (parsedFeed?.feed) {
    const rawItems = toArray(parsedFeed.feed.entry);
    return rawItems
      .map((item) => normalizeAtomEntry(item, source))
      .filter((item) => Boolean(item.title) && Boolean(item.url));
  }

  return [];
}

function normalizeRssItem(item, source) {
  const title = cleanText(firstText(item.title));
  const url = normalizeUrl(extractRssLink(item), source.siteUrl);
  const publishedAt = toIsoDate(item.pubDate || item.published || item.updated);
  const author = cleanText(firstText(item['dc:creator'] || item.creator || item.author));

  const rawDescription = firstText(
    item.description || item.summary || item['content:encoded'] || item.content,
  );

  const normalizedDescription = cleanText(stripHtml(rawDescription));

  return {
    title,
    url,
    sourceAuthor: author,
    publishedAt,
    publishedAtMs: publishedAt ? Date.parse(publishedAt) : 0,
    summary: summarizeText(normalizedDescription, title),
    shortDescription: shortDescription(normalizedDescription, title),
  };
}

function normalizeAtomEntry(item, source) {
  const title = cleanText(firstText(item.title));
  const url = normalizeUrl(extractAtomLink(item.link), source.siteUrl);
  const publishedAt = toIsoDate(item.published || item.updated || item.pubDate);
  const authorName = cleanText(firstText(item?.author?.name || item.author));

  const rawDescription = firstText(item.summary || item.content || item.description);
  const normalizedDescription = cleanText(stripHtml(rawDescription));

  return {
    title,
    url,
    sourceAuthor: authorName,
    publishedAt,
    publishedAtMs: publishedAt ? Date.parse(publishedAt) : 0,
    summary: summarizeText(normalizedDescription, title),
    shortDescription: shortDescription(normalizedDescription, title),
  };
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function firstText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return firstText(value[0]);
  }

  if (typeof value === 'object') {
    if (typeof value.text === 'string') {
      return value.text;
    }

    if (typeof value['#text'] === 'string') {
      return value['#text'];
    }

    const firstKey = Object.keys(value)[0];
    if (firstKey) {
      return firstText(value[firstKey]);
    }
  }

  return '';
}

function extractRssLink(item) {
  const link = item?.link;

  if (typeof link === 'string') {
    return link;
  }

  if (Array.isArray(link)) {
    return extractRssLink({link: link[0]});
  }

  if (link && typeof link === 'object') {
    if (typeof link.href === 'string') {
      return link.href;
    }
    if (typeof link.text === 'string') {
      return link.text;
    }
    if (typeof link['#text'] === 'string') {
      return link['#text'];
    }
  }

  return '';
}

function extractAtomLink(linkValue) {
  const links = toArray(linkValue);

  for (const link of links) {
    if (typeof link === 'string' && link.trim()) {
      return link.trim();
    }

    if (link && typeof link === 'object') {
      if (link.rel === 'alternate' && link.href) {
        return String(link.href);
      }
      if (link.href) {
        return String(link.href);
      }
    }
  }

  return '';
}

function normalizeUrl(url, siteUrl) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  if (value.startsWith('/')) {
    if (!siteUrl) {
      return value;
    }
    return new URL(value, siteUrl).toString();
  }

  return value;
}

function toIsoDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  return formatDateForFrontmatter(new Date(timestamp));
}

function stripHtml(input) {
  if (!input) {
    return '';
  }

  return decodeHtmlEntities(
    String(input)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function decodeHtmlEntities(input) {
  if (!input) {
    return '';
  }

  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8230;/gi, '...')
    .replace(/&hellip;/gi, '...')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x27;/gi, "'");
}

function cleanText(input) {
  return String(input ?? '').replace(/\s+/g, ' ').trim();
}

function shortDescription(text, fallbackTitle) {
  const normalized = cleanText(text || fallbackTitle || '');
  if (!normalized) {
    return 'Auto-generated summary from a configured feed source.';
  }

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157)}...`;
}

function summarizeText(text, fallbackTitle) {
  const normalized = cleanText(text);

  if (!normalized) {
    return [
      `No long summary available in the feed. Read the original article: ${fallbackTitle}.`,
    ];
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);

  const selected = [];
  let totalLength = 0;

  for (const sentence of sentences) {
    if (selected.length >= 3) {
      break;
    }

    if (totalLength + sentence.length > 420) {
      break;
    }

    selected.push(sentence);
    totalLength += sentence.length;
  }

  if (selected.length > 0) {
    return selected;
  }

  return [normalized.slice(0, 220)];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function yamlQuote(value) {
  return JSON.stringify(String(value ?? ''));
}

function buildFileName(item) {
  const safeDate = item.publishedAt ? item.publishedAt.slice(0, 10) : todayIsoDate();
  const safeSlug = slugify(item.title) || `feed-${hashText(item.url).slice(0, 8)}`;
  const suffix = hashText(item.url).slice(0, 6);
  return `${safeDate}-${safeSlug}-${suffix}.md`;
}

function hashText(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateForFrontmatter(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const utcWithoutMs = date.toISOString().replace(/\.\d{3}Z$/, '');
  return `${utcWithoutMs}+00:00`;
}

function renderPostMarkdown(source, item) {
  const tags = uniqueTags([
    'source-digest',
    'ai-summary',
    'automation',
    ...(source.tags ?? []),
  ]);

  const publishedDateDisplay = item.publishedAt
    ? new Date(item.publishedAt).toISOString()
    : 'N/A';

  const frontmatter = [
    '---',
    `title: ${yamlQuote(item.title)}`,
    'authors: [bot]',
    `tags: [${tags.map(yamlQuote).join(', ')}]`,
    `date: ${item.publishedAt || formatDateForFrontmatter(new Date())}`,
    `description: ${yamlQuote(item.shortDescription)}`,
    `sourceName: ${yamlQuote(source.name)}`,
    `sourceUrl: ${yamlQuote(item.url)}`,
    `sourceFeed: ${yamlQuote(source.feedUrl)}`,
    item.sourceAuthor ? `sourceAuthor: ${yamlQuote(item.sourceAuthor)}` : null,
    '---',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const summarySection = item.summary.map((line) => `- ${line}`).join('\n');

  return `${frontmatter}> This post is auto-generated from a configured feed source.\n\n## TL;DR\n\n${summarySection}\n\n## Why it matters\n\nThis update was selected from **${source.name}** because it matches your configured technology digest sources. Use the original article for full context and details.\n\n## Source\n\n- [Original article](${item.url})\n- Publisher: ${source.name}\n- Published: ${publishedDateDisplay}\n`;
}

function uniqueTags(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

async function collectExistingSourceUrls(rootDir) {
  const files = await walkMarkdownFiles(rootDir);
  const urls = new Set();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/^sourceUrl:\s*(.+)$/m);
    if (!match) {
      continue;
    }

    const url = cleanFrontmatterValue(match[1]);
    if (url) {
      urls.add(url);
    }
  }

  return urls;
}

function cleanFrontmatterValue(rawValue) {
  const trimmed = String(rawValue ?? '').trim();
  return trimmed.replace(/^['\"]|['\"]$/g, '').trim();
}

async function walkMarkdownFiles(startDir) {
  const stack = [startDir];
  const output = [];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = await fs.readdir(currentDir, {withFileTypes: true});

    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        output.push(absolute);
      }
    }
  }

  return output;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
