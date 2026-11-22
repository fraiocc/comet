mod plan;
mod prompts;
mod runner;

use anyhow::{Context, Result, bail};
use comet_core::github::{format_bytes, match_asset, normalize_version};
use comet_core::{CliConfig, CometClient, GitHubClient, TargetConfig, VersionType};

use crate::cli::PublishArgs;
use crate::ui;

pub async fn run(args: PublishArgs) -> Result<()> {
    let config = CliConfig::load()?;
    let token = config.resolve_token()?;
    let api_url = config.resolve_api_url();
    let theme = ui::theme();

    let pb = ui::spinner("Loading projects from Comet...");
    let client = CometClient::new(&api_url, &token);
    let workspace = client.fetch_workspace().await?;
    pb.finish_and_clear();

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

    let Some(selected_targets) = prompts::select_targets(&theme, args.yes, enabled_targets)? else {
        ui::print_warn("No targets selected. Publish cancelled.");
        return Ok(());
    };

    let gh_token = std::env::var("GITHUB_TOKEN")
        .ok()
        .filter(|t| !t.trim().is_empty())
        .or(workspace.github_token);
    let gh = GitHubClient::new(gh_token);

    ui::print_step(&format!("Resolving release for {}", project.repo_full_name));
    let pb = ui::spinner("Querying GitHub Releases & commits...");
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
    pb.finish_and_clear();

    let asset = match_asset(&release, &project.asset_pattern)
        .with_context(|| format!("asset pattern '{}'", project.asset_pattern))?;

    ui::print_substep_ok(&format!(
        "{}  ·  {} ({})",
        release.tag_name,
        asset.name,
        format_bytes(asset.size)
    ));
    println!();

    let (changelog_source, base_changelog) = prompts::select_changelog(
        &theme,
        args.yes,
        commit_changelog.as_deref(),
        &release.body,
        project.default_changelog.as_deref(),
    )?;

    plan::print_release_plan(
        project,
        &release,
        asset,
        changelog_source,
        &base_changelog,
        &selected_targets,
        args.dry_run,
    );

    if args.dry_run {
        ui::print_ok("Dry run complete. Nothing was uploaded.");
        return Ok(());
    }

    if !args.yes && !prompts::confirm_publish(&theme)? {
        ui::print_warn("Publish cancelled.");
        return Ok(());
    }

    ui::print_step(&format!("Downloading {}", asset.name));
    let pb = ui::spinner("Fetching artifact from GitHub...");
    let asset_bytes = gh.download_asset(&project.repo_full_name, asset).await?;
    pb.finish_and_clear();
    ui::print_substep_ok(&format!(
        "Downloaded {}",
        format_bytes(asset_bytes.len() as u64)
    ));
    println!();

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
        non_interactive: args.yes,
    })
    .await?;

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
