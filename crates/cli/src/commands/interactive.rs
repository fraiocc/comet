use anyhow::Result;
use comet_core::{CliConfig, CometClient};
use dialoguer::Input;

use crate::commands::{doctor, init, login, logout, publish, status, targets};
use crate::ui;

const SIGNED_IN_QUICK: [(&str, &str, &str); 4] = [
    ("1", "publish", "Publish a GitHub Release"),
    ("2", "dry-run", "Preview release without uploading"),
    ("3", "targets", "Enable or disable project targets"),
    ("4", "status", "Workspace account and projects"),
];

const SIGNED_OUT_QUICK: [(&str, &str, &str); 2] = [
    ("1", "account", "Sign in to your Comet workspace"),
    ("2", "doctor", "Run configuration diagnostics"),
];

fn print_quick_access(signed_in: bool) {
    let items: &[(&str, &str, &str)] = if signed_in {
        &SIGNED_IN_QUICK
    } else {
        &SIGNED_OUT_QUICK
    };

    println!("  {}", ui::starlight_bold("Quick access"));
    for (num, cmd, desc) in items {
        let padded = format!("{cmd:<9}");
        println!(
            "  {}  {} {}",
            ui::sky_bold(num),
            ui::starlight(&padded),
            ui::muted(desc)
        );
    }
    println!(
        "  {}",
        ui::muted("Type a number or command · help for all · exit to quit")
    );
    println!();
}

fn print_help() {
    let entries = [
        ("publish", "1, p", "Publish a GitHub Release to targets"),
        ("dry-run", "2, d", "Preview release plan without uploading"),
        ("targets", "3, t", "Enable or disable targets for a project"),
        ("status", "4, s", "Show account and configured projects"),
        ("init", "i", "Register current GitHub repo in Comet"),
        ("doctor", "", "Run configuration & connection checks"),
        ("account", "login", "Sign in or switch your Comet account"),
        ("logout", "", "Clear the saved CLI token"),
        ("clear", "cls", "Clear the terminal screen"),
        ("help", "h, ?", "Show this command list"),
        ("exit", "q", "Exit Comet CLI"),
    ];
    let lines: Vec<String> = entries
        .iter()
        .map(|(cmd, alias, desc)| {
            let cmd_col = format!("{cmd:<8}");
            let alias_col = format!("{alias:<6}");
            format!(
                "{} {} {}",
                ui::sky(&cmd_col),
                ui::border(&alias_col),
                ui::muted(desc)
            )
        })
        .collect();
    ui::print_box(&ui::starlight_bold("Commands"), &lines);
}

pub async fn run() -> Result<()> {
    let theme = ui::theme();
    let mut first_render = true;

    loop {
        let config = CliConfig::load().unwrap_or_default();
        let api_url = config.resolve_api_url();
        let token = config.resolve_token().ok();

        let signed_in = token.is_some();

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
            print_quick_access(signed_in);
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
        let resolved = match (signed_in, cmd.as_str()) {
            (true, "1") => "publish",
            (true, "2") => "dry-run",
            (true, "3") => "targets",
            (true, "4") => "status",
            (false, "1") => "account",
            (false, "2") => "doctor",
            (_, other) => other,
        };
        println!();

        let result = match resolved {
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
