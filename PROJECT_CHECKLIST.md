# Project Checklist (Tech Briefing)

Last updated: 2026-03-20

## 1) Core setup

- [x] Docusaurus project bootstrapped
- [x] Blog-only mode configured (`docs: false`, `routeBasePath: /`)
- [x] Custom theme and typography applied
- [x] Author and tag metadata configured

## 2) Ingestion pipeline

- [x] RSS/Atom ingest script implemented
- [x] Feed source config added (`config/sources.json`)
- [x] Duplicate guard by `sourceUrl` implemented
- [x] CLI flags supported (`--dry-run`, `--limit`)
- [x] Dry-run execution passed locally (`Created: 3`, `Failed sources: 0`)

## 3) Content readiness

- [x] Editorial kickoff post exists
- [x] Auto-generated post samples exist (`blog/auto`: 5 files)
- [x] About page explains workflow and principles
- [x] Content voice/style guideline documented for auto posts
- [ ] Quality checks for bad excerpts (truncated entities, noisy summaries)

## 4) Build and CI

- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] Scheduled ingest workflow exists (every 6 hours)
- [x] Manual workflow dispatch supported (`dry_run`, `limit`)
- [x] Production deploy workflow configured (GitHub Pages)
- [x] CI gate for typecheck/build/ingest dry-run on PR

## 5) Production hardening

- [x] Replace placeholder values in site config:
  - `SITE_URL` fallback
  - `organizationName`, `projectName`
  - GitHub repo links in navbar/footer/editUrl
- [x] Replace placeholder bot `userAgent` URL (`example.com/about`)
- [ ] Add monitoring/alert strategy for ingest failures
- [x] Add fallback/retry policy for temporary feed errors

## 6) Repo hygiene

- [ ] Remove unused Docusaurus tutorial docs (if staying blog-only)
- [x] Add CONTRIBUTING.md (runbook for ingest + content rules)
- [x] Add environment variable documentation (`SITE_URL`, deploy vars)

## Priority next steps (recommended)

1. Remove unused Docusaurus tutorial docs (if site remains blog-only).
2. Add monitoring/alerts for ingest workflow failures.
3. Add more summary quality guards for noisy/truncated feed text.
