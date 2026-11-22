use anyhow::Result;
use comet_core::{CliConfig, CometClient};

use crate::ui;

pub async fn run() -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();

    let pb = ui::spinner("Fetching workspace status...");
    let client = CometClient::new(&api_url, &token);
    let user = client.whoami().await?;
    let projects = client.list_projects().await?;
    pb.finish_and_clear();

    let mut lines = vec![
        format!(
            "{}  {}",
            ui::muted("Account "),
            ui::mint_bold(&format!("@{}", user.username))
        ),
        format!("{}  {}", ui::muted("Endpoint"), ui::sky(&api_url)),
    ];

    if projects.is_empty() {
        lines.push(String::new());
        lines.push(ui::muted(
            "No projects configured yet. Add one on the web dashboard.",
        ));
    } else {
        lines.push(String::new());
        for project in projects {
            let target_summary: Vec<String> = project
                .targets
                .iter()
                .map(|t| {
                    if t.enabled {
                        ui::sky(&t.kind.to_string())
                    } else {
                        ui::muted(&format!("{} (paused)", t.kind))
                    }
                })
                .collect();

            let targets_str = if target_summary.is_empty() {
                ui::muted("no targets")
            } else {
                target_summary.join("  ")
            };

            lines.push(format!(
                "{} {}  {}",
                ui::starlight_bold(&project.display_name),
                ui::muted(&project.repo_full_name),
                targets_str
            ));
        }
    }

    let title = ui::starlight_bold("Workspace");
    ui::print_box(&title, &lines);
    Ok(())
}
