use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::error::{CometError, Result};
use crate::models::PublishResultItem;

const MAX_RECORDS: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPublishRecord {
    pub timestamp_unix: u64,
    pub repo: String,
    pub tag: String,
    pub asset: String,
    pub results: Vec<PublishResultItem>,
}

impl LocalPublishRecord {
    pub fn now(
        repo: impl Into<String>,
        tag: impl Into<String>,
        asset: impl Into<String>,
        results: Vec<PublishResultItem>,
    ) -> Self {
        let timestamp_unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        Self {
            timestamp_unix,
            repo: repo.into(),
            tag: tag.into(),
            asset: asset.into(),
            results,
        }
    }
}

pub struct LocalHistoryStore;

impl LocalHistoryStore {
    pub fn history_path() -> Result<PathBuf> {
        let base = dirs::home_dir()
            .or_else(dirs::config_dir)
            .ok_or_else(|| CometError::Config("unable to locate home directory".into()))?;
        Ok(base.join(".comet").join("history.json"))
    }

    pub fn load() -> Result<Vec<LocalPublishRecord>> {
        let path = Self::history_path()?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let raw = fs::read_to_string(path)?;
        let records = serde_json::from_str::<Vec<LocalPublishRecord>>(&raw).unwrap_or_default();
        Ok(records)
    }

    pub fn append(record: LocalPublishRecord) -> Result<()> {
        let mut records = Self::load().unwrap_or_default();
        records.insert(0, record);
        records.truncate(MAX_RECORDS);
        Self::save(&records)
    }

    pub fn filter_recent(
        records: &[LocalPublishRecord],
        repo_filter: Option<&str>,
        limit: usize,
    ) -> Vec<LocalPublishRecord> {
        let needle = repo_filter.map(|r| r.trim().to_ascii_lowercase());
        records
            .iter()
            .filter(|rec| match &needle {
                Some(n) if !n.is_empty() => rec.repo.to_ascii_lowercase().contains(n),
                _ => true,
            })
            .take(limit.max(1))
            .cloned()
            .collect()
    }

    fn save(records: &[LocalPublishRecord]) -> Result<()> {
        let path = Self::history_path()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let encoded = serde_json::to_string_pretty(records)?;
        fs::write(&path, encoded)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filters_and_limits_records() {
        let records = vec![
            LocalPublishRecord::now("fraiocc/comet", "v0.4.2", "comet.zip", vec![]),
            LocalPublishRecord::now("fraiocc/frpass", "v1.2.0", "FrPass.jar", vec![]),
            LocalPublishRecord::now("fraiocc/comet", "v0.4.1", "comet.zip", vec![]),
        ];

        let only_comet = LocalHistoryStore::filter_recent(&records, Some("COMET"), 10);
        assert_eq!(only_comet.len(), 2);
        assert_eq!(only_comet[0].tag, "v0.4.2");

        let limited = LocalHistoryStore::filter_recent(&records, None, 2);
        assert_eq!(limited.len(), 2);
    }
}
