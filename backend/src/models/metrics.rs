use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;
use utoipa::ToSchema;

/// Historical seedbox metrics snapshot — stored periodically.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SeedboxMetrics {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)]
    pub id: Option<Thing>,
    /// Bytes per second download.
    pub download_speed: u64,
    /// Bytes per second upload.
    pub upload_speed: u64,
    /// Total disk used in bytes.
    pub disk_used: u64,
    /// Total disk capacity in bytes.
    pub disk_total: u64,
    /// Number of active torrents.
    pub active_torrents: u32,
    /// Number of seeding torrents.
    pub seeding_torrents: u32,
    pub timestamp: DateTime<Utc>,
}

/// Real-time stats pushed over WebSocket.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RealtimeStats {
    pub download_speed: u64,
    pub upload_speed: u64,
    pub disk_used: u64,
    pub disk_total: u64,
    pub active_torrents: u32,
    pub seeding_torrents: u32,
    pub services: ServiceStatuses,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ServiceStatuses {
    pub backend: ServiceStatus,
    pub database: ServiceStatus,
    pub plex: ServiceStatus,
    pub sonarr: ServiceStatus,
    pub radarr: ServiceStatus,
    pub qbittorrent: ServiceStatus,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ServiceStatus {
    pub name: String,
    pub online: bool,
    pub latency_ms: Option<u64>,
}
