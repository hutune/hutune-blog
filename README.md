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
- `.github/workflows/submodule-auto-update.yml`

Defaults:

- `tech-blog-ingest.yml`: runs every 6 hours, supports manual `dry_run` + `limit`,
  and auto-commits generated files under `blog/auto` when changed.
- `ci.yml`: runs on PR and pushes to `main` with `typecheck`, `build`, and `ingest:dry`.
- `deploy-pages.yml`: deploys static site to GitHub Pages on push to `main`.
  Manual dispatch can optionally run ingest before build.
- `submodule-auto-update.yml`: runs weekly, updates submodule pointers, and opens PR when changed.

## Cron Schedule

All schedules are configured in GitHub Actions (not local machine cronjobs):

- `tech-blog-ingest.yml`: `0 */6 * * *` (UTC) = every 6 hours.
- `submodule-auto-update.yml`: `0 3 * * 1` (UTC) = 10:00 Monday (UTC+7, Vietnam time).

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

## Submodule Setup

Fresh clone (recommended):

```bash
git clone --recurse-submodules https://github.com/hutune/hutune-blog.git
cd hutune-blog
```

If already cloned:

```bash
git submodule update --init --recursive
```

## Daily Update (Important)

`git pull` alone updates only the main repository pointer. To make submodule content match that pointer:

```bash
git pull
git submodule update --init --recursive
```

This gives you the latest version already merged into `main`.

## Force Latest from Upstream Submodule Repos

If you want latest commits directly from submodule upstream branches:

```bash
git submodule update --remote --recursive
```

After that, commit and push the updated submodule pointers in this repo if you want to keep those versions.

## Auto-Update Workflow for Submodules

1. Workflow file: `.github/workflows/submodule-auto-update.yml`.
2. Runs weekly via schedule and can also be triggered manually.
3. Syncs and updates submodules to latest commit on tracked branch (`main`).
4. If submodule pointers changed, opens PR `chore/submodule-bump`.
5. If nothing changed, workflow exits successfully without PR.

For private external submodules, configure repository secret `CLAUDEKIT_ACCESS_TOKEN`.
`CLAUDEKIT_ACCESS_TOKEN` must have read access to `claudekit/claudekit-engineer` and `claudekit/claudekit-marketing`.

Quick setup for `CLAUDEKIT_ACCESS_TOKEN`:

1. Open GitHub repo settings.
2. Go to `Secrets and variables` -> `Actions`.
3. Create `New repository secret`.
4. Name: `CLAUDEKIT_ACCESS_TOKEN`.
5. Value: token with read access to both submodule repositories.

## Notes on Content Compliance

- Respect each publisher's robots.txt and terms.
- Keep summaries short and link back to the original article.
- Avoid copying long verbatim content.

## Contributing

See `CONTRIBUTING.md` for runbook, quality checklist, and PR guidance.
