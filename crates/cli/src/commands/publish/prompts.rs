use anyhow::{Context, Result};
use comet_core::{ProjectConfig, TargetConfig};
use dialoguer::theme::ColorfulTheme;
use dialoguer::{Confirm, Input, MultiSelect, Select};

use crate::ui;

pub fn select_project<'a>(
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

pub fn select_targets(
    theme: &ColorfulTheme,
    non_interactive: bool,
    enabled_targets: Vec<TargetConfig>,
) -> Result<Option<Vec<TargetConfig>>> {
    if non_interactive || enabled_targets.len() <= 1 {
        return Ok(Some(enabled_targets));
    }

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
    let picked = MultiSelect::with_theme(theme)
        .with_prompt("Targets for this release (Space to toggle)")
        .items(&labels)
        .defaults(&defaults)
        .interact()?;

    let chosen: Vec<TargetConfig> = picked
        .into_iter()
        .map(|idx| enabled_targets[idx].clone())
        .collect();
    if chosen.is_empty() {
        return Ok(None);
    }

    Ok(Some(chosen))
}

pub fn select_changelog(
    theme: &ColorfulTheme,
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

pub fn confirm_publish(theme: &ColorfulTheme) -> Result<bool> {
    let confirmed = Confirm::with_theme(theme)
        .with_prompt("Publish this release?")
        .default(true)
        .interact()?;
    if confirmed {
        println!();
    }
    Ok(confirmed)
}

pub fn clean_preview_line(line: &str) -> String {
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
