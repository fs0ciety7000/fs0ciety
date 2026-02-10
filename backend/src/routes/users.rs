use axum::extract::{Path, State};
use axum::Json;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use serde_json::{json, Value};
use tracing::info;

use crate::error::AppError;
use crate::middleware::AdminUser;
use crate::models::{CreateUserRequest, User};
use crate::AppState;

/// GET /api/admin/users — list all users (admin only).
#[utoipa::path(
    get,
    path = "/api/admin/users",
    responses((status = 200, description = "List of users", body = Value)),
    tag = "admin"
)]
pub async fn list_users(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, AppError> {
    let users: Vec<User> = state.db
        .query("SELECT * FROM users ORDER BY created_at ASC")
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let users_public: Vec<Value> = users.iter().map(|u| {
        json!({
            "username": u.username,
            "role": u.role,
            "email": u.email,
            "created_at": u.created_at,
            "last_login": u.last_login,
        })
    }).collect();

    Ok(Json(json!({
        "users": users_public,
        "total": users_public.len()
    })))
}

/// POST /api/admin/users — create a new user (admin only).
#[utoipa::path(
    post,
    path = "/api/admin/users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = Value),
        (status = 409, description = "Username already exists")
    ),
    tag = "admin"
)]
pub async fn create_user(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<Value>, AppError> {
    if req.username.len() < 3 {
        return Err(AppError::BadRequest("Username must be at least 3 characters".into()));
    }
    if req.password.len() < 4 {
        return Err(AppError::BadRequest("Password must be at least 4 characters".into()));
    }

    // Check if username already exists.
    let existing: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", req.username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if !existing.is_empty() {
        return Err(AppError::BadRequest(format!("Username '{}' already exists", req.username)));
    }

    // Hash password.
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?
        .to_string();

    let role_str = serde_json::to_value(&req.role)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| "guest".into());

    state.db
        .query(
            "CREATE users SET \
                username = $username, \
                password_hash = $hash, \
                role = $role, \
                email = $email, \
                created_at = time::now(), \
                updated_at = time::now(), \
                last_login = NONE"
        )
        .bind(("username", req.username.clone()))
        .bind(("hash", hash.clone()))
        .bind(("role", role_str.clone()))
        .bind(("email", req.email.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    info!("User '{}' created with role '{}'", req.username, role_str);

    Ok(Json(json!({
        "message": format!("User '{}' created", req.username),
        "username": req.username,
        "role": req.role
    })))
}

/// DELETE /api/admin/users/:username — delete a user (admin only, cannot delete self).
#[utoipa::path(
    delete,
    path = "/api/admin/users/{username}",
    params(("username" = String, Path,)),
    responses(
        (status = 200, description = "User deleted"),
        (status = 400, description = "Cannot delete self"),
        (status = 404, description = "User not found")
    ),
    tag = "admin"
)]
pub async fn delete_user(
    State(state): State<AppState>,
    admin: AdminUser,
    Path(username): Path<String>,
) -> Result<Json<Value>, AppError> {
    if username == admin.0.sub {
        return Err(AppError::BadRequest("Cannot delete your own account".into()));
    }

    let result: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if result.is_empty() {
        return Err(AppError::NotFound(format!("User '{}' not found", username)));
    }

    state.db
        .query("DELETE FROM users WHERE username = $username")
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    info!("User '{}' deleted", username);

    Ok(Json(json!({
        "deleted": true,
        "username": username
    })))
}
