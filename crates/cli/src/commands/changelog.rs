use anyhow::{Context, Result, bail};
use comet_core::changelog::render_markdown;

use crate::cli::ChangelogArgs;
use crate::{git, ui};

pub fn run(args: ChangelogArgs) -> Result<()> {
    let from = args.from.or_else(git::latest_tag);
    let to = args.to.as_deref().unwrap_or("HEAD");
    let commits = git::read_commits(from.as_deref(), to, args.limit)?;

    if commits.is_empty() {
        bail!("no commits found in the selected git range");
    }

    let markdown = render_markdown(&commits, args.title.as_deref(), args.all);
    if markdown.is_empty() {
        bail!("all commits in range were filtered out (pass --all to include chores)");
    }

    if let Some(output_path) = &args.output {
        std::fs::write(output_path, format!("{markdown}\n"))
            .with_context(|| format!("failed to write {}", output_path.display()))?;
        ui::print_ok(&format!(
            "Wrote changelog ({} commits) to {}",
            commits.len(),
            output_path.display()
        ));
    } else {
        println!("{markdown}");
    }

    Ok(())
}
