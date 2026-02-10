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

    // ── Plex: now playing ──
    let now_playing = match &plex_sessions {
        Ok(data) => {
            let sessions = &data["MediaContainer"]["Metadata"];
            if let Some(arr) = sessions.as_array() {
                arr.iter().map(|s| json!({
                    "title": s["title"],
                    "grandparentTitle": s["grandparentTitle"],
                    "type": s["type"],
                    "user": s["User"]["title"],
                    "player": s["Player"]["title"],
                    "state": s["Player"]["state"],
                    "progress": calculate_progress(
                        s["viewOffset"].as_u64().unwrap_or(0),
                        s["duration"].as_u64().unwrap_or(1),
                    ),
                })).collect::<Vec<_>>()
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
                arr.iter().take(10).map(|m| json!({
                    "title": m["title"],
                    "grandparentTitle": m["grandparentTitle"],
                    "type": m["type"],
                    "year": m["year"],
                    "addedAt": m["addedAt"],
                })).collect::<Vec<_>>()
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
    }))
}

fn calculate_progress(offset: u64, duration: u64) -> u64 {
    if duration == 0 { return 0; }
    (offset * 100) / duration
}
