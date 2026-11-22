use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::Deserialize;

use crate::error::{CometError, Result};
use crate::models::{ReleaseAsset, ReleaseInfo};

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Deserialize)]
struct GitHubCommitItem {
    sha: String,
    commit: GitHubCommitDetail,
}

#[derive(Deserialize)]
struct GitHubCommitDetail {
    message: String,
}

#[derive(Deserialize)]
struct GitHubCompareResponse {
    commits: Vec<GitHubCommitItem>,
}

#[derive(Deserialize)]
struct GitHubTagRelease {
    tag_name: String,
}

pub struct GitHubClient {
    http: reqwest::Client,
    token: Option<String>,
}

impl GitHubClient {
    pub fn new(token: Option<String>) -> Self {
        Self {
            http: reqwest::Client::new(),
            token,
        }
    }

    pub async fn fetch_latest_release(&self, repo: &str) -> Result<ReleaseInfo> {
        let url = format!("{GITHUB_API_BASE}/repos/{repo}/releases/latest");
        self.get_release(&url, repo).await
    }

    pub async fn fetch_release_by_tag(&self, repo: &str, tag: &str) -> Result<ReleaseInfo> {
        let url = format!("{GITHUB_API_BASE}/repos/{repo}/releases/tags/{tag}");
        self.get_release(&url, repo).await
    }

    pub async fn download_asset(&self, repo: &str, asset: &ReleaseAsset) -> Result<Vec<u8>> {
        let req = if let Some(token) = &self.token {
            let api_url = format!(
                "{GITHUB_API_BASE}/repos/{repo}/releases/assets/{}",
                asset.id
            );
            self.http
                .get(api_url)
                .header(USER_AGENT, "comet-cli/0.1.0")
                .header(ACCEPT, "application/octet-stream")
                .header(AUTHORIZATION, format!("Bearer {token}"))
        } else {
            self.http
                .get(&asset.browser_download_url)
                .header(USER_AGENT, "comet-cli/0.1.0")
        };

        let resp = req.send().await?;
        let status = resp.status();
        if !status.is_success() {
            return Err(CometError::Api {
                status: status.as_u16(),
                message: format!("failed to download asset {}", asset.name),
            });
        }
        Ok(resp.bytes().await?.to_vec())
    }

    pub async fn fetch_tag_commit_message(&self, repo: &str, tag: &str) -> Option<String> {
        let commit_url = format!("{GITHUB_API_BASE}/repos/{repo}/commits/{tag}");
        let resp = self.authed_get(&commit_url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let commit = resp.json::<GitHubCommitItem>().await.ok()?;
        let msg = commit.commit.message.trim();
        if msg.is_empty() {
            None
        } else {
            Some(msg.to_string())
        }
    }

    pub async fn fetch_commit_changelog(&self, repo: &str, tag: &str) -> Option<String> {
        if let Some(full_msg) = self.fetch_tag_commit_message(repo, tag).await
            && full_msg.lines().count() > 1
        {
            return Some(full_msg);
        }

        let prev_tag = self.find_previous_tag(repo, tag).await;

        if let Some(prev) = prev_tag {
            let url = format!("{GITHUB_API_BASE}/repos/{repo}/compare/{prev}...{tag}");
            if let Ok(resp) = self.authed_get(&url).send().await
                && resp.status().is_success()
                && let Ok(compare) = resp.json::<GitHubCompareResponse>().await
                && !compare.commits.is_empty()
            {
                let lines: Vec<String> = compare
                    .commits
                    .iter()
                    .rev()
                    .take(20)
                    .map(|c| {
                        let first_line = c.commit.message.lines().next().unwrap_or("").trim();
                        let short_sha = &c.sha[..c.sha.len().min(7)];
                        format!("- {first_line} (`{short_sha}`)")
                    })
                    .collect();
                if !lines.is_empty() {
                    return Some(lines.join("\n"));
                }
            }
        }

        self.fetch_tag_commit_message(repo, tag).await
    }

    async fn find_previous_tag(&self, repo: &str, current_tag: &str) -> Option<String> {
        let url = format!("{GITHUB_API_BASE}/repos/{repo}/releases?per_page=10");
        let resp = self.authed_get(&url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let releases = resp.json::<Vec<GitHubTagRelease>>().await.ok()?;
        let pos = releases.iter().position(|r| r.tag_name == current_tag)?;
        releases.get(pos + 1).map(|r| r.tag_name.clone())
    }

    fn authed_get(&self, url: &str) -> reqwest::RequestBuilder {
        let mut req = self
            .http
            .get(url)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(ACCEPT, "application/vnd.github+json");
        if let Some(token) = &self.token {
            req = req.header(AUTHORIZATION, format!("Bearer {token}"));
        }
        req
    }

    async fn get_release(&self, url: &str, repo: &str) -> Result<ReleaseInfo> {
        let mut req = self
            .http
            .get(url)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(ACCEPT, "application/vnd.github+json");
        if let Some(token) = &self.token {
            req = req.header(AUTHORIZATION, format!("Bearer {token}"));
        }

        let resp = req.send().await?;
        let status = resp.status();
        if status.as_u16() == 404 {
            return Err(CometError::ReleaseNotFound {
                repo: repo.to_string(),
            });
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Api {
                status: status.as_u16(),
                message: body,
            });
        }

        Ok(resp.json::<ReleaseInfo>().await?)
    }
}

pub fn match_asset<'a>(release: &'a ReleaseInfo, pattern: &str) -> Result<&'a ReleaseAsset> {
    let trimmed = pattern.trim();
    let matched = release.assets.iter().find(|asset| {
        if trimmed.is_empty() || trimmed == "*" {
            return true;
        }
        if let Some(suffix) = trimmed.strip_prefix('*') {
            return asset.name.ends_with(suffix);
        }
        if let Some(prefix) = trimmed.strip_suffix('*') {
            return asset.name.starts_with(prefix);
        }
        asset.name == trimmed
    });

    matched.ok_or_else(|| CometError::AssetNotFound {
        tag: release.tag_name.clone(),
    })
}

pub fn normalize_version(tag: &str) -> String {
    tag.strip_prefix('v').unwrap_or(tag).to_string()
}

pub fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        return format!("{bytes} B");
    }
    if bytes < 1024 * 1024 {
        return format!("{:.1} KB", bytes as f64 / 1024.0);
    }
    format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_release() -> ReleaseInfo {
        ReleaseInfo {
            tag_name: "v1.2.0".to_string(),
            name: "v1.2.0".to_string(),
            body: "Initial release".to_string(),
            prerelease: false,
            draft: false,
            html_url: "https://github.com/org/repo/releases/tag/v1.2.0".to_string(),
            assets: vec![
                ReleaseAsset {
                    id: 1,
                    name: "my-plugin-1.2.0.jar".to_string(),
                    size: 1024,
                    browser_download_url: "https://example.com/plugin.jar".to_string(),
                },
                ReleaseAsset {
                    id: 2,
                    name: "checksums.txt".to_string(),
                    size: 64,
                    browser_download_url: "https://example.com/checksums.txt".to_string(),
                },
            ],
        }
    }

    #[test]
    fn matches_wildcard_suffix() {
        let release = sample_release();
        let asset = match_asset(&release, "*.jar").expect("should match jar");
        assert_eq!(asset.name, "my-plugin-1.2.0.jar");
    }

    #[test]
    fn matches_wildcard_prefix() {
        let release = sample_release();
        let asset = match_asset(&release, "checksums*").expect("should match prefix");
        assert_eq!(asset.name, "checksums.txt");
    }

    #[test]
    fn matches_exact_name() {
        let release = sample_release();
        let asset = match_asset(&release, "checksums.txt").expect("should match exact");
        assert_eq!(asset.id, 2);
    }

    #[test]
    fn returns_error_when_missing() {
        let release = sample_release();
        let err = match_asset(&release, "*.zip").unwrap_err();
        assert!(matches!(err, CometError::AssetNotFound { .. }));
    }

    #[test]
    fn strips_v_prefix() {
        assert_eq!(normalize_version("v1.2.0"), "1.2.0");
        assert_eq!(normalize_version("1.2.0"), "1.2.0");
    }

    #[test]
    fn formats_byte_sizes() {
        assert_eq!(format_bytes(512), "512 B");
        assert_eq!(format_bytes(2048), "2.0 KB");
        assert_eq!(format_bytes(1024 * 1024 * 3), "3.00 MB");
    }
}
