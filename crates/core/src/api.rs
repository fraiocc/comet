use reqwest::header::{AUTHORIZATION, USER_AGENT};
use serde::Deserialize;

use crate::error::{CometError, Result};
use crate::models::ProjectConfig;

pub struct CometClient {
    http: reqwest::Client,
    base_url: String,
    token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePayload {
    pub projects: Vec<ProjectConfig>,
    pub github_token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhoamiResponse {
    pub username: String,
    pub email: Option<String>,
}

impl CometClient {
    pub fn new(base_url: impl Into<String>, token: impl Into<String>) -> Self {
        Self {
            http: reqwest::Client::new(),
            base_url: base_url.into().trim_end_matches('/').to_string(),
            token: token.into(),
        }
    }

    pub async fn whoami(&self) -> Result<WhoamiResponse> {
        let url = format!("{}/api/cli/token", self.base_url);
        let resp = self
            .http
            .get(&url)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(AUTHORIZATION, format!("Bearer {}", self.token))
            .send()
            .await?;

        let status = resp.status();
        if status.as_u16() == 401 {
            return Err(CometError::Unauthenticated);
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Api {
                status: status.as_u16(),
                message: body,
            });
        }
        Ok(resp.json::<WhoamiResponse>().await?)
    }

    pub async fn fetch_workspace(&self) -> Result<WorkspacePayload> {
        let url = format!("{}/api/cli/projects", self.base_url);
        let resp = self
            .http
            .get(&url)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(AUTHORIZATION, format!("Bearer {}", self.token))
            .send()
            .await?;

        let status = resp.status();
        if status.as_u16() == 401 {
            return Err(CometError::Unauthenticated);
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Api {
                status: status.as_u16(),
                message: body,
            });
        }

        Ok(resp.json::<WorkspacePayload>().await?)
    }

    pub async fn list_projects(&self) -> Result<Vec<ProjectConfig>> {
        Ok(self.fetch_workspace().await?.projects)
    }

    pub async fn set_target_enabled(&self, target_id: &str, enabled: bool) -> Result<()> {
        let url = format!("{}/api/cli/targets/{target_id}", self.base_url);
        let resp = self
            .http
            .patch(&url)
            .header(USER_AGENT, "comet-cli/0.1.0")
            .header(AUTHORIZATION, format!("Bearer {}", self.token))
            .json(&serde_json::json!({ "enabled": enabled }))
            .send()
            .await?;

        let status = resp.status();
        if status.as_u16() == 401 {
            return Err(CometError::Unauthenticated);
        }
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(CometError::Api {
                status: status.as_u16(),
                message: body,
            });
        }
        Ok(())
    }
}
