use std::sync::atomic::{AtomicBool, Ordering};

use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing::info;
use utoipa::ToSchema;

use crate::error::AppError;
use crate::middleware::AdminUser;
use crate::AppState;

/// Global maintenance flag — lives in AppState, fast atomic read on every request.
pub static MAINTENANCE_MODE: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MaintenanceStatus {
    pub enabled: bool,
}

/// Public endpoint: check if the site is in maintenance mode.
///
/// Returns `{ "enabled": true/false }`.
/// Called by the frontend on every page load to decide whether to show the maintenance page.
#[utoipa::path(
    get,
    path = "/api/maintenance",
    tag = "system",
    responses(
        (status = 200, description = "Maintenance status"),
    )
)]
pub async fn get_maintenance() -> Json<Value> {
    Json(json!({
        "enabled": MAINTENANCE_MODE.load(Ordering::Relaxed),
    }))
}

/// Admin endpoint: toggle maintenance mode on or off.
///
/// Accepts `{ "enabled": true }` or `{ "enabled": false }`.
#[utoipa::path(
    put,
    path = "/api/admin/maintenance",
    tag = "admin",
    responses(
        (status = 200, description = "Maintenance mode updated"),
    )
)]
pub async fn set_maintenance(
    _admin: AdminUser,
    State(_state): State<AppState>,
    Json(body): Json<MaintenanceStatus>,
) -> Result<Json<Value>, AppError> {
    MAINTENANCE_MODE.store(body.enabled, Ordering::Relaxed);
    info!(
        "Maintenance mode {}",
        if body.enabled { "ENABLED" } else { "DISABLED" }
    );
    Ok(Json(json!({
        "enabled": body.enabled,
        "message": format!("Maintenance mode {}", if body.enabled { "enabled" } else { "disabled" }),
    })))
}
