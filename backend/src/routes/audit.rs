use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::AppState;

/// GET /api/admin/audit — get recent audit log entries.
/// Requires admin authentication.
pub async fn get_audit_logs(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    // Only admins can view audit logs.
    if auth.0.role != "admin" {
        return Err(AppError::Unauthorized);
    }

    let logs: Vec<Value> = state.db
        .query(
            "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200"
        )
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({
        "logs": logs,
        "total": logs.len(),
    })))
}

/// Record an audit event in the database.
pub async fn record_audit(
    db: &crate::db::Db,
    event_type: &str,
    username: &str,
    ip: &str,
    user_agent: &str,
    success: bool,
    details: &str,
) {
    let _ = db
        .query(
            "CREATE audit_logs SET \
                event_type = $event_type, \
                username = $username, \
                ip = $ip, \
                user_agent = $user_agent, \
                success = $success, \
                details = $details, \
                timestamp = time::now()"
        )
        .bind(("event_type", event_type))
        .bind(("username", username))
        .bind(("ip", ip))
        .bind(("user_agent", user_agent))
        .bind(("success", success))
        .bind(("details", details))
        .await;
}
