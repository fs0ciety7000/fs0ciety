use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Fetch Plex server status.
    pub async fn plex_status(&self) -> Result<Value, AppError> {
        let url = format!("{}/status", self.config.plex_url);
        let resp = self
            .http
            .get(&url)
            .header("X-Plex-Token", &self.config.plex_token)
            .header("Accept", "application/json")
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }

    /// Fetch Plex library sections.
    pub async fn plex_libraries(&self) -> Result<Value, AppError> {
        let url = format!("{}/library/sections", self.config.plex_url);
        let resp = self
            .http
            .get(&url)
            .header("X-Plex-Token", &self.config.plex_token)
            .header("Accept", "application/json")
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }
}
