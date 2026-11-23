mod plan;
mod prompts;
mod runner;

use anyhow::{Context, Result, bail};
use comet_core::github::{format_bytes, match_asset, normalize_version};
use comet_core::{
    CliConfig, CometClient, GitHubClient, PublishResultItem, TargetConfig, VersionType,
};
use serde::Serialize;

use crate::cli::PublishArgs;
use crate::ui;

#[derive(Serialize)]
struct PublishJsonReport {
    repo: String,
    tag: String,
    asset: String,
    dry_run: bool,
    total: usize,
    succeeded: usize,
    failed: usize,
    results: Vec<PublishResultItem>,
}

pub async fn run(args: PublishArgs) -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();
    let theme = ui::theme();
    let quiet = args.json;
    let non_interactive = args.yes || args.json;

    let pb = if quiet {
        None
    } else {
        Some(ui::spinner("Loading projects from Comet..."))
    };
    let client = CometClient::new(&api_url, &token);
    let workspace = client.fetch_workspace().await?;
    if let Some(bar) = pb {
        bar.finish_and_clear();
    }

    if workspace.projects.is_empty() {
        bail!("no projects configured on Comet; add a repository on the web dashboard first");
    }

    let project = prompts::select_project(&workspace.projects, args.repo.as_deref())?;
    let enabled_targets: Vec<TargetConfig> = project
        .targets
        .iter()
        .filter(|t| t.enabled)
        .cloned()
        .collect();
    if enabled_targets.is_empty() {
        bail!(
            "no active publish targets for {} (enable one in Toggle targets)",
            project.repo_full_name
        );
    }

    let Some(selected_targets) = prompts::select_targets(&theme, non_interactive, enabled_targets)?
    else {
        if !quiet {
            ui::print_warn("No targets selected. Publish cancelled.");
        }
        return Ok(());
    };

    let gh_token = std::env::var("GITHUB_TOKEN")
        .ok()
        .filter(|t| !t.trim().is_empty())
        .or(workspace.github_token);
    let gh = GitHubClient::new(gh_token);

    if !quiet {
        ui::print_step(&format!("Resolving release for {}", project.repo_full_name));
    }
    let pb = if quiet {
        None
    } else {
        Some(ui::spinner("Querying GitHub Releases & commits..."))
    };
    let release = match args.tag.as_deref() {
        Some(tag) => {
            gh.fetch_release_by_tag(&project.repo_full_name, tag)
                .await?
        }
        None => gh.fetch_latest_release(&project.repo_full_name).await?,
    };
    let commit_changelog = gh
        .fetch_commit_changelog(&project.repo_full_name, &release.tag_name)
        .await;
    if let Some(bar) = pb {
        bar.finish_and_clear();
    }

    let asset = match_asset(&release, &project.asset_pattern)
        .with_context(|| format!("asset pattern '{}'", project.asset_pattern))?;

    if !quiet {
        ui::print_substep_ok(&format!(
            "{}  ·  {} ({})",
            release.tag_name,
            asset.name,
            format_bytes(asset.size)
        ));
        println!();
    }

    let (changelog_source, base_changelog) = prompts::select_changelog(
        &theme,
        non_interactive,
        commit_changelog.as_deref(),
        &release.body,
        project.default_changelog.as_deref(),
    )?;

    if !quiet {
        plan::print_release_plan(
            project,
            &release,
            asset,
            changelog_source,
            &base_changelog,
            &selected_targets,
            args.dry_run,
        );
    }

    if args.dry_run {
        if args.json {
            let report = PublishJsonReport {
                repo: project.repo_full_name.clone(),
                tag: release.tag_name.clone(),
                asset: asset.name.clone(),
                dry_run: true,
                total: selected_targets.len(),
                succeeded: 0,
                failed: 0,
                results: selected_targets
                    .iter()
                    .map(|t| PublishResultItem {
                        kind: t.kind.to_string(),
                        external_project_id: t.external_project_id.clone(),
                        status: "planned".to_string(),
                        url: None,
                        error: None,
                    })
                    .collect(),
            };
            println!("{}", serde_json::to_string_pretty(&report)?);
        } else {
            ui::print_ok("Dry run complete. Nothing was uploaded.");
        }
        return Ok(());
    }

    if !non_interactive && !prompts::confirm_publish(&theme)? {
        ui::print_warn("Publish cancelled.");
        return Ok(());
    }

    if !quiet {
        ui::print_step(&format!("Downloading {}", asset.name));
    }
    let dl_bar = if quiet {
        None
    } else {
        Some(ui::progress_bar(asset.size, "Fetching artifact"))
    };
    let asset_bytes = gh
        .download_asset_with_progress(&project.repo_full_name, asset, |done, total| {
            if let Some(bar) = &dl_bar {
                if total > 0 && bar.length() != Some(total) {
                    bar.set_length(total);
                }
                bar.set_position(done);
            }
        })
        .await?;
    if let Some(bar) = dl_bar {
        bar.finish_and_clear();
    }
    if !quiet {
        ui::print_substep_ok(&format!(
            "Downloaded {}",
            format_bytes(asset_bytes.len() as u64)
        ));
        println!();
    }

    let version_number = normalize_version(&release.tag_name);
    let version_type = if release.prerelease {
        VersionType::Beta
    } else {
        VersionType::Release
    };

    let outcome = runner::execute_targets(runner::ExecutionContext {
        client: &client,
        theme: &theme,
        project,
        release: &release,
        asset_name: &asset.name,
        asset_bytes: &asset_bytes,
        version_number: &version_number,
        version_type,
        base_changelog: &base_changelog,
        targets: selected_targets,
        non_interactive,
        sequential: args.sequential,
        json_output: args.json,
    })
    .await?;

    if args.json {
        let report = PublishJsonReport {
            repo: project.repo_full_name.clone(),
            tag: release.tag_name.clone(),
            asset: asset.name.clone(),
            dry_run: false,
            total: outcome.total,
            succeeded: outcome.succeeded,
            failed: outcome.failed,
            results: outcome.results,
        };
        println!("{}", serde_json::to_string_pretty(&report)?);
        if outcome.failed > 0 {
            bail!("{} target(s) failed to publish", outcome.failed);
        }
        return Ok(());
    }

    println!();
    if outcome.failed == 0 {
        ui::print_ok(&format!(
            "Published to {}/{} target(s).",
            outcome.succeeded, outcome.total
        ));
    } else {
        ui::print_warn(&format!(
            "Finished: {}/{} succeeded, {} failed.",
            outcome.succeeded, outcome.total, outcome.failed
        ));
    }

    Ok(())
}
