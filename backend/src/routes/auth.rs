use axum::Json;
use serde_json::{json, Value};

use crate::models::LoginRequest;

/// POST /api/auth/login — mock SSH-style authentication.
#[utoipa::path(
    post,
    path = "/api/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Authentication successful", body = Value),
        (status = 401, description = "Invalid credentials")
    ),
    tag = "auth"
)]
pub async fn login(Json(req): Json<LoginRequest>) -> Json<Value> {
    // Mock: accept admin/admin for development.
    // Real implementation will verify against SurrealDB + argon2.
    if req.username == "admin" && req.password == "admin" {
        Json(json!({
            "token": "mock-jwt-token-replace-with-real",
            "username": "admin",
            "role": "admin",
            "message": "ACCESS GRANTED"
        }))
    } else {
        Json(json!({
            "error": true,
            "message": "ACCESS DENIED — invalid credentials"
        }))
    }
}

/// GET /api/auth/me — get current user from JWT.
pub async fn me() -> Json<Value> {
    Json(json!({
        "username": "root",
        "role": "admin",
        "message": "authenticated"
    }))
}
