use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Fetch series list from Sonarr API v3.
    pub async fn sonarr_series(&self) -> Result<Value, AppError> {
        let url = format!("{}/api/v3/series", self.config.sonarr_url);
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

    /// Fetch upcoming episodes from Sonarr calendar.
    pub async fn sonarr_calendar(&self) -> Result<Value, AppError> {
        let url = format!("{}/api/v3/calendar", self.config.sonarr_url);
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
}
