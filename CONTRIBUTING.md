# Contributing Guide

## Goals

This project ships short, link-back-first technology briefings from trusted feeds.
Contributions should keep the pipeline reliable, transparent, and easy to audit.

## Local Setup

```bash
npm install
git submodule update --init --recursive
```

## Development Commands

```bash
npm run start
npm run typecheck
npm run ingest:dry -- --limit 5
npm run ingest -- --limit 5
npm run build
git submodule update --remote --recursive
```

## Content Rules

- Keep summaries short and factual.
- Always include a source link to the original article.
- Do not copy long verbatim text from publishers.
- Prefer neutral tone and avoid speculation in auto-generated posts.

## Feed Source Changes

When editing `config/sources.json`:

- Add `id`, `name`, `feedUrl`, and `siteUrl`.
- Keep `enabled` false for unverified sources.
- Start with small `maxItemsPerRun` and increase after validation.
- Use reasonable request settings (`requestTimeoutMs`, retries, delay).

## Submodule Maintenance

- External skill repositories are tracked as git submodules.
- Run `git submodule update --init --recursive` after cloning.
- To refresh to latest tracked branch revisions, run `git submodule update --remote --recursive`.

## Quality Checklist Before PR

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm run ingest:dry -- --limit 3` succeeds.
- Generated content in `blog/auto` is readable and links are valid.

## CI and Deploy

- `CI` workflow runs on PR and push to `main`.
- `Deploy Pages` workflow deploys from `main` to GitHub Pages.
- `Tech Blog Ingest` workflow runs every 6 hours and can be run manually.

## Recommended PR Scope

- Keep PRs focused on one purpose (config, ingest logic, UI, or content).
- Include before/after notes for behavior changes.
- Add sample generated output when changing ingest logic.
