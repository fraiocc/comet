pub mod api;
pub mod config;
pub mod error;
pub mod github;
pub mod models;
pub mod providers;

pub use api::CometClient;
pub use config::CliConfig;
pub use error::{CometError, Result};
pub use github::GitHubClient;
pub use models::{
    ProjectConfig, PublishRequest, PublishResult, PublishResultItem, RecordHistoryRequest,
    ReleaseAsset, ReleaseInfo, TargetConfig, TargetKind, VersionType,
};
pub use providers::{HangarPublisher, ModrinthPublisher, Publisher, PublisherRegistry};
