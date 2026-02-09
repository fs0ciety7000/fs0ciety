-- ╔══════════════════════════════════════════════════════════════╗
-- ║  fs0ciety — Seed Data                                      ║
-- ║  Admin user + sample blog posts                            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── Admin User ──────────────────────────────────────────────────
-- Password: admin (argon2 hash)
-- Generate a new hash: echo -n "admin" | argon2 saltsalt -id -e
-- This is a dev-only seed. Replace the hash in production.

CREATE users:admin SET
    username      = "admin",
    password_hash = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$JEW6sMPCxMq/RjLD0y1FYwAOoxfcPdH4sP5EqypHRbU",
    role          = "admin",
    email         = "admin@fs0ciety.local",
    created_at    = time::now(),
    updated_at    = time::now(),
    last_login    = NONE;

-- ── Blog Posts ──────────────────────────────────────────────────

CREATE posts:hello_world SET
    title      = "Hello, World — Initializing fs0ciety",
    slug       = "hello-world",
    content    = "## Welcome

This is the first post on **fs0ciety**, a terminal-themed blog and seedbox dashboard built with Rust and Next.js.

> \"The world is a dangerous place, not because of those who do evil, but because of those who look on and do nothing.\"

## The Stack

The architecture behind this project:

- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS 4
- **Backend**: Rust with Axum — fast, safe, concurrent
- **Database**: SurrealDB for flexible document + graph queries
- **Real-time**: WebSocket streams for seedbox monitoring

## Why?

Because every hacker needs a home base. A place where the terminal meets the browser, where markdown becomes a weapon of expression, and where your seedbox stats glow green in the dark.

```rust
fn main() {
    println!(\"Hello from fs0ciety\");
}
```

More posts coming soon. Stay tuned.",
    tags       = ["meta", "rust", "nextjs"],
    published  = true,
    author     = "admin",
    created_at = <datetime> "2026-02-01T12:00:00Z",
    updated_at = <datetime> "2026-02-01T12:00:00Z";

CREATE posts:rust_axum_guide SET
    title      = "Building High-Performance APIs with Axum",
    slug       = "rust-axum-guide",
    content    = "## Why Axum?

Axum is a web framework built on top of `tokio` and `tower`, designed for ergonomic and modular web services in Rust.

### Key Features

- **Type-safe routing** — extractors validate your data at compile time
- **Tower middleware** — reuse the entire Tower ecosystem
- **WebSocket support** — built-in, first-class
- **Minimal boilerplate** — clean handler signatures

## A Basic Handler

```rust
use axum::{routing::get, Router, Json};
use serde_json::{json, Value};

async fn hello() -> Json<Value> {
    Json(json!({ \"message\": \"Hello from Axum\" }))
}

#[tokio::main]
async fn main() {
    let app = Router::new().route(\"/\", get(hello));
    let listener = tokio::net::TcpListener::bind(\"0.0.0.0:3000\")
        .await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

## Error Handling

Axum lets you define a unified error type that implements `IntoResponse`. Every handler can return `Result<T, AppError>` and errors automatically serialize to JSON with proper status codes.

## Conclusion

If you're building APIs in Rust, Axum is the pragmatic choice. It's fast, composable, and the developer experience is excellent.",
    tags       = ["rust", "axum", "backend"],
    published  = true,
    author     = "admin",
    created_at = <datetime> "2026-02-05T09:30:00Z",
    updated_at = <datetime> "2026-02-05T09:30:00Z";

CREATE posts:seedbox_architecture SET
    title      = "Designing a Self-Hosted Seedbox Dashboard",
    slug       = "seedbox-architecture",
    content    = "## The Problem

Managing a seedbox means juggling multiple services: qBittorrent for torrents, Sonarr/Radarr for automation, Plex for streaming. Each has its own UI, its own API, its own quirks.

## The Solution

A unified **Command Center** that proxies all these APIs through a single Rust backend and presents them in a coherent dashboard.

### Architecture

- **Proxy Layer**: Axum handlers that forward requests to Sonarr, Radarr, Plex, and qBittorrent APIs
- **WebSocket**: Real-time stats (download speed, disk usage) pushed every 2 seconds
- **Metrics Store**: Historical data in SurrealDB for trend analysis
- **ASCII Charts**: Because we render graphs in Unicode block characters like civilized people

## Security Considerations

- All service API keys stay server-side — never exposed to the browser
- JWT authentication for dashboard access
- Role-based access: admin sees everything, guest sees the blog

## Docker Compose

The entire stack — frontend, backend, database, reverse proxy — runs in Docker Compose with Traefik handling TLS via Let's Encrypt.

```yaml
services:
  traefik:
    image: traefik:v3.2
  backend:
    build: ./backend
  frontend:
    build: ./frontend
  surrealdb:
    image: surrealdb/surrealdb:v2
```

The result: a single `docker compose up -d` to deploy your entire seedbox dashboard.",
    tags       = ["seedbox", "docker", "infrastructure"],
    published  = true,
    author     = "admin",
    created_at = <datetime> "2026-02-08T16:00:00Z",
    updated_at = <datetime> "2026-02-08T16:00:00Z";
