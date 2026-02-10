use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use std::time::Instant;
use tracing::{warn, debug};

use crate::AppState;

/// Check a service's health by sending a request and measuring latency.
async fn check_service(client: &reqwest::Client, url: &str, headers: Vec<(&str, &str)>) -> (bool, Option<u64>) {
    let start = Instant::now();
    let mut req = client.get(url);
    for (key, val) in headers {
        req = req.header(key, val);
    }
    match req.send().await {
        Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
            let latency = start.elapsed().as_millis() as u64;
            debug!("Health check OK: {} ({}ms)", url, latency);
            (true, Some(latency))
        }
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            let code = resp.status().as_u16();
            // 401/403 still means the service is reachable.
            if code == 401 || code == 403 {
                debug!("Health check OK (auth needed): {} → {} ({}ms)", url, code, latency);
                (true, Some(latency))
            } else {
                warn!("Health check FAILED: {} → HTTP {} ({}ms)", url, code, latency);
                (false, Some(latency))
            }
        }
        Err(e) => {
            warn!("Health check ERROR: {} → {}", url, e);
            (false, None)
        }
    }
}

/// Check qBittorrent health using session cookie.
async fn check_qbit(proxy: &crate::proxy::ProxyClient) -> (bool, Option<u64>) {
    let start = Instant::now();
    let url = format!("{}/api/v2/app/version", proxy.config.qbittorrent_url);

    let cookie = proxy.qbit_sid().await;
    let mut req = proxy.http.get(&url);
    if let Some(sid) = &cookie {
        req = req.header("Cookie", sid);
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            (true, Some(start.elapsed().as_millis() as u64))
        }
        // 403 means service is up but needs auth - still "online"
        Ok(resp) if resp.status().as_u16() == 403 => {
            (true, Some(start.elapsed().as_millis() as u64))
        }
        Ok(_) => (false, Some(start.elapsed().as_millis() as u64)),
        Err(_) => (false, None),
    }
}

/// GET /api/seedbox/stats — aggregated seedbox statistics from real services.
#[utoipa::path(
    get,
    path = "/api/seedbox/stats",
    responses(
        (status = 200, description = "Current seedbox stats", body = Value)
    ),
    tag = "seedbox"
)]
pub async fn get_stats(State(state): State<AppState>) -> Json<Value> {
    let proxy = &state.proxy;
    let config = &proxy.config;
    let http = &proxy.http;

    // Fetch qBittorrent transfer info for speeds.
    let qbit_info = proxy.qbit_transfer_info().await;
    let qbit_torrents = proxy.qbit_torrents().await;

    let (dl_speed, ul_speed) = match &qbit_info {
        Ok(info) => (
            info["dl_info_speed"].as_u64().unwrap_or(0),
            info["up_info_speed"].as_u64().unwrap_or(0),
        ),
        Err(e) => {
            warn!("qBittorrent transfer info failed: {}", e);
            (0, 0)
        }
    };

    let (active, seeding) = match &qbit_torrents {
        Ok(Value::Array(torrents)) => {
            let active_count = torrents.iter()
                .filter(|t| t["state"].as_str().map(|s| s.contains("DL") || s == "downloading").unwrap_or(false))
                .count() as u32;
            let seeding_count = torrents.iter()
                .filter(|t| t["state"].as_str().map(|s| s.contains("UP") || s == "uploading" || s == "stalledUP").unwrap_or(false))
                .count() as u32;
            (active_count, seeding_count)
        }
        Err(e) => {
            warn!("qBittorrent torrents failed: {}", e);
            (0, 0)
        }
        _ => (0, 0),
    };

    // Disk info from qBittorrent transfer info.
    let (disk_used, disk_total) = match &qbit_info {
        Ok(info) => {
            let free = info["free_space_on_disk"].as_u64().unwrap_or(0);
            let alloc = info["dl_info_data"].as_u64().unwrap_or(0);
            if free > 0 {
                (alloc, alloc + free)
            } else {
                (0, 0)
            }
        }
        Err(_) => (0, 0),
    };

    // Check service health in parallel.
    let plex_url = format!("{}/identity", config.plex_url);
    let sonarr_url = format!("{}/api/v3/system/status", config.sonarr_url);
    let radarr_url = format!("{}/api/v3/system/status", config.radarr_url);
    let (plex_health, sonarr_health, radarr_health, qbit_health) = tokio::join!(
        check_service(http, &plex_url, vec![("X-Plex-Token", config.plex_token.as_str()), ("Accept", "application/json")]),
        check_service(http, &sonarr_url, vec![("X-Api-Key", config.sonarr_api_key.as_str())]),
        check_service(http, &radarr_url, vec![("X-Api-Key", config.radarr_api_key.as_str())]),
        check_qbit(proxy),
    );

    Json(json!({
        "download_speed_bps": dl_speed,
        "upload_speed_bps": ul_speed,
        "disk_used_bytes": disk_used,
        "disk_total_bytes": disk_total,
        "active_torrents": active,
        "seeding_torrents": seeding,
        "services": {
            "plex": { "online": plex_health.0, "latency_ms": plex_health.1 },
            "sonarr": { "online": sonarr_health.0, "latency_ms": sonarr_health.1 },
            "radarr": { "online": radarr_health.0, "latency_ms": radarr_health.1 },
            "qbittorrent": { "online": qbit_health.0, "latency_ms": qbit_health.1 }
        }
    }))
}
