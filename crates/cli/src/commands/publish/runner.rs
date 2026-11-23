use std::sync::Arc;

use anyhow::Result;
use comet_core::{
    CometClient, ProjectConfig, PublishRequest, PublishResult, PublishResultItem,
    PublisherRegistry, RecordHistoryRequest, ReleaseInfo, RetryPolicy, TargetConfig, TargetKind,
    VersionType, retry_async,
};
use dialoguer::Confirm;
use dialoguer::theme::ColorfulTheme;
use tokio::task::JoinSet;

use crate::ui;

pub struct ExecutionContext<'a> {
    pub client: &'a CometClient,
    pub theme: &'a ColorfulTheme,
    pub project: &'a ProjectConfig,
    pub release: &'a ReleaseInfo,
    pub asset_name: &'a str,
    pub asset_bytes: &'a [u8],
    pub version_number: &'a str,
    pub version_type: VersionType,
    pub base_changelog: &'a str,
    pub targets: Vec<TargetConfig>,
    pub non_interactive: bool,
    pub sequential: bool,
    pub json_output: bool,
}

pub struct ExecutionOutcome {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub results: Vec<PublishResultItem>,
}

pub async fn execute_targets(ctx: ExecutionContext<'_>) -> Result<ExecutionOutcome> {
    if ctx.targets.len() > 1 && !ctx.sequential {
        execute_parallel(ctx).await
    } else {
        execute_sequential(ctx).await
    }
}

async fn execute_parallel(ctx: ExecutionContext<'_>) -> Result<ExecutionOutcome> {
    let total = ctx.targets.len();
    if !ctx.json_output {
        ui::print_step(&format!("Publishing to {total} targets in parallel"));
    }
    let pb = if ctx.json_output {
        None
    } else {
        Some(ui::spinner("Uploading release artifacts concurrently..."))
    };

    let shared_bytes = Arc::new(ctx.asset_bytes.to_vec());
    let repo_full_name = ctx.project.repo_full_name.clone();
    let release = ctx.release.clone();
    let asset_name = ctx.asset_name.to_string();
    let version_number = ctx.version_number.to_string();
    let version_type = ctx.version_type;
    let base_changelog = ctx.base_changelog.to_string();

    let mut set: JoinSet<(
        usize,
        TargetConfig,
        PublishRequest,
        comet_core::Result<PublishResult>,
    )> = JoinSet::new();

    for (idx, target) in ctx.targets.into_iter().enumerate() {
        let bytes = Arc::clone(&shared_bytes);
        let repo = repo_full_name.clone();
        let rel = release.clone();
        let name = asset_name.clone();
        let ver = version_number.clone();
        let base_log = base_changelog.clone();

        set.spawn(async move {
            let changelog = target
                .description_override
                .clone()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or(base_log);
            let req = PublishRequest {
                repo_full_name: repo,
                release: rel,
                asset_name: name,
                asset_bytes: (*bytes).clone(),
                version_number: ver,
                version_type,
                changelog,
                target: target.clone(),
            };
            let registry = PublisherRegistry::default();
            let res = match registry.get(target.kind) {
                Ok(publisher) => {
                    let policy = RetryPolicy::default();
                    retry_async(&policy, |_| publisher.publish(&req)).await
                }
                Err(err) => Err(err),
            };
            (idx, target, req, res)
        });
    }

    let mut completed = Vec::with_capacity(total);
    while let Some(joined) = set.join_next().await {
        if let Ok(item) = joined {
            completed.push(item);
        }
    }
    if let Some(bar) = pb {
        bar.finish_and_clear();
    }
    completed.sort_by_key(|(idx, _, _, _)| *idx);

    let registry = PublisherRegistry::default();
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut history_results: Vec<PublishResultItem> = Vec::with_capacity(total);
    let mut first_error: Option<comet_core::CometError> = None;

    for (_, target, req, res) in completed {
        match res {
            Ok(result) => {
                succeeded += 1;
                history_results.push(success_item(&target, result.url.clone()));
                if !ctx.json_output {
                    print_upload_success(
                        &format!("{} ({})", target.kind, target.external_project_id),
                        ctx.version_number,
                        result.url.as_deref(),
                        &result.version_id,
                    );
                }
            }
            Err(err) => {
                let err_msg = err.to_string();
                if !ctx.json_output {
                    ui::print_substep_err(&format!(
                        "{} ({}): {err_msg}",
                        target.kind, target.external_project_id
                    ));
                }

                let recovered = if !ctx.json_output
                    && let Ok(publisher) = registry.get(target.kind)
                {
                    let (ok, _) = try_hangar_recovery(
                        publisher.as_ref(),
                        &req,
                        &target,
                        ctx.version_number,
                        ctx.theme,
                        ctx.non_interactive,
                        &err_msg,
                        &mut history_results,
                    )
                    .await?;
                    ok
                } else {
                    false
                };

                if recovered {
                    succeeded += 1;
                    continue;
                }

                failed += 1;
                history_results.push(PublishResultItem {
                    kind: target.kind.to_string(),
                    external_project_id: target.external_project_id.clone(),
                    status: "failed".to_string(),
                    url: None,
                    error: Some(err_msg),
                });
                if first_error.is_none() {
                    first_error = Some(err);
                }
            }
        }
    }

    if !history_results.is_empty() {
        let _ = comet_core::history::LocalHistoryStore::append(
            comet_core::history::LocalPublishRecord::now(
                &ctx.project.repo_full_name,
                &ctx.release.tag_name,
                ctx.asset_name,
                history_results.clone(),
            ),
        );
        record_history(
            ctx.client,
            &ctx.project.id,
            &ctx.release.tag_name,
            ctx.asset_name,
            history_results.clone(),
            !ctx.json_output,
        )
        .await;
    }

    if ctx.non_interactive
        && !ctx.json_output
        && let Some(err) = first_error
    {
        return Err(err.into());
    }

    Ok(ExecutionOutcome {
        total,
        succeeded,
        failed,
        results: history_results,
    })
}

async fn execute_sequential(ctx: ExecutionContext<'_>) -> Result<ExecutionOutcome> {
    let registry = PublisherRegistry::default();
    let policy = RetryPolicy::default();
    let total = ctx.targets.len();
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    let mut history_results: Vec<PublishResultItem> = Vec::with_capacity(total);

    for (idx, target) in ctx.targets.into_iter().enumerate() {
        let publisher = registry.get(target.kind)?;
        let changelog = target
            .description_override
            .clone()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| ctx.base_changelog.to_string());

        let req = PublishRequest {
            repo_full_name: ctx.project.repo_full_name.clone(),
            release: ctx.release.clone(),
            asset_name: ctx.asset_name.to_string(),
            asset_bytes: ctx.asset_bytes.to_vec(),
            version_number: ctx.version_number.to_string(),
            version_type: ctx.version_type,
            changelog,
            target: target.clone(),
        };

        if !ctx.json_output {
            ui::print_step(&format!(
                "Publishing to {} ({})",
                target.kind, target.external_project_id
            ));
        }
        let pb = if ctx.json_output {
            None
        } else {
            Some(ui::spinner("Uploading release artifact..."))
        };
        match retry_async(&policy, |_| publisher.publish(&req)).await {
            Ok(result) => {
                if let Some(bar) = pb {
                    bar.finish_and_clear();
                }
                succeeded += 1;
                history_results.push(success_item(&target, result.url.clone()));
                if !ctx.json_output {
                    print_upload_success(
                        &target.kind.to_string(),
                        ctx.version_number,
                        result.url.as_deref(),
                        &result.version_id,
                    );
                }
            }
            Err(err) => {
                if let Some(bar) = pb {
                    bar.finish_and_clear();
                }
                let err_msg = err.to_string();
                if !ctx.json_output {
                    ui::print_substep_err(&err_msg);
                }

                let (recovered, final_err) = if ctx.json_output {
                    (false, err_msg.clone())
                } else {
                    try_hangar_recovery(
                        publisher.as_ref(),
                        &req,
                        &target,
                        ctx.version_number,
                        ctx.theme,
                        ctx.non_interactive,
                        &err_msg,
                        &mut history_results,
                    )
                    .await?
                };

                if recovered {
                    succeeded += 1;
                    continue;
                }

                failed += 1;
                history_results.push(PublishResultItem {
                    kind: target.kind.to_string(),
                    external_project_id: target.external_project_id.clone(),
                    status: "failed".to_string(),
                    url: None,
                    error: Some(final_err),
                });

                if ctx.non_interactive {
                    record_history(
                        ctx.client,
                        &ctx.project.id,
                        &ctx.release.tag_name,
                        ctx.asset_name,
                        history_results.clone(),
                        false,
                    )
                    .await;
                    if ctx.json_output {
                        break;
                    }
                    return Err(err.into());
                }

                let remaining = total.saturating_sub(idx + 1);
                if remaining > 0 {
                    let keep_going = Confirm::with_theme(ctx.theme)
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

    if !history_results.is_empty() {
        let _ = comet_core::history::LocalHistoryStore::append(
            comet_core::history::LocalPublishRecord::now(
                &ctx.project.repo_full_name,
                &ctx.release.tag_name,
                ctx.asset_name,
                history_results.clone(),
            ),
        );
        record_history(
            ctx.client,
            &ctx.project.id,
            &ctx.release.tag_name,
            ctx.asset_name,
            history_results.clone(),
            !ctx.json_output,
        )
        .await;
    }

    Ok(ExecutionOutcome {
        total,
        succeeded,
        failed,
        results: history_results,
    })
}

#[allow(clippy::too_many_arguments)]
async fn try_hangar_recovery(
    publisher: &dyn comet_core::Publisher,
    req: &PublishRequest,
    target: &TargetConfig,
    version_number: &str,
    theme: &ColorfulTheme,
    non_interactive: bool,
    err_msg: &str,
    history_results: &mut Vec<PublishResultItem>,
) -> Result<(bool, String)> {
    if non_interactive
        || target.kind != TargetKind::Hangar
        || target.dependencies.is_empty()
        || !err_msg.contains("invalid plugin dependency")
    {
        return Ok((false, err_msg.to_string()));
    }

    let retry = Confirm::with_theme(theme)
        .with_prompt("Retry Hangar without plugin dependencies?")
        .default(true)
        .interact()?;
    if !retry {
        return Ok((false, err_msg.to_string()));
    }

    let mut retry_req = req.clone();
    retry_req.target.dependencies.clear();
    let pb = ui::spinner("Retrying Hangar upload...");
    match publisher.publish(&retry_req).await {
        Ok(result) => {
            pb.finish_and_clear();
            history_results.push(success_item(target, result.url.clone()));
            print_upload_success(
                &target.kind.to_string(),
                version_number,
                result.url.as_deref(),
                &result.version_id,
            );
            Ok((true, String::new()))
        }
        Err(retry_err) => {
            pb.finish_and_clear();
            let msg = retry_err.to_string();
            ui::print_substep_err(&msg);
            Ok((false, msg))
        }
    }
}

fn success_item(target: &TargetConfig, url: Option<String>) -> PublishResultItem {
    PublishResultItem {
        kind: target.kind.to_string(),
        external_project_id: target.external_project_id.clone(),
        status: "success".to_string(),
        url,
        error: None,
    }
}

fn print_upload_success(label: &str, version_number: &str, url: Option<&str>, version_id: &str) {
    let detail = match url {
        Some(url) => format!("{label} · {version_number}  →  {url}"),
        None => format!("{label} · Version {version_id} uploaded"),
    };
    ui::print_substep_ok(&detail);
}

async fn record_history(
    client: &CometClient,
    project_id: &str,
    release_tag: &str,
    asset_name: &str,
    results: Vec<PublishResultItem>,
    announce_discord: bool,
) {
    let source = if std::env::var("CI").is_ok() {
        "ci"
    } else {
        "cli"
    };
    if let Ok(discord_sent) = client
        .record_history(&RecordHistoryRequest {
            project_id: project_id.to_string(),
            release_tag: release_tag.to_string(),
            asset_name: asset_name.to_string(),
            source: source.to_string(),
            results,
        })
        .await
        && discord_sent
        && announce_discord
    {
        ui::print_ok("Discord webhook notification sent.");
    }
}
