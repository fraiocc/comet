use anyhow::Result;
use comet_core::{CliConfig, CometClient};
use dialoguer::{Input, Password};

use crate::cli::LoginArgs;
use crate::ui;

pub async fn run(args: LoginArgs) -> Result<()> {
    let mut config = CliConfig::load()?;
    let theme = ui::theme();

    let api_url = match args.api_url {
        Some(url) => url,
        None => Input::with_theme(&theme)
            .with_prompt("Comet API URL")
            .default(config.api_url.clone())
            .interact_text()?,
    };

    let token = match args.token {
        Some(t) => t,
        None => {
            println!(
                "  {} Generate a CLI token at {}",
                ui::muted("→"),
                ui::sky(&format!("{}/dashboard", api_url.trim_end_matches('/')))
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

    config.api_url = api_url;
    config.token = Some(token);
    config.save()?;

    ui::print_substep_ok(&format!("Signed in as @{}", user.username));
    Ok(())
}
