use anyhow::Result;
use comet_core::{CliConfig, CometClient};

use crate::{git, ui};

pub async fn run() -> Result<()> {
    ui::print_step("Running Comet diagnostics");

    match CliConfig::path() {
        Ok(path) => {
            let status = if path.exists() {
                format!("Config found: {}", path.display())
            } else {
                format!("Config not created yet ({})", path.display())
            };
            ui::print_substep_info(&status);
        }
        Err(err) => ui::print_substep_err(&format!("Config path error: {err}")),
    }

    let config = CliConfig::load().unwrap_or_default();
    let api_url = config.resolve_api_url();
    ui::print_substep_info(&format!("API endpoint: {api_url}"));

    let local_repo = git::detect_github_repo();
    match &local_repo {
        Some(repo) => ui::print_substep_ok(&format!("Git remote detected: {repo}")),
        None => ui::print_substep_info("No GitHub origin remote in current directory"),
    }

    let token = match config.resolve_token() {
        Ok(t) => t,
        Err(_) => {
            ui::print_substep_warn("Not authenticated — run `comet login` to connect your account");
            return Ok(());
        }
    };

    let pb = ui::spinner("Checking Comet API & workspace...");
    let client = CometClient::new(&api_url, &token);
    let (user_res, workspace_res) = tokio::join!(client.whoami(), client.fetch_workspace());
    pb.finish_and_clear();

    match user_res {
        Ok(user) => ui::print_substep_ok(&format!("Authenticated as @{}", user.username)),
        Err(err) => {
            ui::print_substep_err(&format!("Authentication failed: {err}"));
            return Ok(());
        }
    }

    match workspace_res {
        Ok(ws) => {
            let total_targets: usize = ws.projects.iter().map(|p| p.targets.len()).sum();
            let active_targets: usize = ws
                .projects
                .iter()
                .flat_map(|p| p.targets.iter())
                .filter(|t| t.enabled)
                .count();
            ui::print_substep_ok(&format!(
                "{} project(s), {}/{} active target(s)",
                ws.projects.len(),
                active_targets,
                total_targets
            ));

            if ws.github_token.is_some() || std::env::var("GITHUB_TOKEN").is_ok() {
                ui::print_substep_ok("GitHub token available (private repos supported)");
            } else {
                ui::print_substep_warn(
                    "No GitHub token linked (only public repos accessible without rate limits)",
                );
            }

            if let Some(repo) = &local_repo {
                if ws
                    .projects
                    .iter()
                    .any(|p| p.repo_full_name.eq_ignore_ascii_case(repo))
                {
                    ui::print_substep_ok(&format!("Current repo '{repo}' is configured in Comet"));
                } else {
                    ui::print_substep_warn(&format!(
                        "Current repo '{repo}' is not added to Comet yet"
                    ));
                }
            }
        }
        Err(err) => ui::print_substep_err(&format!("Failed to load workspace: {err}")),
    }

    Ok(())
}
