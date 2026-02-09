use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use serde_json::json;
use std::time::Duration;
use tokio::time::interval;
use tracing::info;

/// WebSocket upgrade handler — streams real-time seedbox stats.
pub async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    info!("WebSocket client connected");

    let mut tick = interval(Duration::from_secs(2));
    let mut cycle: u64 = 0;

    loop {
        tokio::select! {
            _ = tick.tick() => {
                cycle += 1;
                // Mock real-time stats with slight variation per tick.
                let stats = json!({
                    "type": "stats_update",
                    "data": {
                        "download_speed": 12_845_000 + (cycle % 10) * 100_000,
                        "upload_speed": 4_230_000 + (cycle % 7) * 50_000,
                        "disk_used": 1_842_000_000_000_u64,
                        "disk_total": 4_000_000_000_000_u64,
                        "active_torrents": 7 + (cycle % 3) as u32,
                        "seeding_torrents": 142,
                    },
                    "tick": cycle,
                });

                if socket
                    .send(Message::Text(stats.to_string().into()))
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
                        // Echo back as acknowledgment.
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
