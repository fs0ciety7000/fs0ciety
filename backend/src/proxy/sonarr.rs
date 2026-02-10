use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Generic Sonarr GET helper.
    async fn sonarr_get(&self, path: &str) -> Result<Value, AppError> {
        let url = format!("{}{}", self.config.sonarr_url, path);
        let resp = self
            .http
            .get(&url)
            .header("X-Api-Key", &self.config.sonarr_api_key)
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(resp)
    }

    /// Fetch series list from Sonarr API v3.
    pub async fn sonarr_series(&self) -> Result<Value, AppError> {
        self.sonarr_get("/api/v3/series").await
    }

    /// Fetch upcoming episodes from Sonarr calendar.
    pub async fn sonarr_calendar(&self) -> Result<Value, AppError> {
        self.sonarr_get("/api/v3/calendar").await
    }

    /// Fetch recent history (downloads, upgrades) from Sonarr.
    pub async fn sonarr_history(&self) -> Result<Value, AppError> {
        self.sonarr_get("/api/v3/history?sortKey=date&sortDirection=descending&pageSize=15&includeSeries=true&includeEpisode=true").await
    }
}
