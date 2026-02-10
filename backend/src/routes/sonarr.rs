use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use tracing::warn;

use crate::AppState;

/// GET /api/sonarr/series — proxy to real Sonarr API.
#[utoipa::path(
    get,
    path = "/api/sonarr/series",
    responses(
        (status = 200, description = "List of monitored series", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_series(State(state): State<AppState>) -> Json<Value> {
    match state.proxy.sonarr_series().await {
        Ok(data) => Json(json!({ "series": data })),
        Err(e) => {
            warn!("Sonarr series fetch failed: {}", e);
            Json(json!({ "series": [], "error": "Sonarr unavailable" }))
        }
    }
}

/// GET /api/sonarr/calendar — proxy to real Sonarr calendar.
#[utoipa::path(
    get,
    path = "/api/sonarr/calendar",
    responses(
        (status = 200, description = "Upcoming episodes", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_calendar(State(state): State<AppState>) -> Json<Value> {
    match state.proxy.sonarr_calendar().await {
        Ok(data) => Json(json!({ "upcoming": data })),
        Err(e) => {
            warn!("Sonarr calendar fetch failed: {}", e);
            Json(json!({ "upcoming": [], "error": "Sonarr unavailable" }))
        }
    }
}
