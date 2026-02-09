mod config;
mod db;
mod error;
mod models;
mod proxy;
mod routes;
mod ws;

use axum::{
    routing::{get, post},
    Router,
};
use config::Config;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

#[derive(OpenApi)]
#[openapi(
    paths(
        routes::health::health_check,
        routes::sonarr::get_series,
        routes::sonarr::get_calendar,
        routes::seedbox::get_stats,
        routes::auth::login,
        routes::posts::list_posts,
        routes::posts::get_post,
        routes::posts::list_tags,
        routes::posts::admin_list_posts,
        routes::posts::admin_get_post,
        routes::posts::create_post,
        routes::posts::update_post,
        routes::posts::delete_post,
        routes::posts::admin_stats,
    ),
    components(schemas(
        models::User,
        models::UserRole,
        models::LoginRequest,
        models::LoginResponse,
        models::Post,
        models::PostSummary,
        models::CreatePostRequest,
        models::SeedboxMetrics,
        models::RealtimeStats,
        models::ServiceStatuses,
        models::ServiceStatus,
    )),
    tags(
        (name = "system", description = "Health & status"),
        (name = "auth", description = "Authentication"),
        (name = "seedbox", description = "Seedbox dashboard & proxy"),
        (name = "blog", description = "Blog posts"),
        (name = "admin", description = "Admin dashboard"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() {
    // Load .env if present (dev only).
    let _ = dotenvy::dotenv();

    // Initialize tracing.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,fs0ciety_backend=debug".into()),
        )
        .json()
        .init();

    let config = Config::from_env();
    let bind_addr = config.bind_addr();

    // ── CORS ────────────────────────────────────────────
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // ── Routes ──────────────────────────────────────────
    let app = Router::new()
        // System
        .route("/api/health", get(routes::health::health_check))
        .route("/api/ping", get(routes::health::ping))
        // Auth
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/auth/me", get(routes::auth::me))
        // Sonarr proxy (mock)
        .route("/api/sonarr/series", get(routes::sonarr::get_series))
        .route("/api/sonarr/calendar", get(routes::sonarr::get_calendar))
        // Seedbox stats
        .route("/api/seedbox/stats", get(routes::seedbox::get_stats))
        // Blog posts (public)
        .route("/api/posts", get(routes::posts::list_posts))
        .route("/api/posts/{slug}", get(routes::posts::get_post))
        .route("/api/tags", get(routes::posts::list_tags))
        // Admin — blog management
        .route("/api/admin/posts", get(routes::posts::admin_list_posts).post(routes::posts::create_post))
        .route("/api/admin/posts/{slug}", get(routes::posts::admin_get_post).put(routes::posts::update_post).delete(routes::posts::delete_post))
        .route("/api/admin/stats", get(routes::posts::admin_stats))
        // WebSocket for real-time stats
        .route("/ws", get(ws::ws_handler))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi()))
        // Middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // ── Serve ───────────────────────────────────────────
    let addr: SocketAddr = bind_addr.parse().expect("Invalid bind address");
    info!("fs0ciety backend listening on {}", addr);
    info!("Swagger UI: http://{}/swagger-ui/", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
