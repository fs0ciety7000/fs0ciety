use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::AppError;
use crate::middleware::AdminUser;
use crate::AppState;

/// Fields to select — excludes SurrealDB `id` (RecordId enum) which
/// cannot be deserialized to serde_json::Value.
const POST_FIELDS: &str = "slug, title, content, tags, published, author, created_at, updated_at";

/// Calculate reading time and word count from markdown content.
fn content_stats(content: &str) -> (usize, usize) {
    let stripped = content
        .lines()
        .filter(|l| !l.starts_with("```"))
        .collect::<Vec<_>>()
        .join(" ");
    let word_count = stripped.split_whitespace().count();
    let reading_time = (word_count as f64 / 238.0).ceil() as usize;
    (word_count, reading_time.max(1))
}

/// Generate excerpt from markdown content (first meaningful paragraph).
fn excerpt(content: &str, max_len: usize) -> String {
    let text = content
        .lines()
        .find(|l| {
            let t = l.trim();
            !t.is_empty()
                && !t.starts_with('#')
                && !t.starts_with('>')
                && !t.starts_with("```")
                && !t.starts_with('-')
                && !t.starts_with('|')
        })
        .unwrap_or("")
        .replace("**", "")
        .replace('*', "")
        .replace('`', "");

    if text.len() <= max_len {
        text
    } else {
        format!(
            "{}...",
            &text[..text[..max_len].rfind(' ').unwrap_or(max_len)]
        )
    }
}

/// Enrich a post with reading_time, word_count, excerpt.
fn enrich(p: &Value) -> Value {
    let content = p["content"].as_str().unwrap_or("");
    let (wc, rt) = content_stats(content);
    let mut enriched = p.clone();
    enriched["readingTime"] = json!(rt);
    enriched["wordCount"] = json!(wc);
    enriched["excerpt"] = json!(excerpt(content, 160));
    enriched
}

/// Build a summary (no content body).
fn to_summary(p: &Value) -> Value {
    json!({
        "slug": p["slug"],
        "title": p["title"],
        "tags": p["tags"],
        "published": p["published"],
        "author": p["author"],
        "createdAt": p["created_at"],
        "updatedAt": p["updated_at"],
        "readingTime": p["readingTime"],
        "wordCount": p["wordCount"],
        "excerpt": p["excerpt"],
    })
}

// ── Public routes ──────────────────────────────────────────

/// GET /api/posts — list published posts with reading time.
#[utoipa::path(get, path = "/api/posts", responses((status = 200, body = Value)), tag = "blog")]
pub async fn list_posts(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let q = format!("SELECT {POST_FIELDS} FROM posts WHERE published = true ORDER BY created_at DESC");
    let rows: Vec<Value> = state.db
        .query(q)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let posts: Vec<Value> = rows.iter().map(|p| to_summary(&enrich(p))).collect();
    let total = posts.len();
    Ok(Json(json!({ "posts": posts, "total": total })))
}

/// GET /api/posts/:slug — get a single published post.
#[utoipa::path(get, path = "/api/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "blog")]
pub async fn get_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<Value>, AppError> {
    let q = format!("SELECT {POST_FIELDS} FROM posts WHERE slug = $slug AND published = true LIMIT 1");
    let rows: Vec<Value> = state.db
        .query(q)
        .bind(("slug", slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.into_iter().next() {
        Some(p) => Ok(Json(enrich(&p))),
        None => Err(AppError::NotFound(format!("Post '{}' not found", slug))),
    }
}

/// GET /api/tags — list all unique tags with post counts.
#[utoipa::path(get, path = "/api/tags", responses((status = 200, body = Value)), tag = "blog")]
pub async fn list_tags(State(state): State<AppState>) -> Result<Json<Value>, AppError> {
    let rows: Vec<Value> = state.db
        .query("SELECT tags FROM posts WHERE published = true")
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for row in &rows {
        if let Some(tags) = row["tags"].as_array() {
            for t in tags.iter().filter_map(|v| v.as_str()) {
                *counts.entry(t.to_string()).or_default() += 1;
            }
        }
    }
    let tags: Vec<Value> = counts
        .into_iter()
        .map(|(name, count)| json!({"name": name, "count": count}))
        .collect();
    Ok(Json(json!({ "tags": tags })))
}

// ── Admin routes ───────────────────────────────────────────

/// GET /api/admin/posts — list ALL posts including drafts.
#[utoipa::path(get, path = "/api/admin/posts", responses((status = 200, body = Value)), tag = "admin")]
pub async fn admin_list_posts(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, AppError> {
    let q = format!("SELECT {POST_FIELDS} FROM posts ORDER BY created_at DESC");
    let rows: Vec<Value> = state.db
        .query(q)
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let posts: Vec<Value> = rows.iter().map(|p| to_summary(&enrich(p))).collect();
    let total = posts.len();
    Ok(Json(json!({ "posts": posts, "total": total })))
}

/// GET /api/admin/posts/:slug
#[utoipa::path(get, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn admin_get_post(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(slug): Path<String>,
) -> Result<Json<Value>, AppError> {
    let q = format!("SELECT {POST_FIELDS} FROM posts WHERE slug = $slug LIMIT 1");
    let rows: Vec<Value> = state.db
        .query(q)
        .bind(("slug", slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.into_iter().next() {
        Some(p) => Ok(Json(enrich(&p))),
        None => Err(AppError::NotFound("Post not found".into())),
    }
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct PostBody {
    pub title: String,
    pub slug: String,
    pub content: String,
    pub tags: Vec<String>,
    pub published: bool,
}

/// POST /api/admin/posts — create a new post.
#[utoipa::path(post, path = "/api/admin/posts", responses((status = 201, body = Value), (status = 409)), tag = "admin")]
pub async fn create_post(
    State(state): State<AppState>,
    admin: AdminUser,
    Json(body): Json<PostBody>,
) -> Result<Json<Value>, AppError> {
    // Check for slug uniqueness.
    let existing: Vec<Value> = state.db
        .query("SELECT slug FROM posts WHERE slug = $slug LIMIT 1")
        .bind(("slug", body.slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if !existing.is_empty() {
        return Err(AppError::BadRequest(format!("Slug '{}' already exists", body.slug)));
    }

    let tags_val = json!(body.tags);
    let published_val = json!(body.published);

    // CREATE then SELECT to avoid RecordId serialization issue.
    state.db
        .query(
            "CREATE posts SET \
                title = $title, \
                slug = $slug, \
                content = $content, \
                tags = $tags, \
                published = $published, \
                author = $author, \
                created_at = time::now(), \
                updated_at = time::now()"
        )
        .bind(("title", body.title.clone()))
        .bind(("slug", body.slug.clone()))
        .bind(("content", body.content.clone()))
        .bind(("tags", tags_val))
        .bind(("published", published_val))
        .bind(("author", admin.0.sub.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let q = format!("SELECT {POST_FIELDS} FROM posts WHERE slug = $slug LIMIT 1");
    let rows: Vec<Value> = state.db
        .query(q)
        .bind(("slug", body.slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.into_iter().next() {
        Some(p) => Ok(Json(enrich(&p))),
        None => Err(AppError::Internal("Failed to create post".into())),
    }
}

/// PUT /api/admin/posts/:slug — update an existing post.
#[utoipa::path(put, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn update_post(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(slug): Path<String>,
    Json(body): Json<PostBody>,
) -> Result<Json<Value>, AppError> {
    let tags_val = json!(body.tags);
    let published_val = json!(body.published);

    // UPDATE then SELECT to avoid RecordId serialization issue.
    state.db
        .query(
            "UPDATE posts SET \
                title = $title, \
                slug = $new_slug, \
                content = $content, \
                tags = $tags, \
                published = $published, \
                updated_at = time::now() \
            WHERE slug = $slug"
        )
        .bind(("title", body.title.clone()))
        .bind(("new_slug", body.slug.clone()))
        .bind(("content", body.content.clone()))
        .bind(("tags", tags_val))
        .bind(("published", published_val))
        .bind(("slug", slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    let q = format!("SELECT {POST_FIELDS} FROM posts WHERE slug = $slug LIMIT 1");
    let rows: Vec<Value> = state.db
        .query(q)
        .bind(("slug", body.slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.into_iter().next() {
        Some(p) => Ok(Json(enrich(&p))),
        None => Err(AppError::NotFound("Post not found".into())),
    }
}

/// DELETE /api/admin/posts/:slug — delete a post.
#[utoipa::path(delete, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn delete_post(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(slug): Path<String>,
) -> Result<Json<Value>, AppError> {
    let rows: Vec<Value> = state.db
        .query("SELECT slug FROM posts WHERE slug = $slug LIMIT 1")
        .bind(("slug", slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    if rows.is_empty() {
        return Err(AppError::NotFound("Post not found".into()));
    }

    state.db
        .query("DELETE FROM posts WHERE slug = $slug")
        .bind(("slug", slug.clone()))
        .await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(json!({"deleted": true, "slug": slug})))
}

/// GET /api/admin/stats — dashboard overview.
#[utoipa::path(get, path = "/api/admin/stats", responses((status = 200, body = Value)), tag = "admin")]
pub async fn admin_stats(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, AppError> {
    let all_posts: Vec<Value> = state.db
        .query("SELECT content, published, tags FROM posts")
        .await
        .map_err(|e| AppError::Database(e.to_string()))?
        .take(0)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let total = all_posts.len();
    let published = all_posts
        .iter()
        .filter(|p| p["published"].as_bool().unwrap_or(false))
        .count();
    let mut all_tags = std::collections::HashSet::new();
    let mut total_words: usize = 0;
    for p in &all_posts {
        let (wc, _) = content_stats(p["content"].as_str().unwrap_or(""));
        total_words += wc;
        if let Some(tags) = p["tags"].as_array() {
            for t in tags.iter().filter_map(|v| v.as_str()) {
                all_tags.insert(t.to_string());
            }
        }
    }

    Ok(Json(json!({
        "totalPosts": total,
        "publishedPosts": published,
        "draftPosts": total - published,
        "totalTags": all_tags.len(),
        "totalWords": total_words,
    })))
}
