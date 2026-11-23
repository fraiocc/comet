use anyhow::{Result, bail};
use comet_core::github::format_bytes;
use comet_core::{CliConfig, CometClient, GitHubClient};

use crate::cli::ReleasesArgs;
use crate::{git, ui};

pub async fn run(args: ReleasesArgs) -> Result<()> {
    let config = CliConfig::load().unwrap_or_default();
    let api_url = config.resolve_api_url();
    let mut gh_token = std::env::var("GITHUB_TOKEN")
        .ok()
        .filter(|t| !t.trim().is_empty());

    let repo = if let Some(explicit) = args.repo {
        explicit
    } else if let Some(detected) = git::detect_github_repo() {
        detected
    } else if let Ok(token) = config.resolve_token() {
        let client = CometClient::new(&api_url, &token);
        let workspace = client.fetch_workspace().await?;
        if gh_token.is_none() {
            gh_token = workspace.github_token;
        }
        workspace
            .projects
            .first()
            .map(|p| p.repo_full_name.clone())
            .ok_or_else(|| anyhow::anyhow!("no repository specified; pass --repo owner/name"))?
    } else {
        bail!("not inside a GitHub repo and no --repo provided");
    };

    if gh_token.is_none()
        && let Ok(token) = config.resolve_token()
    {
        let client = CometClient::new(&api_url, &token);
        if let Ok(ws) = client.fetch_workspace().await {
            gh_token = ws.github_token;
        }
    }

    let pb = if args.json {
        None
    } else {
        Some(ui::spinner(&format!("Fetching releases for {repo}...")))
    };
    let gh = GitHubClient::new(gh_token);
    let releases = gh.fetch_releases(&repo, args.limit).await?;
    if let Some(bar) = pb {
        bar.finish_and_clear();
    }

    if args.json {
        println!("{}", serde_json::to_string_pretty(&releases)?);
        return Ok(());
    }

    if releases.is_empty() {
        ui::print_warn(&format!("No GitHub Releases found for {repo}."));
        return Ok(());
    }

    let mut lines = Vec::with_capacity(releases.len());
    for (idx, rel) in releases.iter().enumerate() {
        let tag_col = format!("{:<14}", rel.tag_name);
        let badge = if rel.draft {
            ui::amber("draft")
        } else if rel.prerelease {
            ui::amber("pre  ")
        } else if idx == 0 {
            ui::mint_bold("latest")
        } else {
            ui::muted("rel  ")
        };

        let asset_summary = if let Some(first) = rel.assets.first() {
            let extra = if rel.assets.len() > 1 {
                format!(" (+{})", rel.assets.len() - 1)
            } else {
                String::new()
            };
            format!("{} ({}){extra}", first.name, format_bytes(first.size))
        } else {
            "no assets".to_string()
        };

        lines.push(format!(
            "{}  {}  {}",
            ui::sky_bold(&tag_col),
            badge,
            ui::muted(&asset_summary)
        ));
    }

    ui::print_box(
        &ui::starlight_bold(&format!("GitHub Releases · {repo}")),
        &lines,
    );
    println!();
    Ok(())
}
