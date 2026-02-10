use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Generic Radarr GET helper.
    async fn radarr_get(&self, path: &str) -> Result<Value, AppError> {
        let url = format!("{}{}", self.config.radarr_url, path);
        let resp = self
            .http
            .get(&url)
            .header("X-Api-Key", &self.config.radarr_api_key)
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }

    /// Fetch movie list from Radarr API v3.
    pub async fn radarr_movies(&self) -> Result<Value, AppError> {
        self.radarr_get("/api/v3/movie").await
    }

    /// Fetch recent history (downloads, upgrades) from Radarr.
    pub async fn radarr_history(&self) -> Result<Value, AppError> {
        self.radarr_get("/api/v3/history?sortKey=date&sortDirection=descending&pageSize=15&includeMovie=true").await
    }
}
