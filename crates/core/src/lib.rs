pub mod api;
pub mod changelog;
pub mod config;
pub mod error;
pub mod github;
pub mod history;
pub(crate) mod http;
pub mod inspect;
pub mod models;
pub mod providers;
pub mod retry;

pub use api::CometClient;
pub use config::CliConfig;
pub use error::{CometError, Result};
pub use github::GitHubClient;
pub use models::{
    ProjectConfig, PublishRequest, PublishResult, PublishResultItem, RecordHistoryRequest,
    ReleaseAsset, ReleaseInfo, TargetConfig, TargetKind, VersionType,
};
pub use providers::{
    CurseForgePublisher, HangarPublisher, ModrinthPublisher, Publisher, PublisherRegistry,
};
pub use retry::{RetryPolicy, retry_async};
