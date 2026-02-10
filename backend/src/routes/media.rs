use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use tracing::warn;

use crate::AppState;

/// GET /api/dashboard/media — aggregated media data from Plex, Sonarr, Radarr.
/// Returns all data in a single response to minimize frontend round-trips.
pub async fn get_media(State(state): State<AppState>) -> Json<Value> {
    let proxy = &state.proxy;

    // Fetch everything in parallel.
    let (plex_sessions, plex_recent, sonarr_series, sonarr_history, radarr_movies, radarr_history) = tokio::join!(
        proxy.plex_sessions(),
        proxy.plex_recently_added(),
        proxy.sonarr_series(),
        proxy.sonarr_history(),
        proxy.radarr_movies(),
        proxy.radarr_history(),
    );

    let plex_base = &proxy.config.plex_url;
    let plex_token = &proxy.config.plex_token;

    // ── Plex: now playing ──
    let now_playing = match &plex_sessions {
        Ok(data) => {
            let sessions = &data["MediaContainer"]["Metadata"];
            if let Some(arr) = sessions.as_array() {
                arr.iter().map(|s| {
                    let thumb = plex_thumb_url(plex_base, plex_token, s);
                    let display_title = plex_display_title(s);
                    json!({
                        "title": display_title,
                        "parentTitle": s["parentTitle"],
                        "grandparentTitle": s["grandparentTitle"],
                        "type": s["type"],
                        "user": s["User"]["title"],
                        "player": s["Player"]["title"],
                        "state": s["Player"]["state"],
                        "thumb": thumb,
                        "progress": calculate_progress(
                            s["viewOffset"].as_u64().unwrap_or(0),
                            s["duration"].as_u64().unwrap_or(1),
                        ),
                    })
                }).collect::<Vec<_>>()
            } else {
                vec![]
            }
        }
        Err(e) => {
            warn!("Plex sessions failed: {}", e);
            vec![]
        }
    };

    // ── Plex: recently added ──
    let recently_added = match &plex_recent {
        Ok(data) => {
            let metadata = &data["MediaContainer"]["Metadata"];
            if let Some(arr) = metadata.as_array() {
                arr.iter().take(10).map(|m| {
                    let thumb = plex_thumb_url(plex_base, plex_token, m);
                    // For seasons: parentTitle = series name, title = "Season X"
                    // For episodes: grandparentTitle = series, parentTitle = season
                    let display_title = plex_display_title(m);
                    json!({
                        "title": display_title,
                        "type": m["type"],
                        "year": m["year"],
                        "addedAt": m["addedAt"],
                        "thumb": thumb,
                    })
                }).collect::<Vec<_>>()
            } else {
                vec![]
            }
        }
        Err(e) => {
            warn!("Plex recently added failed: {}", e);
            vec![]
        }
    };

    // ── Sonarr: series count + recent history ──
    let sonarr_count = match &sonarr_series {
        Ok(Value::Array(arr)) => arr.len(),
        _ => 0,
    };

    let sonarr_recent = match &sonarr_history {
        Ok(data) => {
            if let Some(records) = data["records"].as_array() {
                records.iter().take(10).map(|r| json!({
                    "seriesTitle": r["series"]["title"],
                    "episodeTitle": r["episode"]["title"],
                    "season": r["episode"]["seasonNumber"],
                    "episode": r["episode"]["episodeNumber"],
                    "quality": r["quality"]["quality"]["name"],
                    "date": r["date"],
                    "eventType": r["eventType"],
                })).collect::<Vec<_>>()
            } else {
                vec![]
            }
        }
        Err(e) => {
            warn!("Sonarr history failed: {}", e);
            vec![]
        }
    };

    // ── Radarr: movie count + recent history ──
    let radarr_count = match &radarr_movies {
        Ok(Value::Array(arr)) => arr.len(),
        _ => 0,
    };

    let radarr_recent = match &radarr_history {
        Ok(data) => {
            if let Some(records) = data["records"].as_array() {
                records.iter().take(10).map(|r| json!({
                    "movieTitle": r["movie"]["title"],
                    "quality": r["quality"]["quality"]["name"],
                    "date": r["date"],
                    "eventType": r["eventType"],
                })).collect::<Vec<_>>()
            } else {
                vec![]
            }
        }
        Err(e) => {
            warn!("Radarr history failed: {}", e);
            vec![]
        }
    };

    // Build service links map (only include non-empty URLs).
    let config = &state.config;
    let mut links = serde_json::Map::new();
    if !config.plex_external_url.is_empty() {
        links.insert("plex".into(), json!(config.plex_external_url));
    }
    if !config.sonarr_external_url.is_empty() {
        links.insert("sonarr".into(), json!(config.sonarr_external_url));
    }
    if !config.radarr_external_url.is_empty() {
        links.insert("radarr".into(), json!(config.radarr_external_url));
    }
    if !config.qbittorrent_external_url.is_empty() {
        links.insert("qbittorrent".into(), json!(config.qbittorrent_external_url));
    }

    Json(json!({
        "plex": {
            "now_playing": now_playing,
            "recently_added": recently_added,
        },
        "sonarr": {
            "series_count": sonarr_count,
            "recent": sonarr_recent,
        },
        "radarr": {
            "movie_count": radarr_count,
            "recent": radarr_recent,
        },
        "service_links": links,
    }))
}

fn calculate_progress(offset: u64, duration: u64) -> u64 {
    if duration == 0 { return 0; }
    (offset * 100) / duration
}

/// Build a proxied Plex thumbnail URL.
/// Uses the best available thumb: grandparent > parent > item.
fn plex_thumb_url(base: &str, token: &str, item: &Value) -> Option<String> {
    let thumb = item["grandparentThumb"].as_str()
        .or_else(|| item["parentThumb"].as_str())
        .or_else(|| item["thumb"].as_str());
    thumb.map(|t| format!("{}/photo/:/transcode?width=120&height=180&minSize=1&url={}&X-Plex-Token={}", base, t, token))
}

/// Build a display title for Plex items.
/// Handles: movie → "Title", season → "Series — Season X", episode → "Series — S01E02 Title"
fn plex_display_title(item: &Value) -> String {
    let media_type = item["type"].as_str().unwrap_or("");
    let title = item["title"].as_str().unwrap_or("Unknown");

    match media_type {
        "season" => {
            // parentTitle = series name, title = "Season X"
            if let Some(series) = item["parentTitle"].as_str() {
                format!("{} — {}", series, title)
            } else {
                title.to_string()
            }
        }
        "episode" => {
            let series = item["grandparentTitle"].as_str().unwrap_or("");
            let season = item["parentIndex"].as_u64().unwrap_or(0);
            let ep = item["index"].as_u64().unwrap_or(0);
            if !series.is_empty() {
                format!("{} — S{:02}E{:02} {}", series, season, ep, title)
            } else {
                title.to_string()
            }
        }
        _ => title.to_string(), // movie, clip, etc.
    }
}
