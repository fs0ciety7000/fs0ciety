use axum::extract::{Path, State};
use axum::Json;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use serde_json::{json, Value};
use tracing::info;

use axum::http::HeaderMap;
use crate::error::AppError;
use crate::middleware::AdminUser;
use crate::models::{CreateUserRequest, UpdateUserRequest, User};
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
            "bio": u.bio,
            "avatar_url": u.avatar_url,
            "profile_public": u.profile_public,
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
                bio = NONE, \
                avatar_url = NONE, \
                profile_public = true, \
                created_at = time::now(), \
                updated_at = time::now(), \
                last_login = NONE"
        )
        .bind(("username", req.username.clone()))
        .bind(("hash", hash))
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

/// PUT /api/admin/users/:username — update a user (admin only).
#[utoipa::path(
    put,
    path = "/api/admin/users/{username}",
    request_body = UpdateUserRequest,
    params(("username" = String, Path,)),
    responses(
        (status = 200, description = "User updated"),
        (status = 404, description = "User not found")
    ),
    tag = "admin"
)]
pub async fn update_user(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(target_username): Path<String>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<Value>, AppError> {
    let existing: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", target_username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if existing.is_empty() {
        return Err(AppError::NotFound(format!("User '{}' not found", target_username)));
    }

    // Build dynamic SET clauses.
    let mut sets = vec!["updated_at = time::now()".to_string()];

    if let Some(ref new_username) = req.username {
        if new_username.len() < 3 {
            return Err(AppError::BadRequest("Username must be at least 3 characters".into()));
        }
        if *new_username != target_username {
            let conflict: Vec<User> = state.db
                .query("SELECT * FROM users WHERE username = $check_name LIMIT 1")
                .bind(("check_name", new_username.clone()))
                .await
                .map_err(|e| AppError::Database(e.to_string()))?
                .take(0)
                .map_err(|e| AppError::Database(e.to_string()))?;
            if !conflict.is_empty() {
                return Err(AppError::BadRequest(format!("Username '{}' already taken", new_username)));
            }
        }
        sets.push(format!("username = '{}'", new_username.replace('\'', "''")));
    }

    if let Some(ref email) = req.email {
        sets.push(format!("email = '{}'", email.replace('\'', "''")));
    }

    if let Some(ref role) = req.role {
        let role_str = serde_json::to_value(role)
            .ok()
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_else(|| "guest".into());
        sets.push(format!("role = '{}'", role_str));
    }

    if let Some(ref password) = req.password {
        if password.len() < 4 {
            return Err(AppError::BadRequest("Password must be at least 4 characters".into()));
        }
        let salt = SaltString::generate(&mut OsRng);
        let hash = Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Hash error: {}", e)))?
            .to_string();
        sets.push(format!("password_hash = '{}'", hash.replace('\'', "''")));
    }

    if let Some(ref bio) = req.bio {
        if bio.is_empty() {
            sets.push("bio = NONE".to_string());
        } else {
            sets.push(format!("bio = '{}'", bio.replace('\'', "''")));
        }
    }

    if let Some(ref avatar_url) = req.avatar_url {
        if avatar_url.is_empty() {
            sets.push("avatar_url = NONE".to_string());
        } else {
            sets.push(format!("avatar_url = '{}'", avatar_url.replace('\'', "''")));
        }
    }

    if let Some(profile_public) = req.profile_public {
        sets.push(format!("profile_public = {}", profile_public));
    }

    let query = format!(
        "UPDATE users SET {} WHERE username = $target",
        sets.join(", ")
    );

    state.db
        .query(&query)
        .bind(("target", target_username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let final_username = req.username.as_deref().unwrap_or(&target_username);
    info!("User '{}' updated", final_username);

    Ok(Json(json!({
        "message": format!("User '{}' updated", final_username),
        "username": final_username
    })))
}

/// GET /api/users/:username — public profile.
/// If the profile is private, only the user themselves (or admin) can see full details.
pub async fn get_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(username): Path<String>,
) -> Result<Json<Value>, AppError> {
    let users: Vec<User> = state.db
        .query("SELECT * FROM users WHERE username = $username LIMIT 1")
        .bind(("username", username.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let user = users.into_iter().next()
        .ok_or_else(|| AppError::NotFound(format!("User '{}' not found", username)))?;

    // Try to identify the caller from Bearer token (best-effort, no error if absent).
    let caller_username = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .and_then(|token| {
            // Check API key first.
            if !state.config.admin_api_key.is_empty() && token == state.config.admin_api_key {
                return Some("__admin__".to_string());
            }
            // Try JWT decode.
            jsonwebtoken::decode::<crate::middleware::Claims>(
                token,
                &jsonwebtoken::DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
                &jsonwebtoken::Validation::default(),
            )
            .ok()
            .map(|td| td.claims.sub)
        });

    let is_self = caller_username.as_deref() == Some(&user.username);
    let is_admin = caller_username.as_deref() == Some("__admin__")
        || caller_username.as_ref().map_or(false, |_| {
            // Check if caller is admin role (quick check via claims we already decoded above).
            // For simplicity, re-check from headers.
            headers
                .get("authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|h| h.strip_prefix("Bearer "))
                .and_then(|token| {
                    jsonwebtoken::decode::<crate::middleware::Claims>(
                        token,
                        &jsonwebtoken::DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
                        &jsonwebtoken::Validation::default(),
                    )
                    .ok()
                    .map(|td| td.claims.role == "admin")
                })
                .unwrap_or(false)
        });

    // If profile is private and caller is not the user or admin, return limited info.
    if !user.profile_public && !is_self && !is_admin {
        return Ok(Json(json!({
            "username": user.username,
            "role": user.role,
            "profile_public": false,
            "private": true,
            "created_at": user.created_at,
        })));
    }

    Ok(Json(json!({
        "username": user.username,
        "role": user.role,
        "email": if is_self || is_admin { user.email.clone() } else { None },
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "profile_public": user.profile_public,
        "created_at": user.created_at,
        "last_login": user.last_login,
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
