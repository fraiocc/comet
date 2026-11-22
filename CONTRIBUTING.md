# Contributing to Comet

Thanks for helping improve Comet. Keep changes focused, minimal, and consistent with the surrounding codebase.

## Prerequisites

- **Rust** 1.85+ (edition 2024) with `rustfmt` and `clippy`
- **Node.js** 22+ and **pnpm** 9+
- A PostgreSQL database (e.g. Neon) if working on `apps/web`

## Setup

```sh
git clone https://github.com/fraiocc/comet.git
cd comet
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Run the web app locally:

```sh
pnpm dev:web
```

Run the CLI against your local web instance:

```sh
COMET_API_URL=http://localhost:3000 cargo run -p comet-cli
```

## Code Standards

- Match the existing conventions, file layout, and design tokens.
- Keep user-facing web copy inside `apps/web/messages/en.json` via `next-intl` — do not hard-code UI strings.
- Avoid unnecessary comments; only add a comment when explaining a non-obvious constraint or workaround.
- Keep diffs small and avoid unrelated formatting or refactors.

## Checks Before Opening a PR

### Rust

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

### Web

```sh
pnpm typecheck:web
pnpm lint:web
pnpm build:web
```

## Adding a New Publishing Target

1. Implement the `Publisher` trait in `crates/core/src/publishers/`.
2. Register the target kind in `crates/core/src/models.rs` and `crates/cli/src/commands/publish.rs`.
3. Add provider lookup/verification routes in `apps/web/src/app/api/providers/`.
4. Wire the target option into `TargetCreateModal`, `TargetEditModal`, and `TargetFormParts`.

## Pull Requests

- Reference any related issue in the PR description.
- Explain what changed and how you verified it.
- Keep one logical change per PR.
