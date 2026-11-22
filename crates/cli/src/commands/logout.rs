use anyhow::Result;
use comet_core::CliConfig;

use crate::ui;

pub fn run() -> Result<()> {
    let mut config = CliConfig::load()?;
    config.token = None;
    config.save()?;
    ui::print_ok("Logged out.");
    Ok(())
}
