use anyhow::Result;
use comet_core::{CliConfig, CometClient};
use dialoguer::Select;

use crate::commands::{login, logout, publish, status, targets};
use crate::ui;

pub async fn run() -> Result<()> {
    let theme = ui::theme();
    let mut first_render = true;

    loop {
        let config = CliConfig::load().unwrap_or_default();
        let api_url = config.resolve_api_url();
        let token = config.resolve_token().ok();

        if first_render {
            first_render = false;
            let (account, project_count) = match &token {
                Some(tok) => {
                    let pb = ui::spinner("Connecting to Comet...");
                    let client = CometClient::new(&api_url, tok);
                    let (user_res, projects_res) =
                        tokio::join!(client.whoami(), client.list_projects());
                    let user = user_res.ok();
                    let count = projects_res.ok().map(|p| p.len());
                    pb.finish_and_clear();
                    (user.map(|u| u.username), count)
                }
                None => (None, None),
            };
            ui::print_welcome(account.as_deref(), &api_url, project_count);
        }

        if token.is_none() {
            let choices = ["Login to Comet", "Exit"];
            let selection = Select::with_theme(&theme)
                .with_prompt("Action")
                .items(&choices)
                .default(0)
                .interact()?;

            println!();
            match selection {
                0 => {
                    if let Err(err) = login::run(Default::default()).await {
                        ui::print_err(&err.to_string());
                    } else {
                        first_render = true;
                    }
                    println!();
                }
                _ => break,
            }
            continue;
        }

        let choices = [
            "Publish a release",
            "Dry run (preview only)",
            "Toggle targets (enable / disable)",
            "Workspace status",
            "Switch account / login",
            "Logout",
            "Exit",
        ];

        let selection = Select::with_theme(&theme)
            .with_prompt("Action")
            .items(&choices)
            .default(0)
            .interact()?;

        println!();
        let result = match selection {
            0 => publish::run(Default::default()).await,
            1 => {
                publish::run(crate::cli::PublishArgs {
                    dry_run: true,
                    ..Default::default()
                })
                .await
            }
            2 => targets::run().await,
            3 => status::run().await,
            4 => {
                let res = login::run(Default::default()).await;
                if res.is_ok() {
                    first_render = true;
                }
                res
            }
            5 => {
                let res = logout::run();
                if res.is_ok() {
                    first_render = true;
                }
                res
            }
            _ => break,
        };

        if let Err(err) = result {
            ui::print_err(&err.to_string());
        }
        println!();
    }

    Ok(())
}
