use std::env;

/// Central configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub surreal_url: String,
    pub surreal_ns: String,
    pub surreal_db: String,
    pub surreal_user: String,
    pub surreal_pass: String,
    pub jwt_secret: String,
    pub sonarr_url: String,
    pub sonarr_api_key: String,
    pub radarr_url: String,
    pub radarr_api_key: String,
    pub plex_url: String,
    pub plex_token: String,
    pub qbittorrent_url: String,
    pub qbittorrent_user: String,
    pub qbittorrent_pass: String,
    pub resend_api_key: String,
    pub public_url: String,
    pub admin_api_key: String,
    // External (browser-accessible) URLs for dashboard quick links.
    pub plex_external_url: String,
    pub sonarr_external_url: String,
    pub radarr_external_url: String,
    pub qbittorrent_external_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("BACKEND_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .expect("BACKEND_PORT must be a valid u16"),
            surreal_url: env::var("SURREAL_URL")
                .unwrap_or_else(|_| "ws://127.0.0.1:8000".into()),
            surreal_ns: env::var("SURREAL_NS").unwrap_or_else(|_| "fs0ciety".into()),
            surreal_db: env::var("SURREAL_DB").unwrap_or_else(|_| "main".into()),
            surreal_user: env::var("SURREAL_USER").unwrap_or_else(|_| "root".into()),
            surreal_pass: env::var("SURREAL_PASS").unwrap_or_else(|_| "changeme".into()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-replace-in-prod".into()),
            sonarr_url: env::var("SONARR_URL")
                .unwrap_or_else(|_| "http://localhost:8989".into()),
            sonarr_api_key: env::var("SONARR_API_KEY").unwrap_or_default(),
            radarr_url: env::var("RADARR_URL")
                .unwrap_or_else(|_| "http://localhost:7878".into()),
            radarr_api_key: env::var("RADARR_API_KEY").unwrap_or_default(),
            plex_url: env::var("PLEX_URL")
                .unwrap_or_else(|_| "http://localhost:32400".into()),
            plex_token: env::var("PLEX_TOKEN").unwrap_or_default(),
            qbittorrent_url: env::var("QBITTORRENT_URL")
                .unwrap_or_else(|_| "http://localhost:8080".into()),
            qbittorrent_user: env::var("QBITTORRENT_USER")
                .unwrap_or_else(|_| "admin".into()),
            qbittorrent_pass: env::var("QBITTORRENT_PASS")
                .unwrap_or_else(|_| "adminadmin".into()),
            resend_api_key: env::var("RESEND_API_KEY").unwrap_or_default(),
            public_url: env::var("PUBLIC_URL")
                .unwrap_or_else(|_| "https://fs0ciety.org".into()),
            admin_api_key: env::var("ADMIN_API_KEY").unwrap_or_default(),
            plex_external_url: env::var("PLEX_EXTERNAL_URL")
                .unwrap_or_else(|_| "https://app.plex.tv/desktop".into()),
            sonarr_external_url: env::var("SONARR_EXTERNAL_URL")
                .unwrap_or_else(|_| "https://sonic.phantomhex.cc/".into()),
            radarr_external_url: env::var("RADARR_EXTERNAL_URL")
                .unwrap_or_else(|_| "https://pulse.phantomhex.cc".into()),
            qbittorrent_external_url: env::var("QBITTORRENT_EXTERNAL_URL")
                .unwrap_or_else(|_| "https://flow.phantomhex.cc/".into()),
        }
    }

    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
