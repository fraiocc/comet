# Comet

Open-source release publishing for Minecraft and developer projects. Configure your Modrinth and Hangar targets once on [comet.fraio.cc](https://comet.fraio.cc), then publish GitHub Releases from your terminal or GitHub Actions in a single step.

## Features

- **Interactive Rust CLI (`comet`)** — auto-detects your Git repository, lets you toggle targets, choose changelog sources (GitHub Release notes, full commit messages, custom text, or saved default), and preview with `--dry-run`.
- **GitHub Actions** — composite action (`fraiocc/comet@v1`) downloads the prebuilt static binary and publishes automatically on every release.
- **Modrinth & Hangar** — personal and organization project discovery, plugin & mod loaders, Minecraft versions, release channels, and dependency sync (including Hangar `externalUrl` preservation).
- **Security** — platform API tokens encrypted at rest with AES-256-GCM; personal CLI tokens stored as SHA-256 hashes; private GitHub Release asset downloads supported.

## Install CLI

### Windows (PowerShell)

```powershell
irm https://comet.fraio.cc/install.ps1 | iex
```

### Windows (CMD)

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://comet.fraio.cc/install.ps1 | iex"
```

### Linux / macOS

```sh
curl -fsSL https://comet.fraio.cc/install.sh | sh
```

### From Source (Cargo)

```sh
cargo install --git https://github.com/fraiocc/comet comet-cli
```

## Quick Start

```sh
comet login
comet
```

Or publish non-interactively:

```sh
comet publish --repo owner/repo --dry-run
comet publish --repo owner/repo --yes
```

## GitHub Actions

```yaml
name: Publish Release

on:
  release:
    types: [published]

jobs:
  comet:
    runs-on: ubuntu-latest
    steps:
      - uses: fraiocc/comet@v1
        with:
          comet-token: ${{ secrets.COMET_TOKEN }}
```

Optional inputs: `repo` (defaults to `${{ github.repository }}`), `tag` (defaults to latest release), `api-url` (defaults to `https://comet.fraio.cc`), `cli-version` (defaults to `latest`).

## Repository Structure

- `crates/core` — `comet-core` Rust library (GitHub Release resolution, Comet API client, Modrinth & Hangar publishers)
- `crates/cli` — `comet` CLI binary (interactive TUI & headless CI mode)
- `apps/web` — Next.js 16 + React 19 + Tailwind CSS v4 + Drizzle ORM (PostgreSQL) web dashboard
- `action.yml` — Composite GitHub Action for automated publishing

## Local Development

### Rust CLI & Core

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo run -p comet-cli -- --help
```

### Web Dashboard

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web
```

Verify before opening a PR:

```sh
pnpm typecheck:web
pnpm lint:web
pnpm build:web
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup details and pull request guidelines.

## License

Comet is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
