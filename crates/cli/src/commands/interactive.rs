use anyhow::Result;
use comet_core::{CliConfig, CometClient};
use dialoguer::Input;

use crate::commands::{doctor, init, login, logout, publish, status, targets};
use crate::ui;

fn print_help() {
    let lines = vec![
        format!(
            "{}  {}",
            ui::sky("publish "),
            ui::muted("Publish a GitHub Release to configured targets")
        ),
        format!(
            "{}  {}",
            ui::sky("dry-run "),
            ui::muted("Preview release plan without uploading")
        ),
        format!(
            "{}  {}",
            ui::sky("targets "),
            ui::muted("Enable or disable targets for a project")
        ),
        format!(
            "{}  {}",
            ui::sky("init    "),
            ui::muted("Register the current GitHub repository in Comet")
        ),
        format!(
            "{}  {}",
            ui::sky("status  "),
            ui::muted("Show workspace account and configured projects")
        ),
        format!(
            "{}  {}",
            ui::sky("doctor  "),
            ui::muted("Run configuration and connection diagnostics")
        ),
        format!(
            "{}  {}",
            ui::sky("account "),
            ui::muted("Sign in or switch your Comet account")
        ),
        format!(
            "{}  {}",
            ui::sky("logout  "),
            ui::muted("Clear the saved CLI token")
        ),
        format!(
            "{}  {}",
            ui::sky("clear   "),
            ui::muted("Clear the terminal screen")
        ),
        format!(
            "{}  {}",
            ui::sky("help    "),
            ui::muted("Show this command list")
        ),
        format!("{}  {}", ui::sky("exit    "), ui::muted("Exit Comet CLI")),
    ];
    ui::print_box(&ui::starlight_bold("Commands"), &lines);
}

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
            if token.is_some() {
                println!(
                    "  {}",
                    ui::muted(
                        "Commands: publish · dry-run · targets · init · status · doctor · help · exit"
                    )
                );
            } else {
                println!(
                    "  {}",
                    ui::muted("Type 'account' to sign in, 'help' for commands, or 'exit' to quit.")
                );
            }
            println!();
        }

        let input: String = match Input::with_theme(&theme)
            .with_prompt("comet")
            .allow_empty(true)
            .interact_text()
        {
            Ok(line) => line,
            Err(_) => break,
        };

        let raw = input.trim().trim_start_matches('/');
        if raw.is_empty() {
            continue;
        }

        let cmd = raw.split_whitespace().next().unwrap_or("").to_lowercase();
        println!();

        let result = match cmd.as_str() {
            "exit" | "quit" | "q" => break,
            "help" | "h" | "?" => {
                print_help();
                Ok(())
            }
            "clear" | "cls" => {
                let _ = console::Term::stdout().clear_screen();
                first_render = true;
                continue;
            }
            "account" | "login" => {
                let res = login::run(Default::default()).await;
                if res.is_ok() {
                    first_render = true;
                }
                res
            }
            "logout" => {
                let res = logout::run();
                if res.is_ok() {
                    first_render = true;
                }
                res
            }
            "publish" | "p" => publish::run(Default::default()).await,
            "dry-run" | "dry" | "d" => {
                publish::run(crate::cli::PublishArgs {
                    dry_run: true,
                    ..Default::default()
                })
                .await
            }
            "targets" | "t" => targets::run().await,
            "init" | "i" => {
                let res = init::run().await;
                if res.is_ok() {
                    first_render = true;
                }
                res
            }
            "status" | "s" => status::run().await,
            "doctor" => doctor::run().await,
            _ => {
                ui::print_err(&format!(
                    "Unknown command '{cmd}'. Type 'help' to see available commands."
                ));
                Ok(())
            }
        };

        if let Err(err) = result {
            ui::print_err(&err.to_string());
        }
        println!();
    }

    Ok(())
}
