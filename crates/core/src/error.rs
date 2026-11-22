use thiserror::Error;

#[derive(Debug, Error)]
pub enum CometError {
    #[error("not authenticated: run `comet login` or set COMET_TOKEN")]
    Unauthenticated,

    #[error("configuration error: {0}")]
    Config(String),

    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("API error ({status}): {message}")]
    Api { status: u16, message: String },

    #[error("GitHub release not found for {repo}")]
    ReleaseNotFound { repo: String },

    #[error("no matching asset found in release {tag}")]
    AssetNotFound { tag: String },

    #[error("publish failed for {target}: {reason}")]
    Publish { target: String, reason: String },

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, CometError>;
