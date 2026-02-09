use axum::extract::Path;
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};

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

/// Enrich a raw post JSON with reading_time, word_count, excerpt.
fn enrich_post(p: &Value) -> Value {
    let content = p["content"].as_str().unwrap_or("");
    let (wc, rt) = content_stats(content);
    let mut enriched = p.clone();
    enriched["readingTime"] = json!(rt);
    enriched["wordCount"] = json!(wc);
    enriched["excerpt"] = json!(excerpt(content, 160));
    enriched
}

/// Build a summary (no content body) from an enriched post.
fn to_summary(p: &Value) -> Value {
    json!({
        "slug": p["slug"],
        "title": p["title"],
        "tags": p["tags"],
        "published": p["published"],
        "author": p["author"],
        "createdAt": p["createdAt"],
        "updatedAt": p["updatedAt"],
        "readingTime": p["readingTime"],
        "wordCount": p["wordCount"],
        "excerpt": p["excerpt"],
    })
}

// ── In-memory store (mock) ─────────────────────────────────

use std::sync::{LazyLock, Mutex};

static POSTS: LazyLock<Mutex<Vec<Value>>> = LazyLock::new(|| {
    Mutex::new(vec![
        json!({
            "slug": "hello-world",
            "title": "Hello, World — Initializing fs0ciety",
            "content": "## Welcome\n\nThis is the first post on **fs0ciety**, a terminal-themed blog and seedbox dashboard built with Rust and Next.js.\n\n> \"The world is a dangerous place, not because of those who do evil, but because of those who look on and do nothing.\"\n\n## The Stack\n\nThe architecture behind this project:\n\n- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS 4\n- **Backend**: Rust with Axum — fast, safe, concurrent\n- **Database**: SurrealDB for flexible document + graph queries\n- **Real-time**: WebSocket streams for seedbox monitoring\n\n## Why?\n\nBecause every hacker needs a home base. A place where the terminal meets the browser, where markdown becomes a weapon of expression, and where your seedbox stats glow green in the dark.\n\n```rust\nfn main() {\n    println!(\"Hello from fs0ciety\");\n}\n```\n\nMore posts coming soon. Stay tuned.",
            "tags": ["meta", "rust", "nextjs"],
            "published": true,
            "author": "admin",
            "createdAt": "2026-02-01T12:00:00Z",
            "updatedAt": "2026-02-01T12:00:00Z"
        }),
        json!({
            "slug": "rust-axum-guide",
            "title": "Building High-Performance APIs with Axum",
            "content": "## Why Axum?\n\nAxum is a web framework built on top of `tokio` and `tower`, designed for ergonomic and modular web services in Rust.\n\n### Key Features\n\n- **Type-safe routing** — extractors validate your data at compile time\n- **Tower middleware** — reuse the entire Tower ecosystem\n- **WebSocket support** — built-in, first-class\n- **Minimal boilerplate** — clean handler signatures\n\n## A Basic Handler\n\n```rust\nuse axum::{routing::get, Router, Json};\nuse serde_json::{json, Value};\n\nasync fn hello() -> Json<Value> {\n    Json(json!({ \"message\": \"Hello from Axum\" }))\n}\n\n#[tokio::main]\nasync fn main() {\n    let app = Router::new().route(\"/\", get(hello));\n    let listener = tokio::net::TcpListener::bind(\"0.0.0.0:3000\")\n        .await\n        .unwrap();\n    axum::serve(listener, app).await.unwrap();\n}\n```\n\n## Error Handling\n\nAxum lets you define a unified error type that implements `IntoResponse`. Every handler can return `Result<T, AppError>` and errors automatically serialize to JSON with proper status codes.\n\n## Conclusion\n\nIf you're building APIs in Rust, Axum is the pragmatic choice. It's fast, composable, and the developer experience is excellent.",
            "tags": ["rust", "axum", "backend"],
            "published": true,
            "author": "admin",
            "createdAt": "2026-02-05T09:30:00Z",
            "updatedAt": "2026-02-05T09:30:00Z"
        }),
        json!({
            "slug": "seedbox-architecture",
            "title": "Designing a Self-Hosted Seedbox Dashboard",
            "content": "## The Problem\n\nManaging a seedbox means juggling multiple services: qBittorrent for torrents, Sonarr/Radarr for automation, Plex for streaming. Each has its own UI, its own API, its own quirks.\n\n## The Solution\n\nA unified **Command Center** that proxies all these APIs through a single Rust backend and presents them in a coherent dashboard.\n\n### Architecture\n\n- **Proxy Layer**: Axum handlers that forward requests to Sonarr, Radarr, Plex, and qBittorrent APIs\n- **WebSocket**: Real-time stats (download speed, disk usage) pushed every 2 seconds\n- **Metrics Store**: Historical data in SurrealDB for trend analysis\n- **ASCII Charts**: Because we render graphs in Unicode block characters like civilized people\n\n## Security Considerations\n\n- All service API keys stay server-side — never exposed to the browser\n- JWT authentication for dashboard access\n- Role-based access: admin sees everything, guest sees the blog\n\n## Docker Compose\n\nThe entire stack — frontend, backend, database, reverse proxy — runs in Docker Compose with Traefik handling TLS via Let's Encrypt.\n\n```yaml\nservices:\n  traefik:\n    image: traefik:v3.2\n  backend:\n    build: ./backend\n  frontend:\n    build: ./frontend\n  surrealdb:\n    image: surrealdb/surrealdb:v2\n```\n\nThe result: a single `docker compose up -d` to deploy your entire seedbox dashboard.",
            "tags": ["seedbox", "docker", "infrastructure"],
            "published": true,
            "author": "admin",
            "createdAt": "2026-02-08T16:00:00Z",
            "updatedAt": "2026-02-08T16:00:00Z"
        }),
    ])
});

// ── Public routes ──────────────────────────────────────────

/// GET /api/posts — list published posts with reading time.
#[utoipa::path(get, path = "/api/posts", responses((status = 200, body = Value)), tag = "blog")]
pub async fn list_posts() -> Json<Value> {
    let store = POSTS.lock().unwrap();
    let posts: Vec<Value> = store
        .iter()
        .filter(|p| p["published"].as_bool().unwrap_or(false))
        .map(|p| to_summary(&enrich_post(p)))
        .collect();
    Json(json!({ "posts": posts, "total": posts.len() }))
}

/// GET /api/posts/:slug — get a single published post.
#[utoipa::path(get, path = "/api/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "blog")]
pub async fn get_post(
    Path(slug): Path<String>,
) -> axum::response::Result<Json<Value>, Json<Value>> {
    let store = POSTS.lock().unwrap();
    match store.iter().find(|p| p["slug"].as_str() == Some(&slug)) {
        Some(p) => Ok(Json(enrich_post(p))),
        None => Err(Json(
            json!({"error": true, "message": format!("Post '{}' not found", slug)}),
        )),
    }
}

/// GET /api/tags — list all unique tags with post counts.
#[utoipa::path(get, path = "/api/tags", responses((status = 200, body = Value)), tag = "blog")]
pub async fn list_tags() -> Json<Value> {
    let store = POSTS.lock().unwrap();
    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for p in store
        .iter()
        .filter(|p| p["published"].as_bool().unwrap_or(false))
    {
        if let Some(tags) = p["tags"].as_array() {
            for t in tags.iter().filter_map(|v| v.as_str()) {
                *counts.entry(t.to_string()).or_default() += 1;
            }
        }
    }
    let tags: Vec<Value> = counts
        .into_iter()
        .map(|(name, count)| json!({"name": name, "count": count}))
        .collect();
    Json(json!({ "tags": tags }))
}

// ── Admin routes ───────────────────────────────────────────

/// GET /api/admin/posts — list ALL posts including drafts.
#[utoipa::path(get, path = "/api/admin/posts", responses((status = 200, body = Value)), tag = "admin")]
pub async fn admin_list_posts() -> Json<Value> {
    let store = POSTS.lock().unwrap();
    let posts: Vec<Value> = store.iter().map(|p| to_summary(&enrich_post(p))).collect();
    Json(json!({ "posts": posts, "total": posts.len() }))
}

/// GET /api/admin/posts/:slug
#[utoipa::path(get, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn admin_get_post(
    Path(slug): Path<String>,
) -> axum::response::Result<Json<Value>, Json<Value>> {
    let store = POSTS.lock().unwrap();
    match store.iter().find(|p| p["slug"].as_str() == Some(&slug)) {
        Some(p) => Ok(Json(enrich_post(p))),
        None => Err(Json(json!({"error": true, "message": "Not found"}))),
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
    Json(body): Json<PostBody>,
) -> axum::response::Result<Json<Value>, Json<Value>> {
    let mut store = POSTS.lock().unwrap();
    if store
        .iter()
        .any(|p| p["slug"].as_str() == Some(&body.slug))
    {
        return Err(Json(
            json!({"error": true, "message": format!("Slug '{}' already exists", body.slug)}),
        ));
    }
    let now = chrono::Utc::now().to_rfc3339();
    let post = json!({
        "slug": body.slug, "title": body.title, "content": body.content,
        "tags": body.tags, "published": body.published, "author": "admin",
        "createdAt": now, "updatedAt": now,
    });
    store.push(post.clone());
    Ok(Json(enrich_post(&post)))
}

/// PUT /api/admin/posts/:slug — update an existing post.
#[utoipa::path(put, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn update_post(
    Path(slug): Path<String>,
    Json(body): Json<PostBody>,
) -> axum::response::Result<Json<Value>, Json<Value>> {
    let mut store = POSTS.lock().unwrap();
    let idx = store
        .iter()
        .position(|p| p["slug"].as_str() == Some(&slug));
    match idx {
        Some(i) => {
            let now = chrono::Utc::now().to_rfc3339();
            let created = store[i]["createdAt"]
                .as_str()
                .unwrap_or(&now)
                .to_string();
            let author = store[i]["author"]
                .as_str()
                .unwrap_or("admin")
                .to_string();
            let post = json!({
                "slug": body.slug, "title": body.title, "content": body.content,
                "tags": body.tags, "published": body.published, "author": author,
                "createdAt": created, "updatedAt": now,
            });
            store[i] = post.clone();
            Ok(Json(enrich_post(&post)))
        }
        None => Err(Json(json!({"error": true, "message": "Not found"}))),
    }
}

/// DELETE /api/admin/posts/:slug — delete a post.
#[utoipa::path(delete, path = "/api/admin/posts/{slug}", params(("slug" = String, Path,)), responses((status = 200, body = Value), (status = 404)), tag = "admin")]
pub async fn delete_post(
    Path(slug): Path<String>,
) -> axum::response::Result<Json<Value>, Json<Value>> {
    let mut store = POSTS.lock().unwrap();
    let len_before = store.len();
    store.retain(|p| p["slug"].as_str() != Some(&slug));
    if store.len() < len_before {
        Ok(Json(json!({"deleted": true, "slug": slug})))
    } else {
        Err(Json(json!({"error": true, "message": "Not found"})))
    }
}

/// GET /api/admin/stats — dashboard overview.
#[utoipa::path(get, path = "/api/admin/stats", responses((status = 200, body = Value)), tag = "admin")]
pub async fn admin_stats() -> Json<Value> {
    let store = POSTS.lock().unwrap();
    let total = store.len();
    let published = store
        .iter()
        .filter(|p| p["published"].as_bool().unwrap_or(false))
        .count();
    let mut all_tags = std::collections::HashSet::new();
    let mut total_words: usize = 0;
    for p in store.iter() {
        let (wc, _) = content_stats(p["content"].as_str().unwrap_or(""));
        total_words += wc;
        if let Some(tags) = p["tags"].as_array() {
            for t in tags.iter().filter_map(|v| v.as_str()) {
                all_tags.insert(t.to_string());
            }
        }
    }
    Json(json!({
        "totalPosts": total,
        "publishedPosts": published,
        "draftPosts": total - published,
        "totalTags": all_tags.len(),
        "totalWords": total_words,
    }))
}
