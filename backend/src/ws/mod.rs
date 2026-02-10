use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
};
use futures::StreamExt;
use serde_json::json;
use std::time::{Duration, Instant};
use tokio::time::interval;
use tracing::{info, warn, debug};

use crate::AppState;

/// WebSocket upgrade handler — streams real-time seedbox stats.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Check a service's health.
async fn check_health(client: &reqwest::Client, url: &str, headers: Vec<(&str, &str)>) -> (bool, Option<u64>) {
    let start = Instant::now();
    let mut req = client.get(url);
    for (key, val) in headers {
        req = req.header(key, val);
    }
    match req.send().await {
        Ok(resp) if resp.status().is_success() || resp.status().is_redirection() => {
            let latency = start.elapsed().as_millis() as u64;
            debug!("WS health OK: {} ({}ms)", url, latency);
            (true, Some(latency))
        }
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            let code = resp.status().as_u16();
            // 401/403 still means the service is reachable.
            if code == 401 || code == 403 {
                debug!("WS health OK (auth needed): {} → {} ({}ms)", url, code, latency);
                (true, Some(latency))
            } else {
                warn!("WS health FAILED: {} → HTTP {} ({}ms)", url, code, latency);
                (false, Some(latency))
            }
        }
        Err(e) => {
            warn!("WS health ERROR: {} → {}", url, e);
            (false, None)
        }
    }
}

/// Check qBittorrent health with session cookie.
async fn check_qbit_health(proxy: &crate::proxy::ProxyClient) -> (bool, Option<u64>) {
    let start = Instant::now();
    let url = format!("{}/api/v2/app/version", proxy.config.qbittorrent_url);

    let cookie = proxy.qbit_sid().await;
    let mut req = proxy.http.get(&url);
    if let Some(sid) = &cookie {
        req = req.header("Cookie", sid);
    }

    match req.send().await {
        Ok(resp) if resp.status().is_success() => {
            let latency = start.elapsed().as_millis() as u64;
            debug!("WS qBit health OK: {} ({}ms)", url, latency);
            (true, Some(latency))
        }
        Ok(resp) if resp.status().as_u16() == 403 => {
            let latency = start.elapsed().as_millis() as u64;
            debug!("WS qBit health OK (auth needed): {} ({}ms)", url, latency);
            (true, Some(latency))
        }
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            warn!("WS qBit health FAILED: {} → HTTP {} ({}ms)", url, resp.status().as_u16(), latency);
            (false, Some(latency))
        }
        Err(e) => {
            warn!("WS qBit health ERROR: {} → {}", url, e);
            (false, None)
        }
    }
}

async fn handle_socket(mut socket: WebSocket, state: AppState) {
    info!("WebSocket client connected");

    let mut tick = interval(Duration::from_secs(3));
    let mut cycle: u64 = 0;

    loop {
        tokio::select! {
            _ = tick.tick() => {
                cycle += 1;
                let proxy = &state.proxy;
                let config = &proxy.config;
                let http = &proxy.http;

                // Fetch real data from qBittorrent.
                let qbit_info = proxy.qbit_transfer_info().await;
                let qbit_torrents = proxy.qbit_torrents().await;

                let (dl_speed, ul_speed) = match &qbit_info {
                    Ok(info) => (
                        info["dl_info_speed"].as_u64().unwrap_or(0),
                        info["up_info_speed"].as_u64().unwrap_or(0),
                    ),
                    Err(e) => {
                        if cycle <= 1 { warn!("WS: qBit transfer info failed: {}", e); }
                        (0, 0)
                    }
                };

                let (active, seeding) = match &qbit_torrents {
                    Ok(serde_json::Value::Array(torrents)) => {
                        let a = torrents.iter()
                            .filter(|t| t["state"].as_str().map(|s| s.contains("DL") || s == "downloading").unwrap_or(false))
                            .count() as u32;
                        let s = torrents.iter()
                            .filter(|t| t["state"].as_str().map(|s| s.contains("UP") || s == "uploading" || s == "stalledUP").unwrap_or(false))
                            .count() as u32;
                        (a, s)
                    }
                    _ => (0, 0),
                };

                let (disk_used, disk_total) = match &qbit_info {
                    Ok(info) => {
                        let free = info["free_space_on_disk"].as_u64().unwrap_or(0);
                        let alloc = info["dl_info_data"].as_u64().unwrap_or(0);
                        if free > 0 { (alloc, alloc + free) } else { (0, 0) }
                    }
                    Err(_) => (0, 0),
                };

                // Check services health (every 5th tick to avoid overload).
                let services = if cycle % 5 == 1 {
                    let plex_url = format!("{}/identity", config.plex_url);
                    let sonarr_url = format!("{}/api/v3/system/status", config.sonarr_url);
                    let radarr_url = format!("{}/api/v3/system/status", config.radarr_url);
                    let (plex, sonarr, radarr, qbit) = tokio::join!(
                        check_health(http, &plex_url, vec![("X-Plex-Token", config.plex_token.as_str()), ("Accept", "application/json")]),
                        check_health(http, &sonarr_url, vec![("X-Api-Key", config.sonarr_api_key.as_str())]),
                        check_health(http, &radarr_url, vec![("X-Api-Key", config.radarr_api_key.as_str())]),
                        check_qbit_health(proxy),
                    );
                    Some(json!({
                        "plex": { "online": plex.0, "latency_ms": plex.1 },
                        "sonarr": { "online": sonarr.0, "latency_ms": sonarr.1 },
                        "radarr": { "online": radarr.0, "latency_ms": radarr.1 },
                        "qbittorrent": { "online": qbit.0, "latency_ms": qbit.1 },
                    }))
                } else {
                    None
                };

                let mut data = json!({
                    "type": "stats_update",
                    "data": {
                        "download_speed": dl_speed,
                        "upload_speed": ul_speed,
                        "disk_used": disk_used,
                        "disk_total": disk_total,
                        "active_torrents": active,
                        "seeding_torrents": seeding,
                    },
                    "tick": cycle,
                });

                if let Some(svc) = services {
                    data["data"]["services"] = svc;
                }

                if socket
                    .send(Message::Text(data.to_string().into()))
                    .await
                    .is_err()
                {
                    info!("WebSocket client disconnected (send failed)");
                    break;
                }
            }
            msg = socket.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        info!("WS received: {}", text);
                        let _ = socket
                            .send(Message::Text(
                                json!({ "type": "ack", "received": text.to_string() }).to_string().into()
                            ))
                            .await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        info!("WebSocket client disconnected");
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}
