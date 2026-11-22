use anyhow::{Context, Result, bail};
use comet_core::github::{format_bytes, match_asset, normalize_version};
use comet_core::{
    CliConfig, CometClient, GitHubClient, ProjectConfig, PublishRequest, PublishResultItem,
    PublisherRegistry, RecordHistoryRequest, TargetConfig, TargetKind, VersionType,
};
use dialoguer::{Confirm, Input, MultiSelect, Select};

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

    let project = select_project(&workspace.projects, args.repo.as_deref())?;
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

    let selected_targets = if !args.yes && enabled_targets.len() > 1 {
        let labels: Vec<String> = enabled_targets
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
        let defaults = vec![true; enabled_targets.len()];
        let picked = MultiSelect::with_theme(&theme)
            .with_prompt("Targets for this release (Space to toggle)")
            .items(&labels)
            .defaults(&defaults)
            .interact()?;
        let chosen: Vec<TargetConfig> = picked
            .into_iter()
            .map(|idx| enabled_targets[idx].clone())
            .collect();
        if chosen.is_empty() {
            ui::print_warn("No targets selected. Publish cancelled.");
            return Ok(());
        }
        chosen
    } else {
        enabled_targets
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

    let (changelog_source_label, base_changelog) = select_changelog(
        &theme,
        args.yes,
        commit_changelog.as_deref(),
        &release.body,
        project.default_changelog.as_deref(),
    )?;

    let mut summary_lines = vec![
        format!(
            "{}  {}",
            ui::muted("Repository"),
            ui::starlight_bold(&project.repo_full_name)
        ),
        format!(
            "{}  {} {}",
            ui::muted("Release   "),
            ui::sky_bold(&release.tag_name),
            ui::muted(&release.name)
        ),
        format!(
            "{}  {} {}",
            ui::muted("Artifact  "),
            ui::starlight(&asset.name),
            ui::muted(&format!("({})", format_bytes(asset.size)))
        ),
    ];

    if !base_changelog.is_empty() {
        let first_line = clean_preview_line(base_changelog.lines().next().unwrap_or(""));
        let line_count = base_changelog.lines().count();
        let suffix = if line_count > 1 {
            format!(" (+{} lines)", line_count - 1)
        } else {
            String::new()
        };
        summary_lines.push(format!(
            "{}  {} {}{}",
            ui::muted("Changelog "),
            ui::sky(&format!("[{changelog_source_label}]")),
            ui::starlight(&first_line),
            ui::muted(&suffix)
        ));
    }

    for target in &selected_targets {
        let deps_note = if target.dependencies.is_empty() {
            String::new()
        } else {
            format!(" · {} deps", target.dependencies.len())
        };
        let versions_summary = summarize_versions(&target.game_versions);
        summary_lines.push(format!(
            "{}  {} {} {}",
            ui::muted(&format!("{:<10}", target.kind.to_string())),
            ui::starlight(&target.external_project_id),
            ui::sky(&target.loaders.join(", ")),
            ui::muted(&format!("[{versions_summary}]{deps_note}"))
        ));
    }

    let plan_title = if args.dry_run {
        ui::amber("Dry Run Plan")
    } else {
        ui::starlight_bold("Release Plan")
    };
    ui::print_box(&plan_title, &summary_lines);
    println!();

    if args.dry_run {
        ui::print_ok("Dry run complete. Nothing was uploaded.");
        return Ok(());
    }

    if !args.yes {
        let confirmed = Confirm::with_theme(&theme)
            .with_prompt("Publish this release?")
            .default(true)
            .interact()?;
        if !confirmed {
            ui::print_warn("Publish cancelled.");
            return Ok(());
        }
        println!();
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

    let registry = PublisherRegistry::default();
    let total = selected_targets.len();
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut history_results: Vec<PublishResultItem> = Vec::with_capacity(total);

    for (idx, target) in selected_targets.into_iter().enumerate() {
        let publisher = registry.get(target.kind)?;
        let changelog = target
            .description_override
            .clone()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| base_changelog.clone());

        let req = PublishRequest {
            repo_full_name: project.repo_full_name.clone(),
            release: release.clone(),
            asset_name: asset.name.clone(),
            asset_bytes: asset_bytes.clone(),
            version_number: version_number.clone(),
            version_type,
            changelog,
            target: target.clone(),
        };

        ui::print_step(&format!(
            "Publishing to {} ({})",
            target.kind, target.external_project_id
        ));
        let pb = ui::spinner("Uploading release artifact...");
        match publisher.publish(&req).await {
            Ok(result) => {
                pb.finish_and_clear();
                succeeded += 1;
                history_results.push(PublishResultItem {
                    kind: target.kind.to_string(),
                    external_project_id: target.external_project_id.clone(),
                    status: "success".to_string(),
                    url: result.url.clone(),
                    error: None,
                });
                let detail = match result.url {
                    Some(url) => format!("{version_number}  →  {url}"),
                    None => format!("Version {} uploaded", result.version_id),
                };
                ui::print_substep_ok(&detail);
            }
            Err(err) => {
                pb.finish_and_clear();
                let err_msg = err.to_string();
                ui::print_substep_err(&err_msg);

                let mut recovered = false;
                let mut final_err = err_msg.clone();
                if !args.yes
                    && target.kind == TargetKind::Hangar
                    && !target.dependencies.is_empty()
                    && err_msg.contains("invalid plugin dependency")
                {
                    let retry_without_deps = Confirm::with_theme(&theme)
                        .with_prompt("Retry Hangar without plugin dependencies?")
                        .default(true)
                        .interact()?;

                    if retry_without_deps {
                        let mut retry_req = req.clone();
                        retry_req.target.dependencies.clear();
                        let pb = ui::spinner("Retrying Hangar upload...");
                        match publisher.publish(&retry_req).await {
                            Ok(result) => {
                                pb.finish_and_clear();
                                succeeded += 1;
                                recovered = true;
                                history_results.push(PublishResultItem {
                                    kind: target.kind.to_string(),
                                    external_project_id: target.external_project_id.clone(),
                                    status: "success".to_string(),
                                    url: result.url.clone(),
                                    error: None,
                                });
                                let detail = match result.url {
                                    Some(url) => format!("{version_number}  →  {url}"),
                                    None => format!("Version {} uploaded", result.version_id),
                                };
                                ui::print_substep_ok(&detail);
                            }
                            Err(retry_err) => {
                                pb.finish_and_clear();
                                final_err = retry_err.to_string();
                                ui::print_substep_err(&final_err);
                            }
                        }
                    }
                }

                if !recovered {
                    failed += 1;
                    history_results.push(PublishResultItem {
                        kind: target.kind.to_string(),
                        external_project_id: target.external_project_id.clone(),
                        status: "failed".to_string(),
                        url: None,
                        error: Some(final_err),
                    });
                    if args.yes {
                        let source = if std::env::var("CI").is_ok() {
                            "ci"
                        } else {
                            "cli"
                        };
                        let _ = client
                            .record_history(&RecordHistoryRequest {
                                project_id: project.id.clone(),
                                release_tag: release.tag_name.clone(),
                                asset_name: asset.name.clone(),
                                source: source.to_string(),
                                results: history_results,
                            })
                            .await;
                        return Err(err.into());
                    }
                    let remaining = total.saturating_sub(idx + 1);
                    if remaining > 0 {
                        let keep_going = Confirm::with_theme(&theme)
                            .with_prompt(format!(
                                "Continue publishing to {remaining} remaining target(s)?"
                            ))
                            .default(true)
                            .interact()?;
                        if !keep_going {
                            break;
                        }
                    }
                }
            }
        }
    }

    if !history_results.is_empty() {
        let source = if std::env::var("CI").is_ok() {
            "ci"
        } else {
            "cli"
        };
        if let Ok(discord_sent) = client
            .record_history(&RecordHistoryRequest {
                project_id: project.id.clone(),
                release_tag: release.tag_name.clone(),
                asset_name: asset.name.clone(),
                source: source.to_string(),
                results: history_results,
            })
            .await
            && discord_sent
        {
            ui::print_ok("Discord webhook notification sent.");
        }
    }

    println!();
    if failed == 0 {
        ui::print_ok(&format!("Published to {succeeded}/{total} target(s)."));
    } else {
        ui::print_warn(&format!(
            "Finished: {succeeded}/{total} succeeded, {failed} failed."
        ));
    }

    Ok(())
}

fn select_project<'a>(
    projects: &'a [ProjectConfig],
    repo_flag: Option<&str>,
) -> Result<&'a ProjectConfig> {
    if let Some(repo) = repo_flag {
        return projects
            .iter()
            .find(|p| p.repo_full_name.eq_ignore_ascii_case(repo))
            .with_context(|| format!("project '{repo}' not found in Comet"));
    }

    if projects.len() == 1 {
        return Ok(&projects[0]);
    }

    let items: Vec<String> = projects
        .iter()
        .map(|p| {
            let active: Vec<String> = p
                .targets
                .iter()
                .filter(|t| t.enabled)
                .map(|t| t.kind.to_string())
                .collect();
            let suffix = if active.is_empty() {
                "no active targets".to_string()
            } else {
                active.join(", ")
            };
            format!("{} ({}) · [{}]", p.display_name, p.repo_full_name, suffix)
        })
        .collect();

    let idx = Select::with_theme(&ui::theme())
        .with_prompt("Select a repository")
        .items(&items)
        .default(0)
        .interact()?;

    Ok(&projects[idx])
}

fn select_changelog(
    theme: &dialoguer::theme::ColorfulTheme,
    non_interactive: bool,
    commit_msg: Option<&str>,
    release_body: &str,
    default_changelog: Option<&str>,
) -> Result<(&'static str, String)> {
    let commit_clean = commit_msg
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string);
    let release_clean = {
        let trimmed = release_body.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    };

    if non_interactive {
        if let Some(msg) = commit_clean {
            return Ok(("commit", msg));
        }
        if let Some(body) = release_clean {
            return Ok(("release", body));
        }
        return Ok(("default", default_changelog.unwrap_or_default().to_string()));
    }

    let mut options: Vec<(&'static str, String, Option<String>)> = Vec::new();
    if let Some(msg) = commit_clean {
        let preview = clean_preview_line(msg.lines().next().unwrap_or(""));
        let lines = msg.lines().count();
        options.push((
            "commit",
            format!("Commit message ({lines} lines) · {preview}"),
            Some(msg),
        ));
    }
    if let Some(body) = release_clean {
        let preview = clean_preview_line(body.lines().next().unwrap_or(""));
        let lines = body.lines().count();
        options.push((
            "release",
            format!("GitHub Release notes ({lines} lines) · {preview}"),
            Some(body),
        ));
    }
    options.push(("custom", "Write custom changelog".to_string(), None));

    let labels: Vec<&str> = options.iter().map(|(_, l, _)| l.as_str()).collect();
    let idx = Select::with_theme(theme)
        .with_prompt("Changelog source")
        .items(&labels)
        .default(0)
        .interact()?;

    println!();
    let (source, _, content) = &options[idx];
    if let Some(text) = content {
        return Ok((source, text.clone()));
    }

    let custom: String = Input::with_theme(theme)
        .with_prompt("Changelog text")
        .allow_empty(true)
        .interact_text()?;
    println!();
    Ok(("custom", custom))
}

fn summarize_versions(versions: &[String]) -> String {
    if versions.len() <= 4 {
        return versions.join(", ");
    }
    format!(
        "{} .. {} ({} versions)",
        versions[0],
        versions[versions.len() - 1],
        versions.len()
    )
}

fn clean_preview_line(line: &str) -> String {
    let cleaned: String = line
        .chars()
        .filter(|c| c.is_ascii() || c.is_alphanumeric() || c.is_whitespace())
        .collect();
    let trimmed = cleaned.trim().trim_start_matches('#').trim();
    let mut out: String = trimmed.chars().take(46).collect();
    if trimmed.chars().count() > 46 {
        out.push_str("...");
    }
    out
}
