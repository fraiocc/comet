use anyhow::Result;
use comet_core::{CliConfig, CometClient};
use dialoguer::Password;

use crate::cli::LoginArgs;
use crate::ui;

pub async fn run(args: LoginArgs) -> Result<()> {
    let mut config = CliConfig::load()?;
    let api_url = config.resolve_api_url();
    let theme = ui::theme();

    let token = match args.token {
        Some(t) => t,
        None => {
            println!(
                "  {} Generate a CLI token at {}",
                ui::muted("→"),
                ui::sky(&format!("{api_url}/dashboard"))
            );
            Password::with_theme(&theme)
                .with_prompt("CLI Token")
                .interact()?
        }
    };

    ui::print_step("Authenticating with Comet");
    let pb = ui::spinner("Verifying CLI token...");
    let client = CometClient::new(&api_url, &token);
    let user = client.whoami().await?;
    pb.finish_and_clear();

    config.token = Some(token);
    config.save()?;

    ui::print_substep_ok(&format!("Signed in as @{}", user.username));
    Ok(())
}
