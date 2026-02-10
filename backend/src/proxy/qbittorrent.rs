use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;
use tracing::debug;

impl ProxyClient {
    /// Make an authenticated GET request to qBittorrent.
    /// Automatically logs in and retries once on 403.
    async fn qbit_get(&self, path: &str) -> Result<Value, AppError> {
        let url = format!("{}{}", self.config.qbittorrent_url, path);

        // First attempt with existing cookie.
        if let Some(sid) = self.qbit_sid().await {
            let resp = self
                .http
                .get(&url)
                .header("Cookie", &sid)
                .send()
                .await?;

            if resp.status().is_success() {
                return resp.json::<Value>().await.map_err(Into::into);
            }

            // 403 = session expired, clear cookie and retry.
            if resp.status().as_u16() == 403 {
                debug!("qBittorrent session expired, re-authenticating");
                let mut lock = self.qbit_cookie.write().await;
                *lock = None;
            }
        }

        // Re-login and retry.
        self.qbit_login().await?;
        if let Some(sid) = self.qbit_sid().await {
            let resp = self
                .http
                .get(&url)
                .header("Cookie", &sid)
                .send()
                .await?
                .json::<Value>()
                .await?;
            return Ok(resp);
        }

        Err(AppError::Proxy("qBittorrent authentication failed".into()))
    }

    /// Fetch qBittorrent transfer info (speeds, connection status).
    pub async fn qbit_transfer_info(&self) -> Result<Value, AppError> {
        self.qbit_get("/api/v2/transfer/info").await
    }

    /// Fetch all torrents.
    pub async fn qbit_torrents(&self) -> Result<Value, AppError> {
        self.qbit_get("/api/v2/torrents/info").await
    }
}
