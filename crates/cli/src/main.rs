mod cli;
mod commands;
mod git;
mod ui;
mod updater;

use anyhow::Result;
use clap::Parser;
use tracing_subscriber::EnvFilter;

use cli::{Cli, Command};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .without_time()
        .init();

    let cli = Cli::parse();
    updater::check_and_update().await;

    match cli.command {
        Some(Command::Login(args)) => {
            ui::print_compact_header();
            commands::login::run(args).await
        }
        Some(Command::Logout) => {
            ui::print_compact_header();
            commands::logout::run()
        }
        Some(Command::Status) => {
            ui::print_compact_header();
            commands::status::run().await
        }
        Some(Command::Doctor) => {
            ui::print_compact_header();
            commands::doctor::run().await
        }
        Some(Command::Targets) => {
            ui::print_compact_header();
            commands::targets::run().await
        }
        Some(Command::Publish(args)) => {
            ui::print_compact_header();
            commands::publish::run(args).await
        }
        None => commands::interactive::run().await,
    }
}
