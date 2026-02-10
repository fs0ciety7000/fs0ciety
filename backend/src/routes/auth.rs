use axum::extract::State;
use axum::Json;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use tracing::info;

use crate::error::AppError;
use crate::middleware::{AuthUser, Claims};
use crate::models::{ChangePasswordRequest, LoginRequest, User};
use crate::AppState;

/// POST /api/auth/login — authenticate against SurrealDB + argon2.
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
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<Value>, AppError> {
    let username = req.username.clone();

    // Look up user in SurrealDB.
    let result: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let user = result.into_iter().next().ok_or(AppError::Unauthorized)?;

    // Verify password with argon2.
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Internal("Invalid password hash in database".into()))?;
    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    // Update last_login.
    let _ = state.db
        .query("UPDATE users SET last_login = time::now() WHERE username = $username")
        .bind(("username", username))
        .await;

    // Generate JWT.
    let now = chrono::Utc::now().timestamp() as usize;
    let role_str = serde_json::to_value(&user.role)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| "guest".into());
    let claims = Claims {
        sub: user.username.clone(),
        role: role_str,
        iat: now,
        exp: now + 86400 * 7, // 7 days
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encode error: {}", e)))?;

    info!("User '{}' logged in", user.username);

    Ok(Json(json!({
        "token": token,
        "user": {
            "username": user.username,
            "role": user.role,
        },
        "message": "ACCESS GRANTED"
    })))
}

/// GET /api/auth/me — get current user from JWT.
pub async fn me(auth: AuthUser) -> Json<Value> {
    Json(json!({
        "username": auth.0.sub,
        "role": auth.0.role,
        "message": "authenticated"
    }))
}

/// PUT /api/auth/change-password — change password for the authenticated user.
#[utoipa::path(
    put,
    path = "/api/auth/change-password",
    request_body = ChangePasswordRequest,
    responses(
        (status = 200, description = "Password changed"),
        (status = 401, description = "Invalid current password")
    ),
    tag = "auth"
)]
pub async fn change_password(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<Json<Value>, AppError> {
    if req.new_password.len() < 4 {
        return Err(AppError::BadRequest("New password must be at least 4 characters".into()));
    }

    let username = auth.0.sub.clone();

    // Fetch user to verify current password.
    let result: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let user = result.into_iter().next().ok_or(AppError::Unauthorized)?;

    // Verify current password.
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Internal("Invalid hash".into()))?;
    Argon2::default()
        .verify_password(req.current_password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::BadRequest("Current password is incorrect".into()))?;

    // Hash new password.
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?
        .to_string();

    // Update in DB.
    state.db
        .query("UPDATE users SET password_hash = $hash, updated_at = time::now() WHERE username = $username")
        .bind(("hash", new_hash))
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    info!("Password changed for user '{}'", auth.0.sub);

    Ok(Json(json!({
        "message": "Password changed successfully"
    })))
}
