pub mod plex;
pub mod sonarr;
pub mod radarr;
pub mod qbittorrent;

use crate::config::Config;

/// Shared HTTP client for all proxy calls.
#[derive(Clone)]
pub struct ProxyClient {
    pub http: reqwest::Client,
    pub config: Config,
}

impl ProxyClient {
    pub fn new(config: Config) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("Failed to build HTTP client");

        Self { http, config }
    }
}
