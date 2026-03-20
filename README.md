# Tech Briefing (Docusaurus)

Tech Briefing is a clean, blog-only Docusaurus site with a local feed-ingestion pipeline.

It is designed for this workflow:

1. Configure feed sources in `config/sources.json`.
2. Run ingest to fetch latest entries and generate markdown posts.
3. Build and deploy a static site from generated + curated content.

## Stack

- Docusaurus `3.9.2`
- Node.js `>=20`
- RSS/Atom parsing with `fast-xml-parser`

## Project Structure

```text
hutune-blog/
├── automation/
│   └── ingest-tech-feeds.mjs   # Ingest + summarize + generate posts
├── blog/
│   ├── auto/                   # Auto-generated posts
│   ├── authors.yml
│   └── tags.yml
├── config/
│   └── sources.json            # Source configuration
├── src/
│   ├── css/custom.css          # Clean theme customization
│   └── pages/about.mdx
└── docusaurus.config.ts
```

## Setup

```bash
cd hutune-blog
npm install
```

## Local Commands

```bash
npm run start              # Dev server
npm run ingest:dry         # Fetch and preview what would be generated
npm run ingest             # Generate posts into blog/auto
npm run build              # Build static site
npm run build:with-ingest  # Ingest then build
```

Optional flags:

```bash
npm run ingest -- --limit 5
npm run ingest:dry -- --limit 5
```

## Configure Sources

Edit `config/sources.json`:

- `enabled`: turn source on/off.
- `feedUrl`: RSS/Atom feed URL.
- `siteUrl`: homepage URL used for relative links.
- `tags`: tags attached to generated posts.
- `maxItemsPerRun`: per-source cap for one run.

Example:

```json
{
  "id": "example-source",
  "name": "Example",
  "enabled": true,
  "feedUrl": "https://example.com/rss.xml",
  "siteUrl": "https://example.com",
  "tags": ["source-digest"],
  "maxItemsPerRun": 2
}
```

## GitHub Automation

Scheduled ingestion workflow:

- `.github/workflows/tech-blog-ingest.yml`

Defaults:

- Runs every 6 hours via cron.
- Supports manual `workflow_dispatch` with `dry_run` and `limit`.
- Auto-commits generated files under `blog/auto` when changed.

## Notes on Content Compliance

- Respect each publisher's robots.txt and terms.
- Keep summaries short and link back to the original article.
- Avoid copying long verbatim content.
