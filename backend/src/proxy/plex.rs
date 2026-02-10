use super::ProxyClient;
use crate::error::AppError;
use serde_json::Value;

impl ProxyClient {
    /// Generic Plex GET helper.
    async fn plex_get(&self, path: &str) -> Result<Value, AppError> {
        let url = format!("{}{}", self.config.plex_url, path);
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

    /// Fetch Plex server status.
    pub async fn plex_status(&self) -> Result<Value, AppError> {
        self.plex_get("/status").await
    }

    /// Fetch Plex library sections.
    pub async fn plex_libraries(&self) -> Result<Value, AppError> {
        self.plex_get("/library/sections").await
    }

    /// Fetch current Plex sessions (what's playing now).
    pub async fn plex_sessions(&self) -> Result<Value, AppError> {
        self.plex_get("/status/sessions").await
    }

    /// Fetch recently added media from Plex.
    pub async fn plex_recently_added(&self) -> Result<Value, AppError> {
        self.plex_get("/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=15").await
    }
}
