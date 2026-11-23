use anyhow::{Context, Result};
use comet_core::github::format_bytes;
use comet_core::inspect::inspect_file;

use crate::cli::InspectArgs;
use crate::ui;

pub fn run(args: InspectArgs) -> Result<()> {
    let meta = inspect_file(&args.file)
        .with_context(|| format!("failed to inspect {}", args.file.display()))?;

    if args.json {
        println!("{}", serde_json::to_string_pretty(&meta)?);
        return Ok(());
    }

    let mut lines = vec![
        format!(
            "{}  {} {}",
            ui::muted("Artifact    "),
            ui::starlight_bold(&meta.file_name),
            ui::muted(&format!("({})", format_bytes(meta.size_bytes)))
        ),
        format!("{}  {}", ui::muted("SHA-256     "), ui::sky(&meta.sha256)),
    ];

    if let Some(name) = &meta.name {
        let id_suffix = meta
            .id
            .as_deref()
            .filter(|id| *id != name.as_str())
            .map(|id| format!(" ({id})"))
            .unwrap_or_default();
        lines.push(format!(
            "{}  {}{}",
            ui::muted("Name        "),
            ui::starlight(name),
            ui::muted(&id_suffix)
        ));
    }

    if let Some(version) = &meta.version {
        lines.push(format!(
            "{}  {}",
            ui::muted("Version     "),
            ui::mint_bold(version)
        ));
    }

    if !meta.loaders.is_empty() {
        lines.push(format!(
            "{}  {}",
            ui::muted("Loaders     "),
            ui::sky(&meta.loaders.join(", "))
        ));
    } else {
        lines.push(format!(
            "{}  {}",
            ui::muted("Loaders     "),
            ui::amber("none detected (not a Minecraft mod/plugin JAR?)")
        ));
    }

    if let Some(api) = &meta.api_version {
        lines.push(format!(
            "{}  {}",
            ui::muted("API Version "),
            ui::starlight(api)
        ));
    }

    if !meta.authors.is_empty() {
        lines.push(format!(
            "{}  {}",
            ui::muted("Authors     "),
            ui::starlight(&meta.authors.join(", "))
        ));
    }

    if !meta.dependencies.is_empty() {
        lines.push(format!(
            "{}  {}",
            ui::muted("Dependencies"),
            ui::muted(&meta.dependencies.join(", "))
        ));
    }

    if !meta.descriptors_found.is_empty() {
        lines.push(format!(
            "{}  {}",
            ui::muted("Descriptors "),
            ui::muted(&meta.descriptors_found.join(", "))
        ));
    }

    ui::print_box(&ui::starlight_bold("Artifact Inspection"), &lines);
    println!();
    Ok(())
}
