use anyhow::Result;
use comet_core::history::LocalHistoryStore;

use crate::cli::HistoryArgs;
use crate::ui;

pub fn run(args: HistoryArgs) -> Result<()> {
    let all_records = LocalHistoryStore::load()?;
    let records = LocalHistoryStore::filter_recent(&all_records, args.repo.as_deref(), args.limit);

    if args.json {
        println!("{}", serde_json::to_string_pretty(&records)?);
        return Ok(());
    }

    if records.is_empty() {
        ui::print_warn("No local publish history recorded yet.");
        return Ok(());
    }

    let mut lines = Vec::with_capacity(records.len());
    for rec in &records {
        let ok_count = rec.results.iter().filter(|r| r.status == "success").count();
        let total = rec.results.len();
        let status_badge = if total > 0 && ok_count == total {
            ui::mint_bold(&format!("{ok_count}/{total} ok"))
        } else if ok_count > 0 {
            ui::amber(&format!("{ok_count}/{total} ok"))
        } else {
            ui::coral(&format!("{ok_count}/{total} ok"))
        };

        let targets = rec
            .results
            .iter()
            .map(|r| r.kind.as_str())
            .collect::<Vec<_>>()
            .join(", ");

        lines.push(format!(
            "{}  {}  {}  {}",
            ui::sky_bold(&format!("{:<10}", rec.tag)),
            ui::starlight(&rec.repo),
            status_badge,
            ui::muted(&format!("({targets})"))
        ));
    }

    ui::print_box(&ui::starlight_bold("Local Publish History"), &lines);
    println!();
    Ok(())
}
