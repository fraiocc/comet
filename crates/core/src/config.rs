use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::{CometError, Result};

const DEFAULT_API_URL: &str = "https://comet.fraio.cc";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CliConfig {
    pub api_url: String,
    pub token: Option<String>,
}

impl Default for CliConfig {
    fn default() -> Self {
        Self {
            api_url: DEFAULT_API_URL.to_string(),
            token: None,
        }
    }
}

impl CliConfig {
    pub fn path() -> Result<PathBuf> {
        let dir = dirs::home_dir()
            .ok_or_else(|| CometError::Config("could not locate home directory".to_string()))?
            .join(".comet");
        Ok(dir.join("config.toml"))
    }

    pub fn load() -> Result<Self> {
        let path = Self::path()?;
        if !path.exists() {
            return Ok(Self::default());
        }
        let raw = fs::read_to_string(&path)?;
        let cfg = toml::from_str(&raw).map_err(|e| CometError::Config(e.to_string()))?;
        Ok(cfg)
    }

    pub fn save(&self) -> Result<()> {
        let path = Self::path()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let raw = toml::to_string_pretty(self).map_err(|e| CometError::Config(e.to_string()))?;
        fs::write(&path, raw)?;
        Ok(())
    }

    pub fn resolve_token(&self) -> Result<String> {
        if let Ok(env_token) = std::env::var("COMET_TOKEN")
            && !env_token.trim().is_empty()
        {
            return Ok(env_token);
        }
        self.token
            .clone()
            .filter(|t| !t.trim().is_empty())
            .ok_or(CometError::Unauthenticated)
    }

    pub fn resolve_api_url(&self) -> String {
        if let Ok(env_url) = std::env::var("COMET_API_URL")
            && !env_url.trim().is_empty()
        {
            return env_url.trim_end_matches('/').to_string();
        }
        self.api_url.trim_end_matches('/').to_string()
    }
}
