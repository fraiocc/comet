use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::Deserialize;

use crate::ui;

const REPO: &str = "fraiocc/comet";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Deserialize)]
struct LatestRelease {
    tag_name: String,
    assets: Vec<ReleaseAsset>,
}

#[derive(Deserialize)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
}

fn parse_semver(raw: &str) -> Option<(u64, u64, u64)> {
    let trimmed = raw.trim().trim_start_matches(['v', 'V']);
    let core = trimmed.split('-').next()?;
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    Some((major, minor, patch))
}

fn is_newer(latest: &str, current: &str) -> bool {
    match (parse_semver(latest), parse_semver(current)) {
        (Some(l), Some(c)) => l > c,
        _ => false,
    }
}

fn backup_path(exe: &Path) -> PathBuf {
    let mut os = exe.as_os_str().to_os_string();
    os.push(".old");
    PathBuf::from(os)
}

fn staging_path(exe: &Path) -> PathBuf {
    let mut os = exe.as_os_str().to_os_string();
    os.push(".new");
    PathBuf::from(os)
}

fn cleanup_previous_backup() {
    if let Ok(exe) = std::env::current_exe() {
        let old = backup_path(&exe);
        if old.exists() {
            let _ = fs::remove_file(old);
        }
    }
}

fn should_skip() -> bool {
    if std::env::var("COMET_NO_UPDATE")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
    {
        return true;
    }
    if std::env::var("CI")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
    {
        return true;
    }
    false
}

pub async fn check_and_update() {
    cleanup_previous_backup();

    if should_skip() {
        return;
    }

    let Ok(client) = reqwest::Client::builder()
        .user_agent(format!("comet-cli/{CURRENT_VERSION}"))
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(4))
        .build()
    else {
        return;
    };

    let url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let Ok(resp) = client.get(&url).send().await else {
        return;
    };
    if !resp.status().is_success() {
        return;
    }
    let Ok(release) = resp.json::<LatestRelease>().await else {
        return;
    };

    if !is_newer(&release.tag_name, CURRENT_VERSION) {
        return;
    }

    let Some(asset) = select_asset(&release.assets) else {
        return;
    };

    let Ok(current_exe) = std::env::current_exe() else {
        return;
    };

    let pb = ui::spinner(&format!(
        "Updating Comet v{CURRENT_VERSION} -> {}...",
        release.tag_name
    ));

    let result = download_and_replace(&asset.browser_download_url, &current_exe).await;
    pb.finish_and_clear();

    match result {
        Ok(()) => {
            ui::print_ok(&format!(
                "Updated Comet to {} (active on next run)",
                release.tag_name
            ));
        }
        Err(err) => {
            ui::print_warn(&format!("Auto-update skipped: {err}"));
        }
    }
}

#[cfg(target_os = "windows")]
fn select_asset(assets: &[ReleaseAsset]) -> Option<&ReleaseAsset> {
    assets
        .iter()
        .find(|a| a.name.eq_ignore_ascii_case("comet-windows-x86_64.exe"))
}

#[cfg(target_os = "linux")]
fn select_asset(assets: &[ReleaseAsset]) -> Option<&ReleaseAsset> {
    assets
        .iter()
        .find(|a| a.name.contains("x86_64-unknown-linux-musl") && a.name.ends_with(".tar.gz"))
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn select_asset(_assets: &[ReleaseAsset]) -> Option<&ReleaseAsset> {
    None
}

async fn download_and_replace(download_url: &str, current_exe: &Path) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent(format!("comet-cli/{CURRENT_VERSION}"))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    install_bytes(&bytes, current_exe)
}

#[cfg(target_os = "windows")]
fn install_bytes(bytes: &[u8], current_exe: &Path) -> Result<(), String> {
    let new_path = staging_path(current_exe);
    let old_path = backup_path(current_exe);

    fs::write(&new_path, bytes).map_err(|e| e.to_string())?;
    if old_path.exists() {
        let _ = fs::remove_file(&old_path);
    }

    if let Err(err) = fs::rename(current_exe, &old_path) {
        let _ = fs::remove_file(&new_path);
        return Err(err.to_string());
    }

    if let Err(err) = fs::rename(&new_path, current_exe) {
        let _ = fs::rename(&old_path, current_exe);
        let _ = fs::remove_file(&new_path);
        return Err(err.to_string());
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn install_bytes(bytes: &[u8], current_exe: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    use std::process::Command;

    let temp_dir = std::env::temp_dir().join(format!("comet-update-{}", std::process::id()));
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let archive = temp_dir.join("comet.tar.gz");
    fs::write(&archive, bytes).map_err(|e| e.to_string())?;

    let status = Command::new("tar")
        .args([
            "-xzf",
            archive.to_str().unwrap_or_default(),
            "-C",
            temp_dir.to_str().unwrap_or_default(),
        ])
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("failed to extract update archive".to_string());
    }

    let extracted = temp_dir.join("comet");
    let new_path = staging_path(current_exe);
    fs::copy(&extracted, &new_path).map_err(|e| {
        let _ = fs::remove_dir_all(&temp_dir);
        e.to_string()
    })?;
    let _ = fs::remove_dir_all(&temp_dir);

    let perms = fs::Permissions::from_mode(0o755);
    fs::set_permissions(&new_path, perms).map_err(|e| e.to_string())?;

    fs::rename(&new_path, current_exe).map_err(|e| {
        let _ = fs::remove_file(&new_path);
        e.to_string()
    })?;

    Ok(())
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn install_bytes(_bytes: &[u8], _current_exe: &Path) -> Result<(), String> {
    Err("unsupported platform".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_semver_versions() {
        assert!(is_newer("v0.2.0", "0.1.0"));
        assert!(is_newer("0.1.1", "0.1.0"));
        assert!(!is_newer("v0.1.0", "0.1.0"));
        assert!(!is_newer("v0.0.9", "0.1.0"));
    }
}
