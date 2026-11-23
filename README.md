# Comet

Open-source release publisher built in Rust for Minecraft plugins, mods, and developer projects. Configure your **Modrinth**, **Hangar**, and **CurseForge** targets once on [comet.fraio.cc](https://comet.fraio.cc), then publish GitHub Releases or local `.jar` artifacts in parallel from your terminal or GitHub Actions.

## Features

- **Fast Rust CLI (`comet`)** — interactive command shell with numbered quick access (`1`–`4`), short aliases (`comet p`, `comet s`, `comet t`, `comet i`), built-in auto-updater, and shell completions (`powershell`, `bash`, `zsh`, `fish`).
- **Parallel Publishing & Retry Engine** — uploads to Modrinth, Hangar, and CurseForge concurrently with automatic exponential backoff on `429`/`5xx` errors, streaming download progress bars, and CI-ready `--json` output.
- **Pure-Rust JAR Metadata Inspector & Local Publish** — inspects `plugin.yml`, `paper-plugin.yml`, `fabric.mod.json`, `quilt.mod.json`, `velocity-plugin.json`, `neoforge.mods.toml`, `mods.toml`, and `bungee.yml`, computes SHA-256 digests, warns on loader mismatches before upload, and supports direct local publishing via `--file`.
- **Conventional Commits Changelog Generator** — generates categorized Markdown release notes directly from your local Git history (`comet changelog` / `comet publish --auto-changelog`).
- **Pre-Flight Validation & Diagnostics** — live token, project, and asset-pattern checks (`comet validate`, `comet doctor`), GitHub Release browser (`comet releases`), and local publish history (`comet history`).
- **GitHub Actions** — composite action (`fraiocc/comet@v1`) downloads the prebuilt static binary and publishes automatically on every release.
- **Workspace Dashboard & Webhooks** — sidebar web dashboard on [comet.fraio.cc](https://comet.fraio.cc) with publish history, Discord webhook notifications, live dynamic README SVG badges, AES-256-GCM encrypted platform tokens, and SHA-256 hashed CLI tokens.

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

## CLI Commands

| Command | Alias | Description |
| --- | --- | --- |
| `comet` | — | Open the interactive shell with quick access (`1`–`4`) |
| `comet publish` | `p` | Publish a GitHub Release or local `--file` artifact in parallel |
| `comet inspect <file.jar>` | — | Inspect JAR loaders, version, dependencies, and SHA-256 |
| `comet changelog` | `cl` | Generate categorized Markdown notes from Git commits |
| `comet validate` | `val` | Verify platform tokens, targets, and release asset matching |
| `comet releases` | `rel` | List recent GitHub Releases and assets for a repository |
| `comet history` | `hist` | Show recent local publish history (`~/.comet/history.json`) |
| `comet targets` | `t` | Enable or disable targets for a project |
| `comet init` | `i` | Register the current GitHub repository in Comet |
| `comet status` | `s` | Show connected account and configured projects |
| `comet doctor` | — | Run local configuration, auth, and connectivity checks |
| `comet completions <shell>` | — | Generate shell completions (`powershell`, `bash`, `zsh`, `fish`) |
| `comet login` / `logout` | `account` | Connect, switch, or clear your `~/.comet/config.toml` token |

## Usage Examples

```sh
# Interactive shell
comet

# Preview publish plan without uploading
comet publish --dry-run

# Publish a local build directly with auto-generated Git changelog and JSON output
comet publish --file build/libs/MyPlugin-1.5.0.jar --auto-changelog --yes --json

# Inspect a compiled mod/plugin JAR
comet inspect build/libs/MyPlugin-1.5.0.jar

# Generate release notes since the last Git tag
comet changelog --title v1.5.0 --output RELEASE_NOTES.md

# Validate all targets and API tokens before releasing
comet validate
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

## Dynamic README Badges

Embed a live SVG badge in your repository's `README.md` that automatically updates with the latest version and platforms successfully published via Comet:

```markdown
<!-- Release Card (default) -->
[![Releases](https://comet.fraio.cc/api/badge/owner/repo?style=card)](https://github.com/owner/repo/releases/latest)

<!-- Compact Strip -->
[![Releases](https://comet.fraio.cc/api/badge/owner/repo?style=strip)](https://github.com/owner/repo/releases/latest)

<!-- Mini Pill -->
[![Releases](https://comet.fraio.cc/api/badge/owner/repo?style=pill)](https://github.com/owner/repo/releases/latest)
```

You can also preview and copy your project's live badge directly from the **Settings** tab on [comet.fraio.cc](https://comet.fraio.cc/dashboard).

## Repository Structure

- `crates/core` — `comet-core` Rust library (GitHub client, retry engine, JAR inspector, Conventional Commits parser, local history store, Modrinth / Hangar / CurseForge publishers)
- `crates/cli` — `comet` Rust CLI binary (interactive shell, parallel publish runner, diagnostics, shell completions, auto-updater)
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
