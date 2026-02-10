pub mod plex;
pub mod sonarr;
pub mod radarr;
pub mod qbittorrent;

use crate::config::Config;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Shared HTTP client for all proxy calls.
/// Accepts invalid certs for local services (Plex self-signed, etc.).
#[derive(Clone)]
pub struct ProxyClient {
    pub http: reqwest::Client,
    pub config: Config,
    /// qBittorrent session cookie (SID), refreshed on auth.
    pub qbit_cookie: Arc<RwLock<Option<String>>>,
}

impl ProxyClient {
    pub fn new(config: Config) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .danger_accept_invalid_certs(true)
            .build()
            .expect("Failed to build HTTP client");

        Self {
            http,
            config,
            qbit_cookie: Arc::new(RwLock::new(None)),
        }
    }

    /// Authenticate with qBittorrent and store the session cookie.
    pub async fn qbit_login(&self) -> Result<(), crate::error::AppError> {
        let url = format!("{}/api/v2/auth/login", self.config.qbittorrent_url);
        let resp = self
            .http
            .post(&url)
            .header("Referer", &self.config.qbittorrent_url)
            .form(&[
                ("username", self.config.qbittorrent_user.as_str()),
                ("password", self.config.qbittorrent_pass.as_str()),
            ])
            .send()
            .await?;

        // Extract SID cookie from Set-Cookie header.
        if let Some(cookie) = resp.headers().get("set-cookie") {
            if let Ok(val) = cookie.to_str() {
                let sid = val.split(';').next().unwrap_or(val);
                let mut lock = self.qbit_cookie.write().await;
                *lock = Some(sid.to_string());
            }
        }
        Ok(())
    }

    /// Get the qBittorrent session cookie, logging in if needed.
    pub async fn qbit_sid(&self) -> Option<String> {
        {
            let lock = self.qbit_cookie.read().await;
            if lock.is_some() {
                return lock.clone();
            }
        }
        // No cookie yet, try to login.
        let _ = self.qbit_login().await;
        let lock = self.qbit_cookie.read().await;
        lock.clone()
    }
}
