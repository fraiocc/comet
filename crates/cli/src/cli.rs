use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    name = "comet",
    version,
    about = "Publish GitHub Releases to Modrinth, Hangar, and more"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Link or switch your Comet web account
    #[command(alias = "account")]
    Login(LoginArgs),
    /// Clear the saved CLI token
    Logout,
    /// Register the current GitHub repository in Comet
    #[command(alias = "i")]
    Init,
    /// Show current account and configured projects
    #[command(alias = "s")]
    Status,
    /// Check CLI configuration, authentication, and local repository
    Doctor,
    /// Enable or disable publishing targets for a project
    #[command(alias = "t")]
    Targets,
    /// Publish a GitHub Release to configured targets
    #[command(alias = "p")]
    Publish(PublishArgs),
    /// Inspect a local .jar artifact (loaders, version, dependencies, SHA-256)
    Inspect(InspectArgs),
    /// Generate categorized Markdown release notes from local Git commits
    #[command(alias = "cl")]
    Changelog(ChangelogArgs),
}

#[derive(Debug, Args, Default)]
pub struct LoginArgs {
    /// Personal CLI token generated in the Comet web dashboard
    #[arg(long)]
    pub token: Option<String>,
}

#[derive(Debug, Args, Default)]
pub struct PublishArgs {
    /// Repository in owner/name format (skips interactive selection)
    #[arg(short, long)]
    pub repo: Option<String>,
    /// Specific release tag to publish (defaults to latest release)
    #[arg(short, long)]
    pub tag: Option<String>,
    /// Publish a local artifact file directly instead of downloading from GitHub
    #[arg(short, long)]
    pub file: Option<PathBuf>,
    /// Preview publish targets without uploading
    #[arg(long)]
    pub dry_run: bool,
    /// Skip confirmation prompts (for CI / GitHub Actions)
    #[arg(short, long)]
    pub yes: bool,
    /// Generate release notes automatically from local Git commits
    #[arg(long)]
    pub auto_changelog: bool,
    /// Upload targets one by one instead of concurrently
    #[arg(long)]
    pub sequential: bool,
    /// Emit machine-readable JSON output to stdout
    #[arg(long)]
    pub json: bool,
}

#[derive(Debug, Args)]
pub struct InspectArgs {
    /// Path to the local .jar or release artifact
    pub file: PathBuf,
    /// Emit machine-readable JSON output to stdout
    #[arg(long)]
    pub json: bool,
}

#[derive(Debug, Args, Default)]
pub struct ChangelogArgs {
    /// Starting Git ref or tag (defaults to latest tag)
    #[arg(long)]
    pub from: Option<String>,
    /// Ending Git ref (defaults to HEAD)
    #[arg(long)]
    pub to: Option<String>,
    /// Optional Markdown heading (e.g. v1.2.0)
    #[arg(long)]
    pub title: Option<String>,
    /// Write generated Markdown to a file instead of stdout
    #[arg(short, long)]
    pub output: Option<PathBuf>,
    /// Include chore/ci/build/merge commits
    #[arg(long)]
    pub all: bool,
    /// Maximum number of commits to inspect
    #[arg(long, default_value_t = 100)]
    pub limit: usize,
}
