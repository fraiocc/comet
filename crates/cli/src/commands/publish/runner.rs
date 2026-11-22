use anyhow::Result;
use comet_core::{
    CometClient, ProjectConfig, PublishRequest, PublishResultItem, PublisherRegistry,
    RecordHistoryRequest, ReleaseInfo, TargetConfig, TargetKind, VersionType,
};
use dialoguer::Confirm;
use dialoguer::theme::ColorfulTheme;

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
}

pub struct ExecutionOutcome {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
}

pub async fn execute_targets(ctx: ExecutionContext<'_>) -> Result<ExecutionOutcome> {
    let registry = PublisherRegistry::default();
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

        ui::print_step(&format!(
            "Publishing to {} ({})",
            target.kind, target.external_project_id
        ));
        let pb = ui::spinner("Uploading release artifact...");
        match publisher.publish(&req).await {
            Ok(result) => {
                pb.finish_and_clear();
                succeeded += 1;
                history_results.push(success_item(&target, result.url.clone()));
                print_upload_success(
                    ctx.version_number,
                    result.url.as_deref(),
                    &result.version_id,
                );
            }
            Err(err) => {
                pb.finish_and_clear();
                let err_msg = err.to_string();
                ui::print_substep_err(&err_msg);

                let (recovered, final_err) = try_hangar_recovery(
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
                        history_results,
                        false,
                    )
                    .await;
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
        record_history(
            ctx.client,
            &ctx.project.id,
            &ctx.release.tag_name,
            ctx.asset_name,
            history_results,
            true,
        )
        .await;
    }

    Ok(ExecutionOutcome {
        total,
        succeeded,
        failed,
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
            print_upload_success(version_number, result.url.as_deref(), &result.version_id);
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

fn print_upload_success(version_number: &str, url: Option<&str>, version_id: &str) {
    let detail = match url {
        Some(url) => format!("{version_number}  →  {url}"),
        None => format!("Version {version_id} uploaded"),
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
