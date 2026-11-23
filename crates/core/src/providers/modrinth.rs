use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, USER_AGENT};
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};

use crate::error::{CometError, Result};
use crate::models::{PublishRequest, PublishResult, TargetKind};
use crate::providers::Publisher;

const MODRINTH_API_BASE: &str = "https://api.modrinth.com/v2";
const CLI_USER_AGENT: &str = concat!("comet-cli/", env!("CARGO_PKG_VERSION"));

pub struct ModrinthPublisher {
    http: reqwest::Client,
}

impl Default for ModrinthPublisher {
    fn default() -> Self {
        Self::new()
    }
}

impl ModrinthPublisher {
    pub fn new() -> Self {
        Self {
            http: crate::http::build_client(120),
        }
    }
}

#[derive(Serialize)]
struct ModrinthDependency<'a> {
    project_id: &'a str,
    dependency_type: &'a str,
}

#[derive(Serialize)]
struct ModrinthVersionPayload<'a> {
    name: &'a str,
    version_number: &'a str,
    changelog: &'a str,
    dependencies: Vec<ModrinthDependency<'a>>,
    game_versions: &'a [String],
    version_type: String,
    loaders: &'a [String],
    featured: bool,
    project_id: &'a str,
    file_parts: [&'a str; 1],
}

#[derive(Deserialize)]
struct ModrinthVersionResponse {
    id: String,
    project_id: String,
}

#[derive(Deserialize)]
struct ModrinthErrorBody {
    error: Option<String>,
    description: Option<String>,
}

fn format_modrinth_error(status: reqwest::StatusCode, body: &str) -> String {
    if let Ok(parsed) = serde_json::from_str::<ModrinthErrorBody>(body) {
        if let Some(desc) = parsed.description {
            return desc;
        }
        if let Some(err) = parsed.error {
            return err;
        }
    }
    format!("HTTP {status}: {body}")
}

#[async_trait]
impl Publisher for ModrinthPublisher {
    fn kind(&self) -> TargetKind {
        TargetKind::Modrinth
    }

    async fn publish(&self, req: &PublishRequest) -> Result<PublishResult> {
        let dependencies = req
            .target
            .dependencies
            .iter()
            .map(|dep| ModrinthDependency {
                project_id: &dep.project_id,
                dependency_type: &dep.dependency_type,
            })
            .collect();

        let release_title = if req.release.name.trim().is_empty() {
            &req.release.tag_name
        } else {
            &req.release.name
        };

        let payload = ModrinthVersionPayload {
            name: release_title,
            version_number: &req.version_number,
            changelog: &req.changelog,
            dependencies,
            game_versions: &req.target.game_versions,
            version_type: req.version_type.to_string(),
            loaders: &req.target.loaders,
            featured: true,
            project_id: &req.target.external_project_id,
            file_parts: ["file"],
        };

        let data_json = serde_json::to_string(&payload)?;
        let file_part = Part::bytes(req.asset_bytes.clone())
            .file_name(req.asset_name.clone())
            .mime_str("application/java-archive")?;

        let form = Form::new().text("data", data_json).part("file", file_part);

        let resp = self
            .http
            .post(format!("{MODRINTH_API_BASE}/version"))
            .header(USER_AGENT, CLI_USER_AGENT)
            .header(AUTHORIZATION, &req.target.token)
            .multipart(form)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Publish {
                target: "modrinth".to_string(),
                reason: format_modrinth_error(status, &body),
            });
        }

        let created = resp.json::<ModrinthVersionResponse>().await?;
        let url = format!(
            "https://modrinth.com/project/{}/version/{}",
            created.project_id, created.id
        );

        Ok(PublishResult {
            target: TargetKind::Modrinth,
            version_id: created.id,
            url: Some(url),
        })
    }
}
