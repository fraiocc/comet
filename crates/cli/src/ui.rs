use std::time::Duration;

use console::{Style, measure_text_width, style};
use dialoguer::theme::ColorfulTheme;
use indicatif::{ProgressBar, ProgressStyle};

pub fn rgb(text: &str, r: u8, g: u8, b: u8, bold: bool) -> String {
    if !console::colors_enabled() {
        return text.to_string();
    }
    if bold {
        format!("\x1b[1;38;2;{r};{g};{b}m{text}\x1b[0m")
    } else {
        format!("\x1b[38;2;{r};{g};{b}m{text}\x1b[0m")
    }
}

pub fn starlight(text: &str) -> String {
    rgb(text, 244, 252, 255, false)
}

pub fn starlight_bold(text: &str) -> String {
    rgb(text, 244, 252, 255, true)
}

pub fn sky(text: &str) -> String {
    rgb(text, 156, 196, 255, false)
}

pub fn sky_bold(text: &str) -> String {
    rgb(text, 156, 196, 255, true)
}

pub fn indigo(text: &str) -> String {
    rgb(text, 130, 150, 255, false)
}

pub fn violet(text: &str) -> String {
    rgb(text, 160, 112, 255, false)
}

pub fn mint_bold(text: &str) -> String {
    rgb(text, 110, 231, 183, true)
}

pub fn amber(text: &str) -> String {
    rgb(text, 252, 211, 77, false)
}

pub fn coral(text: &str) -> String {
    rgb(text, 253, 164, 175, false)
}

pub fn muted(text: &str) -> String {
    rgb(text, 142, 141, 164, false)
}

pub fn border(text: &str) -> String {
    rgb(text, 64, 63, 82, false)
}

pub fn ice(text: &str) -> String {
    rgb(text, 205, 234, 255, false)
}

pub fn theme() -> ColorfulTheme {
    ColorfulTheme {
        defaults_style: Style::new().color256(244),
        prompt_style: Style::new().color256(255).bold(),
        prompt_prefix: style(">".to_string()).color256(111).bold(),
        prompt_suffix: style(":".to_string()).color256(240),
        success_prefix: style("✓".to_string()).color256(115).bold(),
        success_suffix: style(":".to_string()).color256(240),
        error_prefix: style("✗".to_string()).color256(210).bold(),
        active_item_prefix: style(">".to_string()).color256(111).bold(),
        active_item_style: Style::new().color256(153).bold(),
        inactive_item_prefix: style(" ".to_string()),
        inactive_item_style: Style::new().color256(245),
        checked_item_prefix: style("[x]".to_string()).color256(115).bold(),
        unchecked_item_prefix: style("[ ]".to_string()).color256(241),
        picked_item_prefix: style(">".to_string()).color256(111).bold(),
        unpicked_item_prefix: style(" ".to_string()),
        values_style: Style::new().color256(153),
        ..ColorfulTheme::default()
    }
}

pub fn spinner(message: &str) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::with_template("  {spinner:.111} {msg}")
            .unwrap_or_else(|_| ProgressStyle::default_spinner())
            .tick_strings(&["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]),
    );
    pb.set_message(muted(message));
    pb.enable_steady_tick(Duration::from_millis(70));
    pb
}

pub fn print_box(title: &str, lines: &[String]) {
    let min_width = 58usize;
    let content_max = lines
        .iter()
        .map(|l| measure_text_width(l))
        .max()
        .unwrap_or(0);
    let title_width = measure_text_width(title);
    let inner_width = content_max.max(title_width + 4).max(min_width);

    let top_dashes = inner_width.saturating_sub(title_width + 3);
    println!(
        "  {}{}{}{}{}",
        border("╭─ "),
        title,
        border(" "),
        border(&"─".repeat(top_dashes)),
        border("╮")
    );

    for line in lines {
        let vis = measure_text_width(line);
        let pad = inner_width.saturating_sub(vis + 2);
        println!(
            "  {} {}{} {}",
            border("│"),
            line,
            " ".repeat(pad),
            border("│")
        );
    }

    println!(
        "  {}{}{}",
        border("╰"),
        border(&"─".repeat(inner_width)),
        border("╯")
    );
}

pub fn print_welcome(account: Option<&str>, api_url: &str, project_count: Option<usize>) {
    println!();
    let title = format!(
        "{} {}",
        starlight_bold("Comet"),
        muted(&format!("v{}", env!("CARGO_PKG_VERSION")))
    );

    let account_line = match account {
        Some(user) => format!("{}  {}", muted("Account "), mint_bold(&format!("@{user}"))),
        None => format!("{}  {}", muted("Account "), amber("not connected")),
    };

    let endpoint_line = format!("{}  {}", muted("Endpoint"), sky(api_url));
    let workspace_line = match project_count {
        Some(n) => format!(
            "{}  {}",
            muted("Projects"),
            starlight(&format!("{n} configured"))
        ),
        None => format!(
            "{}  {}",
            muted("Tip     "),
            muted("Type 'account' to connect your workspace")
        ),
    };

    let logo_1 = format!("         {}   ", violet("▄█▀"));
    let logo_2 = format!("       {}    ", indigo("▄██▀"));
    let logo_3 = format!("     {}     ", sky("▄███▀"));
    let logo_4 = format!("   {}      ", ice("▄████▀"));
    let logo_5 = format!("  {}      ", starlight_bold("▀███▀"));

    let row_1 = format!("{logo_1}  {}", starlight_bold("Release Publisher"));
    let row_2 = format!(
        "{logo_2}  {}",
        muted("GitHub Releases -> Modrinth & Hangar")
    );
    let row_3 = format!("{logo_3}  {account_line}");
    let row_4 = format!("{logo_4}  {endpoint_line}");
    let row_5 = format!("{logo_5}  {workspace_line}");

    print_box(
        &title,
        &[
            String::new(),
            row_1,
            row_2,
            row_3,
            row_4,
            row_5,
            String::new(),
        ],
    );
    println!();
}

pub fn print_compact_header() {
    println!();
    println!(
        "  {} {}",
        starlight_bold("Comet"),
        muted(&format!("v{}", env!("CARGO_PKG_VERSION")))
    );
    println!();
}

pub fn print_step(label: &str) {
    println!("  {} {}", sky(">"), starlight_bold(label));
}

pub fn print_substep_info(detail: &str) {
    println!("    {}  {}", border("|"), muted(detail));
}

pub fn print_substep_ok(detail: &str) {
    println!(
        "    {}  {} {}",
        border("|"),
        mint_bold("✓"),
        starlight(detail)
    );
}

pub fn print_substep_warn(detail: &str) {
    println!("    {}  {} {}", border("|"), amber("!"), amber(detail));
}

pub fn print_substep_err(detail: &str) {
    println!("    {}  {} {}", border("|"), coral("✗"), coral(detail));
}

pub fn print_ok(message: &str) {
    println!("  {} {}", mint_bold("✓"), starlight(message));
}

pub fn print_warn(message: &str) {
    println!("  {} {}", amber("!"), amber(message));
}

pub fn print_err(message: &str) {
    println!("  {} {}", coral("✗"), coral(message));
}
