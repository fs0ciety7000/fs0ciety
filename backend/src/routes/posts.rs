use axum::extract::Path;
use axum::Json;
use chrono::Utc;
use serde_json::{json, Value};

/// Mock blog posts — will be replaced by SurrealDB queries.
fn mock_posts() -> Vec<Value> {
    vec![
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
            "content": "## The Problem\n\nManaging a seedbox means juggling multiple services: qBittorrent for torrents, Sonarr/Radarr for automation, Plex for streaming. Each has its own UI, its own API, its own quirks.\n\n## The Solution\n\nA unified **Command Center** that proxies all these APIs through a single Rust backend and presents them in a coherent dashboard.\n\n### Architecture\n\n- **Proxy Layer**: Axum handlers that forward requests to Sonarr, Radarr, Plex, and qBittorrent APIs\n- **WebSocket**: Real-time stats (download speed, disk usage) pushed every 2 seconds\n- **Metrics Store**: Historical data in SurrealDB for trend analysis\n- **ASCII Charts**: Because we render graphs in Unicode block characters like civilized people\n\n## Security Considerations\n\n- All service API keys stay server-side — never exposed to the browser\n- JWT authentication for dashboard access\n- Role-based access: admin sees everything, guest sees the blog\n\n## Docker Compose\n\nThe entire stack — frontend, backend, database, reverse proxy — runs in Docker Compose with Traefik handling TLS via Let's Encrypt.\n\n```yaml\nservices:\n  traefik:\n    image: traefik:v3.2\n    # TLS termination, automatic HTTPS\n  backend:\n    build: ./backend\n    # Rust binary in distroless container\n  frontend:\n    build: ./frontend\n    # Next.js standalone mode\n  surrealdb:\n    image: surrealdb/surrealdb:v2\n    # RocksDB persistence\n```\n\nThe result: a single `docker compose up -d` to deploy your entire seedbox dashboard.",
            "tags": ["seedbox", "docker", "infrastructure"],
            "published": true,
            "author": "admin",
            "createdAt": "2026-02-08T16:00:00Z",
            "updatedAt": "2026-02-08T16:00:00Z"
        }),
    ]
}

/// GET /api/posts — list all published posts (summaries).
#[utoipa::path(
    get,
    path = "/api/posts",
    responses(
        (status = 200, description = "List of published blog posts", body = Value)
    ),
    tag = "blog"
)]
pub async fn list_posts() -> Json<Value> {
    let posts: Vec<Value> = mock_posts()
        .into_iter()
        .filter(|p| p["published"].as_bool().unwrap_or(false))
        .map(|p| {
            json!({
                "slug": p["slug"],
                "title": p["title"],
                "tags": p["tags"],
                "published": p["published"],
                "createdAt": p["createdAt"],
            })
        })
        .collect();

    Json(json!({ "posts": posts, "total": posts.len() }))
}

/// GET /api/posts/:slug — get a single post by slug.
#[utoipa::path(
    get,
    path = "/api/posts/{slug}",
    params(("slug" = String, Path, description = "Post URL slug")),
    responses(
        (status = 200, description = "Full blog post", body = Value),
        (status = 404, description = "Post not found")
    ),
    tag = "blog"
)]
pub async fn get_post(Path(slug): Path<String>) -> axum::response::Result<Json<Value>, Json<Value>> {
    let post = mock_posts()
        .into_iter()
        .find(|p| p["slug"].as_str() == Some(slug.as_str()));

    match post {
        Some(p) => Ok(Json(p)),
        None => Err(Json(json!({
            "error": true,
            "message": format!("Post '{}' not found", slug),
        }))),
    }
}
