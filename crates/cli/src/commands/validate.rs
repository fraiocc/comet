use std::time::Duration;

use anyhow::{Result, bail};
use comet_core::github::match_asset;
use comet_core::{CliConfig, CometClient, GitHubClient, TargetConfig, TargetKind};
use reqwest::Client;
use reqwest::header::{AUTHORIZATION, USER_AGENT};

use crate::cli::ValidateArgs;
use crate::{git, ui};

pub async fn run(args: ValidateArgs) -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();

    ui::print_step("Validating Comet workspace and targets");
    let pb = ui::spinner("Loading workspace from Comet...");
    let client = CometClient::new(&api_url, &token);
    let workspace = client.fetch_workspace().await?;
    pb.finish_and_clear();

    if workspace.projects.is_empty() {
        bail!("no projects configured on Comet");
    }

    let repo_filter = args.repo.or_else(git::detect_github_repo);
    let projects: Vec<_> = match &repo_filter {
        Some(repo) => workspace
            .projects
            .iter()
            .filter(|p| p.repo_full_name.eq_ignore_ascii_case(repo))
            .collect(),
        None => workspace.projects.iter().collect(),
    };

    let targets_to_check = if projects.is_empty() {
        workspace.projects.iter().collect::<Vec<_>>()
    } else {
        projects
    };

    let http = Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(20))
        .build()
        .unwrap_or_else(|_| Client::new());

    let gh_token = std::env::var("GITHUB_TOKEN")
        .ok()
        .filter(|t| !t.trim().is_empty())
        .or(workspace.github_token);
    let gh = GitHubClient::new(gh_token);

    let mut failures = 0usize;

    for project in targets_to_check {
        println!();
        ui::print_step(&format!(
            "{} ({})",
            project.display_name, project.repo_full_name
        ));

        match gh.fetch_latest_release(&project.repo_full_name).await {
            Ok(release) => match match_asset(&release, &project.asset_pattern) {
                Ok(asset) => ui::print_substep_ok(&format!(
                    "GitHub Release {} matches '{}': {}",
                    release.tag_name, project.asset_pattern, asset.name
                )),
                Err(_) => {
                    failures += 1;
                    ui::print_substep_err(&format!(
                        "Release {} has no asset matching '{}'",
                        release.tag_name, project.asset_pattern
                    ));
                }
            },
            Err(err) => {
                ui::print_substep_warn(&format!("GitHub Release check skipped: {err}"));
            }
        }

        let enabled: Vec<&TargetConfig> = project.targets.iter().filter(|t| t.enabled).collect();
        if enabled.is_empty() {
            ui::print_substep_warn("No active targets enabled");
            continue;
        }

        for target in enabled {
            if target.external_project_id.trim().is_empty() {
                failures += 1;
                ui::print_substep_err(&format!("{}: missing external project ID", target.kind));
                continue;
            }
            if target.token.trim().is_empty() {
                failures += 1;
                ui::print_substep_err(&format!(
                    "{} ({}): missing API token",
                    target.kind, target.external_project_id
                ));
                continue;
            }
            if target.game_versions.is_empty() || target.loaders.is_empty() {
                failures += 1;
                ui::print_substep_err(&format!(
                    "{} ({}): missing game versions or loaders",
                    target.kind, target.external_project_id
                ));
                continue;
            }

            match verify_target_live(&http, target).await {
                Ok(detail) => ui::print_substep_ok(&format!(
                    "{} ({}): {detail}",
                    target.kind, target.external_project_id
                )),
                Err(reason) => {
                    failures += 1;
                    ui::print_substep_err(&format!(
                        "{} ({}): {reason}",
                        target.kind, target.external_project_id
                    ));
                }
            }
        }
    }

    println!();
    if failures == 0 {
        ui::print_ok("All validation checks passed.");
        Ok(())
    } else {
        bail!("{failures} validation check(s) failed");
    }
}

async fn verify_target_live(http: &Client, target: &TargetConfig) -> Result<String, String> {
    let ua = concat!("comet-cli/", env!("CARGO_PKG_VERSION"));
    match target.kind {
        TargetKind::Modrinth => {
            let url = format!(
                "https://api.modrinth.com/v2/project/{}",
                target.external_project_id
            );
            let resp = http
                .get(&url)
                .header(USER_AGENT, ua)
                .header(AUTHORIZATION, &target.token)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                Ok("project & token verified".to_string())
            } else {
                Err(format!("Modrinth returned HTTP {}", resp.status().as_u16()))
            }
        }
        TargetKind::Hangar => {
            let resp = http
                .post("https://hangar.papermc.io/api/v1/authenticate")
                .query(&[("apiKey", target.token.as_str())])
                .header(USER_AGENT, ua)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                Ok("Hangar API key verified".to_string())
            } else {
                Err(format!(
                    "Hangar auth returned HTTP {}",
                    resp.status().as_u16()
                ))
            }
        }
        TargetKind::CurseForge => {
            let resp = http
                .get("https://minecraft.curseforge.com/api/game/versions")
                .header(USER_AGENT, ua)
                .header("X-Api-Token", &target.token)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                Ok("CurseForge upload token verified".to_string())
            } else {
                Err(format!(
                    "CurseForge returned HTTP {}",
                    resp.status().as_u16()
                ))
            }
        }
    }
}
