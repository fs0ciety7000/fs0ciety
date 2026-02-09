use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Fetch qBittorrent transfer info (speeds, connection status).
    pub async fn qbit_transfer_info(&self) -> Result<Value, AppError> {
        let url = format!("{}/api/v2/transfer/info", self.config.qbittorrent_url);
        let resp = self
            .http
            .get(&url)
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }

    /// Fetch active torrents.
    pub async fn qbit_torrents(&self) -> Result<Value, AppError> {
        let url = format!(
            "{}/api/v2/torrents/info?filter=active",
            self.config.qbittorrent_url
        );
        let resp = self
            .http
            .get(&url)
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }
}
