use axum::{
    extract::{FromRequestParts, State},
    http::request::Parts,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // username
    pub role: String,     // "admin" or "guest"
    pub exp: usize,       // expiry timestamp
    pub iat: usize,       // issued at
}

/// Try to extract a Bearer token from the Authorization header.
fn extract_bearer(parts: &Parts) -> Option<&str> {
    parts
        .headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
}

/// Check if the provided token matches the static ADMIN_API_KEY.
/// Returns synthetic admin Claims if it does.
fn check_api_key(token: &str, state: &AppState) -> Option<Claims> {
    let key = &state.config.admin_api_key;
    if !key.is_empty() && token == key {
        Some(Claims {
            sub: "api".into(),
            role: "admin".into(),
            exp: usize::MAX,
            iat: 0,
        })
    } else {
        None
    }
}

/// Extractor that validates a JWT Bearer token and returns the Claims.
/// Also accepts a static ADMIN_API_KEY as an alternative.
pub struct AuthUser(pub Claims);

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = extract_bearer(parts).ok_or(AppError::Unauthorized)?;

        // Try static API key first.
        if let Some(claims) = check_api_key(token, state) {
            return Ok(AuthUser(claims));
        }

        // Fall back to JWT.
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| AppError::Unauthorized)?;

        Ok(AuthUser(token_data.claims))
    }
}

/// Extractor that requires admin role.
pub struct AdminUser(pub Claims);

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;
        if claims.role != "admin" {
            return Err(AppError::Unauthorized);
        }
        Ok(AdminUser(claims))
    }
}
