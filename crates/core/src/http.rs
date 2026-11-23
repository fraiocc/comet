use std::time::Duration;

use reqwest::Client;

pub fn build_client(timeout_secs: u64) -> Client {
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .unwrap_or_else(|_| Client::new())
}
