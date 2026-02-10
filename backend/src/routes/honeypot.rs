use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde_json::{json, Value};
use tracing::warn;

use crate::error::AppError;
use crate::AppState;

/// Extract client IP from headers (X-Forwarded-For, X-Real-IP, or fallback).
fn extract_ip(headers: &HeaderMap) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.split(',').next().unwrap_or("unknown").trim().to_string())
        .or_else(|| {
            headers.get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        })
        .unwrap_or_else(|| "unknown".into())
}

/// Extract User-Agent from headers.
fn extract_ua(headers: &HeaderMap) -> String {
    headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}

/// Anonymize an IP address: keep first 3 octets for IPv4, mask last octet.
fn anonymize_ip(ip: &str) -> String {
    if let Some(dot_pos) = ip.rfind('.') {
        format!("{}.xxx", &ip[..dot_pos])
    } else if ip.contains(':') {
        // IPv6: mask last segment
        if let Some(colon_pos) = ip.rfind(':') {
            format!("{}:xxxx", &ip[..colon_pos])
        } else {
            ip.to_string()
        }
    } else {
        ip.to_string()
    }
}

/// Honeypot trap — logs intruder and returns a fake 403.
/// Used for /admin/config, /.env, /wp-admin, etc.
pub async fn honeypot_trap(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
) -> Json<Value> {
    let ip = extract_ip(&headers);
    let ua = extract_ua(&headers);
    let path = uri.path().to_string();

    warn!("HONEYPOT triggered: {} from {} ({})", path, ip, ua);

    // Record in DB
    let anon_ip = anonymize_ip(&ip);
    let ua_owned = ua.clone();
    let path_owned = path.clone();
    let _ = state.db
        .query(
            "CREATE honeypot_hits SET \
                ip = $ip, \
                anonymized_ip = $anon_ip, \
                user_agent = $ua, \
                path = $path, \
                timestamp = time::now()"
        )
        .bind(("ip", ip))
        .bind(("anon_ip", anon_ip))
        .bind(("ua", ua_owned))
        .bind(("path", path_owned))
        .await;

    Json(json!({
        "error": "ACCESS DENIED",
        "status": 403,
        "message": "This incident has been logged.",
        "path": path,
    }))
}

/// GET /api/honeypot/intruders — public endpoint showing recent honeypot hits.
/// IPs are anonymized for privacy.
pub async fn list_intruders(
    State(state): State<AppState>,
) -> Result<Json<Value>, AppError> {
    let hits: Vec<Value> = state.db
        .query(
            "SELECT anonymized_ip, user_agent, path, timestamp \
             FROM honeypot_hits ORDER BY timestamp DESC LIMIT 100"
        )
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({
        "intruders": hits,
        "total": hits.len(),
    })))
}
