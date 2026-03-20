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
git submodule update --init --recursive
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
- `requestTimeoutMs`: timeout for each feed request.
- `requestRetries`: number of retries for retryable failures.
- `requestRetryDelayMs`: base delay for retry backoff.

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

Workflows:

- `.github/workflows/tech-blog-ingest.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`

Defaults:

- `tech-blog-ingest.yml`: runs every 6 hours, supports manual `dry_run` + `limit`,
  and auto-commits generated files under `blog/auto` when changed.
- `ci.yml`: runs on PR and pushes to `main` with `typecheck`, `build`, and `ingest:dry`.
- `deploy-pages.yml`: deploys static site to GitHub Pages on push to `main`.
  Manual dispatch can optionally run ingest before build.

## Environment Variables

Site config is environment-driven to support both local and GitHub Pages deploy:

- `SITE_URL`: canonical site origin (example: `https://mazhnguyen.github.io`)
- `BASE_URL`: route base path (example: `/hutune-blog/`)
- `GITHUB_ORG`: GitHub org/user used for metadata links
- `GITHUB_REPO`: GitHub repo used for metadata links

For GitHub Actions deploy, you can set repository variables:

- `SITE_URL` (optional; default is `https://<owner>.github.io`)
- `BASE_URL` (optional; default is `/<repo>/`)

## External Skill Repos (Submodules)

This repository tracks external skill packs as git submodules:

- `claudekit-engineer`
- `claudekit-marketing`

Useful commands:

```bash
git submodule update --init --recursive
git submodule update --remote --recursive
```

Automation:

- `.github/workflows/submodule-auto-update.yml` opens a weekly PR if submodule pointers changed.
- For private external repos, set repository secret `CLAUDEKIT_ACCESS_TOKEN` (PAT with read access to both submodule repos).

## Notes on Content Compliance

- Respect each publisher's robots.txt and terms.
- Keep summaries short and link back to the original article.
- Avoid copying long verbatim content.

## Contributing

See `CONTRIBUTING.md` for runbook, quality checklist, and PR guidance.
