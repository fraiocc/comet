use anyhow::{Result, bail};
use comet_core::{CliConfig, CometClient};
use dialoguer::{MultiSelect, Select};

use crate::ui;

pub async fn run() -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();
    let theme = ui::theme();

    let pb = ui::spinner("Loading workspace projects...");
    let client = CometClient::new(&api_url, &token);
    let projects = client.list_projects().await?;
    pb.finish_and_clear();

    if projects.is_empty() {
        bail!("no projects configured yet; add a repository on the web dashboard first");
    }

    let project_idx = if projects.len() == 1 {
        0
    } else {
        let items: Vec<String> = projects
            .iter()
            .map(|p| {
                let active = p.targets.iter().filter(|t| t.enabled).count();
                let total = p.targets.len();
                format!(
                    "{} {} ({active}/{total} active)",
                    p.display_name, p.repo_full_name
                )
            })
            .collect();

        Select::with_theme(&theme)
            .with_prompt("Select a project")
            .items(&items)
            .default(0)
            .interact()?
    };

    let project = &projects[project_idx];
    if project.targets.is_empty() {
        ui::print_warn(&format!(
            "No targets configured for {}. Add Modrinth or Hangar on the web dashboard.",
            project.repo_full_name
        ));
        return Ok(());
    }

    let labels: Vec<String> = project
        .targets
        .iter()
        .map(|t| {
            format!(
                "{:<9} · {} · {}",
                t.kind.to_string(),
                t.external_project_id,
                t.loaders.join(", ")
            )
        })
        .collect();
    let defaults: Vec<bool> = project.targets.iter().map(|t| t.enabled).collect();

    println!(
        "  {}",
        ui::muted("Use Space to toggle targets on/off, Enter to save.")
    );
    let selected = MultiSelect::with_theme(&theme)
        .with_prompt(format!("Active targets for {}", project.display_name))
        .items(&labels)
        .defaults(&defaults)
        .interact()?;

    println!();
    let mut changed = 0usize;
    for (idx, target) in project.targets.iter().enumerate() {
        let next_enabled = selected.contains(&idx);
        if next_enabled == target.enabled {
            continue;
        }
        changed += 1;
        ui::print_step(&format!(
            "Updating {} ({})",
            target.kind, target.external_project_id
        ));
        let pb = ui::spinner("Syncing with Comet...");
        client.set_target_enabled(&target.id, next_enabled).await?;
        pb.finish_and_clear();

        if next_enabled {
            ui::print_substep_ok("Enabled");
        } else {
            ui::print_substep_warn("Paused");
        }
    }

    if changed == 0 {
        ui::print_substep_info("No changes made.");
    }

    Ok(())
}
