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
    /// Link your Comet web account to the CLI
    Login(LoginArgs),
    /// Clear the saved CLI token
    Logout,
    /// Show current account and configured projects
    Status,
    /// Check CLI configuration, authentication, and local repository
    Doctor,
    /// Enable or disable publishing targets for a project
    Targets,
    /// Publish a GitHub Release to configured targets
    Publish(PublishArgs),
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
    /// Preview publish targets without uploading
    #[arg(long)]
    pub dry_run: bool,
    /// Skip confirmation prompts (for CI / GitHub Actions)
    #[arg(short, long)]
    pub yes: bool,
}
