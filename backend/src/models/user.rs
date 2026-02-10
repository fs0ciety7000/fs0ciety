use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;
use utoipa::ToSchema;

/// Role-based access: admin gets dashboard, guest gets blog-only.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Guest,
}

/// Mirrors the SurrealDB `users` table exactly.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct User {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)]
    pub id: Option<Thing>,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: UserRole,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
    pub role: UserRole,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: UserRole,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

/// Safe user representation for API responses (no password_hash).
#[derive(Debug, Serialize, ToSchema)]
pub struct UserPublic {
    pub username: String,
    pub role: UserRole,
    pub email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}
