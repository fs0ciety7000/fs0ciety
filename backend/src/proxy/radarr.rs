use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Fetch movie list from Radarr API v3.
    pub async fn radarr_movies(&self) -> Result<Value, AppError> {
        let url = format!("{}/api/v3/movie", self.config.radarr_url);
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
}
