use std::collections::HashMap;

use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, USER_AGENT};
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};

use crate::error::{CometError, Result};
use crate::models::{PublishRequest, PublishResult, TargetKind};
use crate::providers::Publisher;

const HANGAR_API_BASE: &str = "https://hangar.papermc.io/api/v1";

pub struct HangarPublisher {
    http: reqwest::Client,
}

impl Default for HangarPublisher {
    fn default() -> Self {
        Self::new()
    }
}

impl HangarPublisher {
    pub fn new() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }

    async fn exchange_jwt(&self, api_key: &str) -> Result<String> {
        let resp = self
            .http
            .post(format!("{HANGAR_API_BASE}/authenticate"))
            .header(USER_AGENT, "comet-cli/0.1.0")
            .query(&[("apiKey", api_key)])
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Publish {
                target: "hangar".to_string(),
                reason: format!("authentication failed (HTTP {status}): {body}"),
            });
        }

        let auth = resp.json::<HangarAuthResponse>().await?;
        Ok(auth.token)
    }
}

#[derive(Deserialize)]
struct HangarAuthResponse {
    token: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HangarPluginDependency<'a> {
    name: &'a str,
    required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    external_url: Option<&'a str>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HangarErrorBody {
    message: Option<String>,
    #[serde(default)]
    message_args: Vec<String>,
}

fn format_hangar_error(status: reqwest::StatusCode, body: &str) -> String {
    if let Ok(parsed) = serde_json::from_str::<HangarErrorBody>(body)
        && let Some(msg) = parsed.message
    {
        if msg.contains("invalidPluginDependencyNamespace") {
            let deps = if parsed.message_args.is_empty() {
                "unknown".to_string()
            } else {
                parsed.message_args.join(", ")
            };
            return format!(
                "invalid plugin dependency ({deps}) — not hosted on Hangar or missing external URL"
            );
        }
        if msg.contains("duplicate") {
            return "this version number already exists on Hangar".to_string();
        }
        if !parsed.message_args.is_empty() {
            return format!("{msg} ({})", parsed.message_args.join(", "));
        }
        return msg;
    }
    format!("HTTP {status}: {body}")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HangarVersionUpload<'a> {
    version: &'a str,
    channel: &'a str,
    description: &'a str,
    platform_dependencies: HashMap<String, Vec<String>>,
    plugin_dependencies: HashMap<String, Vec<HangarPluginDependency<'a>>>,
    files: Vec<HangarFileMeta>,
}

#[derive(Serialize)]
struct HangarFileMeta {
    platforms: Vec<String>,
}

#[derive(Deserialize)]
struct HangarUploadResponse {
    url: Option<String>,
}

#[async_trait]
impl Publisher for HangarPublisher {
    fn kind(&self) -> TargetKind {
        TargetKind::Hangar
    }

    async fn publish(&self, req: &PublishRequest) -> Result<PublishResult> {
        let jwt = self.exchange_jwt(&req.target.token).await?;
        let channel = req.target.channel.as_deref().unwrap_or("Release");

        let platforms: Vec<String> = if req.target.loaders.is_empty() {
            vec!["PAPER".to_string()]
        } else {
            req.target
                .loaders
                .iter()
                .map(|l| l.to_uppercase())
                .collect()
        };

        let mut platform_dependencies = HashMap::new();
        let mut plugin_dependencies = HashMap::new();
        for platform in &platforms {
            platform_dependencies.insert(platform.clone(), req.target.game_versions.clone());
            let deps = req
                .target
                .dependencies
                .iter()
                .map(|dep| HangarPluginDependency {
                    name: dep.name.as_deref().unwrap_or(&dep.project_id),
                    required: dep.dependency_type == "required",
                    external_url: dep.external_url.as_deref(),
                })
                .collect();
            plugin_dependencies.insert(platform.clone(), deps);
        }

        let payload = HangarVersionUpload {
            version: &req.version_number,
            channel,
            description: &req.changelog,
            platform_dependencies,
            plugin_dependencies,
            files: vec![HangarFileMeta { platforms }],
        };

        let meta_part =
            Part::text(serde_json::to_string(&payload)?).mime_str("application/json")?;
        let file_part = Part::bytes(req.asset_bytes.clone())
            .file_name(req.asset_name.clone())
            .mime_str("application/java-archive")?;

        let form = Form::new()
            .part("versionUpload", meta_part)
            .part("files", file_part);

        let endpoint = format!(
            "{HANGAR_API_BASE}/projects/{}/upload",
            req.target.external_project_id
        );

        let resp = self
            .http
            .post(&endpoint)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(AUTHORIZATION, format!("HangarAuth {jwt}"))
            .multipart(form)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Publish {
                target: "hangar".to_string(),
                reason: format_hangar_error(status, &body),
            });
        }

        let created = resp.json::<HangarUploadResponse>().await?;
        Ok(PublishResult {
            target: TargetKind::Hangar,
            version_id: req.version_number.clone(),
            url: created.url,
        })
    }
}
