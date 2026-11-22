use std::collections::HashSet;

use async_trait::async_trait;
use reqwest::Client;
use reqwest::header::USER_AGENT;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};

use crate::error::{CometError, Result};
use crate::models::{PublishRequest, PublishResult, TargetKind};
use crate::providers::Publisher;

const CURSEFORGE_API_BASE: &str = "https://minecraft.curseforge.com/api";
const CLI_USER_AGENT: &str = concat!("comet-cli/", env!("CARGO_PKG_VERSION"));

pub struct CurseForgePublisher {
    http: Client,
}

impl Default for CurseForgePublisher {
    fn default() -> Self {
        Self::new()
    }
}

impl CurseForgePublisher {
    pub fn new() -> Self {
        Self {
            http: Client::new(),
        }
    }

    async fn fetch_game_versions(&self, token: &str) -> Result<Vec<CfGameVersion>> {
        let url = format!("{CURSEFORGE_API_BASE}/game/versions");
        let resp = self
            .http
            .get(&url)
            .header("X-Api-Token", token)
            .header(USER_AGENT, CLI_USER_AGENT)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(CometError::Publish {
                target: "curseforge".to_string(),
                reason: format!("failed to fetch game versions (HTTP {status}): {text}"),
            });
        }

        Ok(resp.json::<Vec<CfGameVersion>>().await?)
    }

    async fn fetch_version_types(&self, token: &str) -> Result<Vec<CfVersionType>> {
        let url = format!("{CURSEFORGE_API_BASE}/game/version-types");
        let resp = self
            .http
            .get(&url)
            .header("X-Api-Token", token)
            .header(USER_AGENT, CLI_USER_AGENT)
            .send()
            .await?;

        if !resp.status().is_success() {
            return Ok(Vec::new());
        }

        Ok(resp.json::<Vec<CfVersionType>>().await.unwrap_or_default())
    }
}

#[derive(Deserialize)]
struct CfVersionType {
    id: u64,
    slug: String,
}

#[derive(Deserialize)]
struct CfGameVersion {
    id: u64,
    #[serde(rename = "gameVersionTypeID", default)]
    game_version_type_id: u64,
    name: String,
    slug: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CfUploadMetadata<'a> {
    changelog: &'a str,
    changelog_type: &'static str,
    display_name: &'a str,
    game_versions: Vec<u64>,
    release_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    relations: Option<CfRelations>,
}

#[derive(Serialize)]
struct CfRelations {
    projects: Vec<CfRelationProject>,
}

#[derive(Serialize)]
struct CfRelationProject {
    #[serde(skip_serializing_if = "Option::is_none")]
    slug: Option<String>,
    #[serde(rename = "projectID", skip_serializing_if = "Option::is_none")]
    project_id: Option<u64>,
    #[serde(rename = "type")]
    relation_type: &'static str,
}

#[derive(Deserialize)]
struct CfUploadResponse {
    id: u64,
}

fn map_dependency_type(dep_type: &str) -> &'static str {
    match dep_type {
        "optional" => "optionalDependency",
        "incompatible" => "incompatible",
        "embedded" => "embeddedLibrary",
        _ => "requiredDependency",
    }
}

fn allowed_type_ids(types: &[CfVersionType]) -> HashSet<u64> {
    types
        .iter()
        .filter(|t| {
            let s = t.slug.to_lowercase();
            s.starts_with("minecraft-") || s == "modloader" || s == "bukkit"
        })
        .map(|t| t.id)
        .collect()
}

fn resolve_version_ids(
    catalog: &[CfGameVersion],
    valid_types: &HashSet<u64>,
    game_versions: &[String],
    loaders: &[String],
) -> Vec<u64> {
    let mut ids = Vec::new();
    let mut seen = HashSet::new();

    for wanted in game_versions.iter().chain(loaders.iter()) {
        let needle = wanted.trim().to_lowercase();
        if needle.is_empty() {
            continue;
        }
        let matched = catalog
            .iter()
            .find(|v| {
                (valid_types.is_empty() || valid_types.contains(&v.game_version_type_id))
                    && (v.name.to_lowercase() == needle || v.slug.to_lowercase() == needle)
            })
            .or_else(|| {
                catalog
                    .iter()
                    .find(|v| v.name.to_lowercase() == needle || v.slug.to_lowercase() == needle)
            });

        if let Some(found) = matched
            && seen.insert(found.id)
        {
            ids.push(found.id);
        }
    }

    ids
}

#[async_trait]
impl Publisher for CurseForgePublisher {
    fn kind(&self) -> TargetKind {
        TargetKind::CurseForge
    }

    async fn publish(&self, req: &PublishRequest) -> Result<PublishResult> {
        let project_id = req.target.external_project_id.trim();
        if !project_id.chars().all(|c| c.is_ascii_digit()) || project_id.is_empty() {
            return Err(CometError::Publish {
                target: "curseforge".to_string(),
                reason: format!("CurseForge project ID must be numeric, got '{project_id}'"),
            });
        }

        let (catalog_res, types_res) = tokio::join!(
            self.fetch_game_versions(&req.target.token),
            self.fetch_version_types(&req.target.token),
        );
        let catalog = catalog_res?;
        let valid_types = allowed_type_ids(&types_res.unwrap_or_default());
        let game_version_ids = resolve_version_ids(
            &catalog,
            &valid_types,
            &req.target.game_versions,
            &req.target.loaders,
        );

        if game_version_ids.is_empty() {
            return Err(CometError::Publish {
                target: "curseforge".to_string(),
                reason: "none of the configured game versions or loaders matched CurseForge"
                    .to_string(),
            });
        }

        let relations = if req.target.dependencies.is_empty() {
            None
        } else {
            let projects = req
                .target
                .dependencies
                .iter()
                .map(|d| {
                    let raw = d.project_id.trim();
                    let (slug, project_id) = match raw.parse::<u64>() {
                        Ok(num) => (None, Some(num)),
                        Err(_) => (Some(raw.to_string()), None),
                    };
                    CfRelationProject {
                        slug,
                        project_id,
                        relation_type: map_dependency_type(&d.dependency_type),
                    }
                })
                .collect();
            Some(CfRelations { projects })
        };

        let metadata = CfUploadMetadata {
            changelog: &req.changelog,
            changelog_type: "markdown",
            display_name: &req.release.name,
            game_versions: game_version_ids,
            release_type: req.version_type.to_string(),
            relations,
        };

        let metadata_json = serde_json::to_string(&metadata).map_err(|e| CometError::Publish {
            target: "curseforge".to_string(),
            reason: e.to_string(),
        })?;

        let metadata_part = Part::text(metadata_json)
            .mime_str("application/json")
            .map_err(|e| CometError::Publish {
                target: "curseforge".to_string(),
                reason: e.to_string(),
            })?;

        let file_part = Part::bytes(req.asset_bytes.clone())
            .file_name(req.asset_name.clone())
            .mime_str("application/java-archive")
            .map_err(|e| CometError::Publish {
                target: "curseforge".to_string(),
                reason: e.to_string(),
            })?;

        let form = Form::new()
            .part("metadata", metadata_part)
            .part("file", file_part);

        let url = format!("{CURSEFORGE_API_BASE}/projects/{project_id}/upload-file");
        let resp = self
            .http
            .post(&url)
            .header("X-Api-Token", &req.target.token)
            .header(USER_AGENT, CLI_USER_AGENT)
            .multipart(form)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Publish {
                target: "curseforge".to_string(),
                reason: format!("HTTP {status}: {body}"),
            });
        }

        let uploaded: CfUploadResponse = resp.json().await?;
        Ok(PublishResult {
            target: TargetKind::CurseForge,
            version_id: uploaded.id.to_string(),
            url: Some(format!(
                "https://www.curseforge.com/projects/{project_id}/files/{}",
                uploaded.id
            )),
        })
    }
}
