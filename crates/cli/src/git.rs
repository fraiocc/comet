use std::process::Command;

use anyhow::{Context, Result, bail};
use comet_core::changelog::CommitEntry;

pub fn detect_github_repo() -> Option<String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8(output.stdout).ok()?;
    parse_github_remote(raw.trim())
}

pub fn parse_github_remote(remote: &str) -> Option<String> {
    let trimmed = remote.trim().trim_end_matches(".git").trim_end_matches('/');

    let path = if let Some(rest) = trimmed.strip_prefix("git@github.com:") {
        rest
    } else {
        let idx = trimmed.find("github.com/")?;
        &trimmed[idx + "github.com/".len()..]
    };

    let mut parts = path.split('/');
    let owner = parts.next()?.trim();
    let repo = parts.next()?.trim();
    if owner.is_empty() || repo.is_empty() || parts.next().is_some() {
        return None;
    }

    Some(format!("{owner}/{repo}"))
}

pub fn latest_tag() -> Option<String> {
    let output = Command::new("git")
        .args(["describe", "--tags", "--abbrev=0"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let tag = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if tag.is_empty() { None } else { Some(tag) }
}

pub fn read_commits(from: Option<&str>, to: &str, max: usize) -> Result<Vec<CommitEntry>> {
    let range = match from {
        Some(base) if !base.trim().is_empty() => format!("{}..{}", base.trim(), to.trim()),
        _ => to.trim().to_string(),
    };
    let max_arg = format!("--max-count={}", max.clamp(1, 500));
    let output = Command::new("git")
        .args([
            "log",
            &range,
            &max_arg,
            "--pretty=format:%H%x1f%s%x1f%b%x1e",
        ])
        .output()
        .context("failed to execute git log")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        bail!("git log failed: {}", stderr.trim());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();
    for record in stdout.split('\x1e') {
        let trimmed = record.trim();
        if trimmed.is_empty() {
            continue;
        }
        let mut fields = trimmed.split('\x1f');
        let sha = fields.next().unwrap_or("").trim().to_string();
        let subject = fields.next().unwrap_or("").trim().to_string();
        let body = fields.next().unwrap_or("").trim().to_string();
        if !sha.is_empty() && !subject.is_empty() {
            commits.push(CommitEntry { sha, subject, body });
        }
    }

    Ok(commits)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_https_and_ssh_remotes() {
        assert_eq!(
            parse_github_remote("https://github.com/fraiocc/comet.git"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(
            parse_github_remote("git@github.com:fraiocc/comet.git"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(
            parse_github_remote("https://github.com/fraiocc/comet/"),
            Some("fraiocc/comet".to_string())
        );
        assert_eq!(parse_github_remote("https://gitlab.com/a/b.git"), None);
    }
}
