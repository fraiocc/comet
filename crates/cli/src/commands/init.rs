use anyhow::{Result, bail};
use comet_core::{CliConfig, CometClient};
use dialoguer::Input;

use crate::{git, ui};

pub async fn run() -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();
    let theme = ui::theme();

    let detected = git::detect_github_repo();
    let repo: String = match detected {
        Some(found) => Input::with_theme(&theme)
            .with_prompt("GitHub Repository (owner/repo)")
            .default(found)
            .interact_text()?,
        None => Input::with_theme(&theme)
            .with_prompt("GitHub Repository (owner/repo)")
            .interact_text()?,
    };

    let repo = repo.trim().to_string();
    if !repo.contains('/') {
        bail!("repository must be in owner/repo format");
    }

    let default_name = repo.split('/').nth(1).unwrap_or(&repo).to_string();
    let display_name: String = Input::with_theme(&theme)
        .with_prompt("Display Name")
        .default(default_name)
        .interact_text()?;

    let asset_pattern: String = Input::with_theme(&theme)
        .with_prompt("Release Asset Pattern")
        .default("*.jar".to_string())
        .interact_text()?;

    println!();
    ui::print_step(&format!("Registering {repo} on Comet"));
    let pb = ui::spinner("Creating project...");
    let client = CometClient::new(&api_url, &token);
    let created = client
        .create_project(&repo, display_name.trim(), asset_pattern.trim())
        .await?;
    pb.finish_and_clear();

    ui::print_substep_ok(&format!(
        "Created '{}' ({})",
        created.display_name, created.repo_full_name
    ));
    ui::print_substep_info(&format!(
        "Add targets at {}/projects/{}",
        api_url.trim_end_matches('/'),
        created.id
    ));
    Ok(())
}
