use axum::extract::State;
use axum::Json;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use tracing::{info, warn};

use crate::error::AppError;
use crate::middleware::{AuthUser, Claims};
use crate::models::{ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, User};
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

/// POST /api/auth/forgot-password — generate a reset token and send email via Resend.
#[utoipa::path(
    post,
    path = "/api/auth/forgot-password",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Reset email sent (if account exists)"),
    ),
    tag = "auth"
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Result<Json<Value>, AppError> {
    // Always return success to avoid email enumeration.
    let email = req.email.trim().to_lowercase();

    // Look up user by email.
    let result: Vec<User> = state.db
        .query("SELECT * FROM users WHERE email = $email LIMIT 1")
        .bind(("email", email.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if let Some(user) = result.into_iter().next() {
        // Generate a random token.
        let token = uuid::Uuid::new_v4().to_string();
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

        // Store reset token in DB.
        state.db
            .query(
                "CREATE password_resets SET \
                    token = $token, \
                    username = $username, \
                    email = $email, \
                    expires_at = $expires_at, \
                    used = false, \
                    created_at = time::now()"
            )
            .bind(("token", token.clone()))
            .bind(("username", user.username.clone()))
            .bind(("email", email.clone()))
            .bind(("expires_at", expires_at.to_rfc3339()))
            .await
            .map_err(|e| AppError::Database(e.to_string()))?;

        // Send email via Resend API.
        let reset_url = format!("{}/reset-password?token={}", state.config.public_url, token);
        let resend_key = &state.config.resend_api_key;

        if !resend_key.is_empty() {
            let client = reqwest::Client::new();
            let res = client
                .post("https://api.resend.com/emails")
                .header("Authorization", format!("Bearer {}", resend_key))
                .json(&json!({
                    "from": "fs0ciety <noreply@fs0ciety.org>",
                    "to": [email],
                    "subject": "fs0ciety — Password Reset",
                    "html": format!(
                        "<div style=\"font-family:monospace;background:#0a0a0a;color:#00ff41;padding:40px;\">\
                         <h2 style=\"color:#00ff41;\">fs0ciety // Password Reset</h2>\
                         <p>A password reset was requested for user <strong>{}</strong>.</p>\
                         <p>Click the link below to reset your password (expires in 1 hour):</p>\
                         <p><a href=\"{}\" style=\"color:#00d4ff;\">{}</a></p>\
                         <p style=\"color:#666;\">If you did not request this, ignore this email.</p>\
                         </div>",
                        user.username, reset_url, reset_url
                    ),
                }))
                .send()
                .await;

            match res {
                Ok(r) if r.status().is_success() => {
                    info!("Password reset email sent to {} for user '{}'", email, user.username);
                }
                Ok(r) => {
                    let body = r.text().await.unwrap_or_default();
                    warn!("Resend API error: {}", body);
                }
                Err(e) => {
                    warn!("Resend request failed: {}", e);
                }
            }
        } else {
            warn!("RESEND_API_KEY not configured, skipping email send. Reset token: {}", token);
        }
    }

    // Always return success to prevent email enumeration.
    Ok(Json(json!({
        "message": "If an account with that email exists, a reset link has been sent."
    })))
}

/// POST /api/auth/reset-password — verify token and set new password.
#[utoipa::path(
    post,
    path = "/api/auth/reset-password",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset successful"),
        (status = 400, description = "Invalid or expired token"),
    ),
    tag = "auth"
)]
pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<Json<Value>, AppError> {
    if req.new_password.len() < 4 {
        return Err(AppError::BadRequest("Password must be at least 4 characters".into()));
    }

    // Look up the reset token.
    let tokens: Vec<Value> = state.db
        .query("SELECT token, username, expires_at, used FROM password_resets WHERE token = $token LIMIT 1")
        .bind(("token", req.token.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let record = tokens.into_iter().next()
        .ok_or_else(|| AppError::BadRequest("Invalid or expired reset token".into()))?;

    // Check if already used.
    if record["used"].as_bool().unwrap_or(true) {
        return Err(AppError::BadRequest("This reset token has already been used".into()));
    }

    // Check expiration.
    if let Some(expires_str) = record["expires_at"].as_str() {
        if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(expires_str) {
            if chrono::Utc::now() > expires {
                return Err(AppError::BadRequest("Reset token has expired".into()));
            }
        }
    }

    let username = record["username"].as_str()
        .ok_or_else(|| AppError::Internal("Invalid reset record".into()))?
        .to_string();

    // Hash new password.
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?
        .to_string();

    // Update password.
    state.db
        .query("UPDATE users SET password_hash = $hash, updated_at = time::now() WHERE username = $username")
        .bind(("hash", new_hash))
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Mark token as used.
    state.db
        .query("UPDATE password_resets SET used = true WHERE token = $token")
        .bind(("token", req.token))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    info!("Password reset completed for user '{}'", username);

    Ok(Json(json!({
        "message": "Password has been reset successfully"
    })))
}
