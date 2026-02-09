use axum::Json;
use serde_json::{json, Value};

/// GET /api/seedbox/stats — aggregated seedbox statistics (mock).
#[utoipa::path(
    get,
    path = "/api/seedbox/stats",
    responses(
        (status = 200, description = "Current seedbox stats", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_stats() -> Json<Value> {
    Json(json!({
        "download_speed_bps": 12_845_000,
        "upload_speed_bps": 4_230_000,
        "disk_used_bytes": 1_842_000_000_000_u64,
        "disk_total_bytes": 4_000_000_000_000_u64,
        "active_torrents": 7,
        "seeding_torrents": 142,
        "ratio": 3.42,
        "services": {
            "plex": { "online": true, "latency_ms": 12 },
            "sonarr": { "online": true, "latency_ms": 45 },
            "radarr": { "online": true, "latency_ms": 38 },
            "qbittorrent": { "online": true, "latency_ms": 8 }
        }
    }))
}
