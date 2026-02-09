use axum::Json;
use serde_json::{json, Value};

/// Mock Sonarr series data — replaced by real proxy calls once Sonarr is live.
#[utoipa::path(
    get,
    path = "/api/sonarr/series",
    responses(
        (status = 200, description = "List of monitored series", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_series() -> Json<Value> {
    Json(json!({
        "series": [
            {
                "id": 1,
                "title": "Mr. Robot",
                "year": 2015,
                "status": "ended",
                "seasons": 4,
                "episodes_on_disk": 45,
                "episodes_total": 45,
                "size_on_disk_gb": 89.2,
                "quality": "Bluray-1080p",
                "monitored": true,
                "path": "/media/tv/Mr. Robot"
            },
            {
                "id": 2,
                "title": "Black Mirror",
                "year": 2011,
                "status": "continuing",
                "seasons": 7,
                "episodes_on_disk": 29,
                "episodes_total": 32,
                "size_on_disk_gb": 62.4,
                "quality": "WEBDL-1080p",
                "monitored": true,
                "path": "/media/tv/Black Mirror"
            },
            {
                "id": 3,
                "title": "Silicon Valley",
                "year": 2014,
                "status": "ended",
                "seasons": 6,
                "episodes_on_disk": 53,
                "episodes_total": 53,
                "size_on_disk_gb": 44.1,
                "quality": "Bluray-1080p",
                "monitored": false,
                "path": "/media/tv/Silicon Valley"
            }
        ],
        "total": 3,
        "disk_usage_gb": 195.7
    }))
}

/// Mock Sonarr calendar — upcoming episodes.
#[utoipa::path(
    get,
    path = "/api/sonarr/calendar",
    responses(
        (status = 200, description = "Upcoming episodes", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_calendar() -> Json<Value> {
    Json(json!({
        "upcoming": [
            {
                "series": "Black Mirror",
                "episode": "S07E04",
                "title": "Eulogy",
                "air_date": "2025-06-19",
                "quality": "WEBDL-1080p",
                "monitored": true
            }
        ]
    }))
}
