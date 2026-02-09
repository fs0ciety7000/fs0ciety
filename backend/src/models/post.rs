use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use surrealdb::sql::Thing;
use utoipa::ToSchema;

/// Blog post — content stored as MDX for rich React-component embedding.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Post {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>)]
    pub id: Option<Thing>,
    pub title: String,
    pub slug: String,
    /// Raw MDX content.
    pub content: String,
    pub tags: Vec<String>,
    pub published: bool,
    pub author: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreatePostRequest {
    pub title: String,
    pub slug: String,
    pub content: String,
    pub tags: Vec<String>,
    pub published: bool,
}

/// Lightweight post listing without full content.
#[derive(Debug, Serialize, ToSchema)]
pub struct PostSummary {
    pub slug: String,
    pub title: String,
    pub tags: Vec<String>,
    pub published: bool,
    pub created_at: DateTime<Utc>,
}
