use axum::Json;
use chrono::Utc;
use serde_json::{json, Value};

/// GET /api/health — system health check for the boot sequence.
#[utoipa::path(
    get,
    path = "/api/health",
    responses(
        (status = 200, description = "System operational", body = Value)
    ),
    tag = "system"
)]
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "operational",
        "service": "fs0ciety-backend",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": Utc::now().to_rfc3339(),
        "uptime_seconds": 0, // TODO: track actual uptime
    }))
}

/// GET /api/ping — minimal liveness probe.
pub async fn ping() -> &'static str {
    "pong"
}
