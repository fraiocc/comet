mod curseforge;
mod hangar;
mod modrinth;

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;

pub use curseforge::CurseForgePublisher;
pub use hangar::HangarPublisher;
pub use modrinth::ModrinthPublisher;

use crate::error::{CometError, Result};
use crate::models::{PublishRequest, PublishResult, TargetKind};

#[async_trait]
pub trait Publisher: Send + Sync {
    fn kind(&self) -> TargetKind;
    async fn publish(&self, req: &PublishRequest) -> Result<PublishResult>;
}

pub struct PublisherRegistry {
    providers: HashMap<TargetKind, Arc<dyn Publisher>>,
}

impl Default for PublisherRegistry {
    fn default() -> Self {
        let mut registry = Self {
            providers: HashMap::new(),
        };
        registry.register(Arc::new(ModrinthPublisher::new()));
        registry.register(Arc::new(HangarPublisher::new()));
        registry.register(Arc::new(CurseForgePublisher::new()));
        registry
    }
}

impl PublisherRegistry {
    pub fn register(&mut self, provider: Arc<dyn Publisher>) {
        self.providers.insert(provider.kind(), provider);
    }

    pub fn get(&self, kind: TargetKind) -> Result<&Arc<dyn Publisher>> {
        self.providers
            .get(&kind)
            .ok_or_else(|| CometError::Publish {
                target: kind.to_string(),
                reason: "no publisher registered for target".to_string(),
            })
    }
}
