use comet_core::github::format_bytes;
use comet_core::{ProjectConfig, ReleaseAsset, ReleaseInfo, TargetConfig};

use super::prompts::clean_preview_line;
use crate::ui;

pub fn print_release_plan(
    project: &ProjectConfig,
    release: &ReleaseInfo,
    asset: &ReleaseAsset,
    changelog_source: &str,
    base_changelog: &str,
    selected_targets: &[TargetConfig],
    dry_run: bool,
) {
    let mut lines = vec![
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
        lines.push(format!(
            "{}  {} {}{}",
            ui::muted("Changelog "),
            ui::sky(&format!("[{changelog_source}]")),
            ui::starlight(&first_line),
            ui::muted(&suffix)
        ));
    }

    for target in selected_targets {
        let deps_note = if target.dependencies.is_empty() {
            String::new()
        } else {
            format!(" · {} deps", target.dependencies.len())
        };
        let versions_summary = summarize_versions(&target.game_versions);
        lines.push(format!(
            "{}  {} {} {}",
            ui::muted(&format!("{:<10}", target.kind.to_string())),
            ui::starlight(&target.external_project_id),
            ui::sky(&target.loaders.join(", ")),
            ui::muted(&format!("[{versions_summary}]{deps_note}"))
        ));
    }

    let title = if dry_run {
        ui::amber("Dry Run Plan")
    } else {
        ui::starlight_bold("Release Plan")
    };
    ui::print_box(&title, &lines);
    println!();
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
