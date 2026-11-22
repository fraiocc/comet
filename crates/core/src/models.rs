use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TargetKind {
    Modrinth,
    Hangar,
}

impl std::fmt::Display for TargetKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Modrinth => write!(f, "modrinth"),
            Self::Hangar => write!(f, "hangar"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum VersionType {
    #[default]
    Release,
    Beta,
    Alpha,
}

impl std::fmt::Display for VersionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Release => write!(f, "release"),
            Self::Beta => write!(f, "beta"),
            Self::Alpha => write!(f, "alpha"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfig {
    pub id: String,
    pub repo_full_name: String,
    pub display_name: String,
    pub asset_pattern: String,
    pub default_changelog: Option<String>,
    pub targets: Vec<TargetConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetDependency {
    pub project_id: String,
    pub name: Option<String>,
    pub dependency_type: String,
    #[serde(default)]
    pub external_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetConfig {
    #[serde(default)]
    pub id: String,
    pub kind: TargetKind,
    pub enabled: bool,
    pub external_project_id: String,
    pub token: String,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
    #[serde(default)]
    pub dependencies: Vec<TargetDependency>,
    pub channel: Option<String>,
    pub description_override: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub prerelease: bool,
    pub draft: bool,
    pub html_url: String,
    pub assets: Vec<ReleaseAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub id: u64,
    pub name: String,
    pub size: u64,
    pub browser_download_url: String,
}

#[derive(Debug, Clone)]
pub struct PublishRequest {
    pub repo_full_name: String,
    pub release: ReleaseInfo,
    pub asset_name: String,
    pub asset_bytes: Vec<u8>,
    pub version_number: String,
    pub version_type: VersionType,
    pub changelog: String,
    pub target: TargetConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishResult {
    pub target: TargetKind,
    pub version_id: String,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishResultItem {
    pub kind: String,
    pub external_project_id: String,
    pub status: String,
    pub url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordHistoryRequest {
    pub project_id: String,
    pub release_tag: String,
    pub asset_name: String,
    pub source: String,
    pub results: Vec<PublishResultItem>,
}
