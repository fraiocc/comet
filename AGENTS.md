# Comet Project Guide

Comet is a release publishing monorepo for open-source projects. Users configure repositories and publishing targets on the Next.js web dashboard, then publish GitHub Releases locally via the Rust `comet` CLI or automatically in GitHub Actions.

## Repository Layout

- `crates/core` — `comet-core` Rust library (models, errors, GitHub release client, Comet API client, `Publisher` trait, Modrinth & Hangar providers)
- `crates/cli` — `comet-cli` Rust binary (`comet`) for interactive local publishing and CI usage
- `apps/web` — Next.js App Router dashboard, API routes, Drizzle ORM (PostgreSQL), GitHub OAuth, `next-intl`
- `action.yml` — Composite GitHub Action wrapper around `comet-cli`

Note: The parent directory outside this repo is local workspace storage only and is never committed.

## Commands

Run from the repository root (`comet/comet`):

- `pnpm dev:web` — Start Next.js dev server
- `pnpm dev:cli` — Run `comet` CLI via Cargo
- `pnpm build:web` — Build Next.js app
- `pnpm build:cli` — Build Rust CLI in release mode
- `pnpm test:rust` — Run Rust workspace tests
- `pnpm check:rust` — Run `cargo fmt --check` and `cargo clippy -D warnings`
- `pnpm lint:web` — Run ESLint on `apps/web`
- `pnpm typecheck:web` — Run TypeScript typecheck on `apps/web`
- `pnpm db:push` — Push Drizzle schema to PostgreSQL
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:studio` — Open Drizzle Studio

## Code Rules

### Comments
- Default to zero comments. Never write obvious, redundant, or section-banner comments.
- Only add a comment for a non-obvious "why" (workaround, protocol quirk, security invariant) or when required by a tool (e.g., `clap` CLI help text).
- Never leave commented-out code.

### Rust (`crates/core`, `crates/cli`)
- Use `thiserror` in `comet-core` and `anyhow` in `comet-cli`.
- No `unwrap()` outside tests.
- Keep `comet-core` free of terminal UI code; all prompts and spinners belong in `crates/cli`.
- Format with `cargo fmt` and ensure `cargo clippy --workspace --all-targets -- -D warnings` passes.

### Web (`apps/web`)
- Use Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`). No Docker requirement.
- Never hard-code user-facing UI copy; keep strings in `messages/en.json` via `next-intl`.
- Encrypt all third-party platform API tokens at rest using `src/lib/crypto.ts` (AES-256-GCM).
- Store CLI tokens only as SHA-256 hashes; never persist raw CLI tokens.
- Keep TypeScript strict (`no any`, use `unknown` where needed).
