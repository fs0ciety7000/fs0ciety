mod config;
mod db;
mod error;
mod middleware;
mod models;
mod proxy;
mod routes;
mod ws;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use config::Config;
use std::net::SocketAddr;
use axum::http::{header, Method};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::info;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

/// Shared application state available to all handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: db::Db,
    pub config: Config,
    pub proxy: proxy::ProxyClient,
}

#[derive(OpenApi)]
#[openapi(
    paths(
        routes::health::health_check,
        routes::sonarr::get_series,
        routes::sonarr::get_calendar,
        routes::seedbox::get_stats,
        routes::auth::login,
        routes::auth::change_password,
        routes::auth::forgot_password,
        routes::auth::reset_password,
        routes::posts::list_posts,
        routes::posts::get_post,
        routes::posts::list_tags,
        routes::posts::admin_list_posts,
        routes::posts::admin_get_post,
        routes::posts::create_post,
        routes::posts::update_post,
        routes::posts::delete_post,
        routes::posts::admin_stats,
        routes::users::list_users,
        routes::users::create_user,
        routes::users::update_user,
        routes::users::delete_user,
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
        models::CreateUserRequest,
        models::ChangePasswordRequest,
        models::ForgotPasswordRequest,
        models::ResetPasswordRequest,
        models::UpdateUserRequest,
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

    // Connect to SurrealDB.
    let database = db::init(&config).await.expect("Failed to connect to SurrealDB");

    // Seed admin user if no users exist.
    db::seed::ensure_admin(&database).await.expect("Failed to seed admin user");

    info!("Service URLs configured:");
    info!("  Plex:         {}", config.plex_url);
    info!("  Sonarr:       {}", config.sonarr_url);
    info!("  Radarr:       {}", config.radarr_url);
    info!("  qBittorrent:  {}", config.qbittorrent_url);

    let proxy = proxy::ProxyClient::new(config.clone());

    let state = AppState {
        db: database,
        config: config.clone(),
        proxy,
    };

    // ── CORS ────────────────────────────────────────────
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
        ]);

    // ── Routes ──────────────────────────────────────────
    let app = Router::new()
        // System
        .route("/api/health", get(routes::health::health_check))
        .route("/api/ping", get(routes::health::ping))
        // Auth
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/auth/me", get(routes::auth::me))
        .route("/api/auth/change-password", put(routes::auth::change_password))
        .route("/api/auth/forgot-password", post(routes::auth::forgot_password))
        .route("/api/auth/reset-password", post(routes::auth::reset_password))
        // Sonarr proxy
        .route("/api/sonarr/series", get(routes::sonarr::get_series))
        .route("/api/sonarr/calendar", get(routes::sonarr::get_calendar))
        // Seedbox stats (real)
        .route("/api/seedbox/stats", get(routes::seedbox::get_stats))
        // Dashboard media (Plex, Sonarr, Radarr aggregated)
        .route("/api/dashboard/media", get(routes::media::get_media))
        // Blog posts (public)
        .route("/api/posts", get(routes::posts::list_posts))
        .route("/api/posts/{slug}", get(routes::posts::get_post))
        .route("/api/tags", get(routes::posts::list_tags))
        // Admin — blog management
        .route("/api/admin/posts", get(routes::posts::admin_list_posts).post(routes::posts::create_post))
        .route("/api/admin/posts/{slug}", get(routes::posts::admin_get_post).put(routes::posts::update_post).delete(routes::posts::delete_post))
        .route("/api/admin/stats", get(routes::posts::admin_stats))
        // Admin — user management
        .route("/api/admin/users", get(routes::users::list_users).post(routes::users::create_user))
        .route("/api/admin/users/{username}", get(routes::users::get_profile).put(routes::users::update_user).delete(routes::users::delete_user))
        // Public profiles
        .route("/api/users/{username}", get(routes::users::get_profile))
        // File upload
        .route("/api/upload", post(routes::upload::upload_file))
        .route("/api/uploads/{filename}", get(routes::upload::serve_upload))
        // WebSocket for real-time stats
        .route("/ws", get(ws::ws_handler))
        // Swagger UI
        .merge(SwaggerUi::new("/swagger-ui")
            .url("/api-docs/openapi.json", ApiDoc::openapi()))
        // State & middleware
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    // ── Serve ───────────────────────────────────────────
    let addr: SocketAddr = bind_addr.parse().expect("Invalid bind address");
    info!("fs0ciety backend listening on {}", addr);
    info!("Swagger UI: http://{}/swagger-ui/", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
