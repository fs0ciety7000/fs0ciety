pub mod migrations;
pub mod seed;

use crate::config::Config;
use surrealdb::engine::remote::ws::{Client, Ws};
use surrealdb::opt::auth::Root;
use surrealdb::Surreal;
use tracing::{info, warn};

pub type Db = Surreal<Client>;

/// Connect to SurrealDB with retry logic (waits for the DB to be ready).
pub async fn init(config: &Config) -> Result<Db, surrealdb::Error> {
    info!("Connecting to SurrealDB at {}", config.surreal_url);

    // Strip the ws:// prefix for the Ws connector.
    let addr = config
        .surreal_url
        .trim_start_matches("ws://")
        .trim_start_matches("wss://");

    // Retry connection up to 10 times with exponential backoff.
    // SurrealDB may not be ready when started alongside the backend.
    let mut attempt = 0u32;
    let db = loop {
        attempt += 1;
        match Surreal::new::<Ws>(addr).await {
            Ok(db) => break db,
            Err(e) => {
                if attempt >= 10 {
                    return Err(e);
                }
                let delay = std::cmp::min(2u64.pow(attempt), 30);
                warn!(
                    "SurrealDB connection attempt {}/10 failed: {} — retrying in {}s",
                    attempt, e, delay
                );
                tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
            }
        }
    };

    db.signin(Root {
        username: &config.surreal_user,
        password: &config.surreal_pass,
    })
    .await?;

    db.use_ns(&config.surreal_ns)
        .use_db(&config.surreal_db)
        .await?;

    info!(
        "Connected to SurrealDB ns={} db={}",
        config.surreal_ns, config.surreal_db
    );

    // Run schema migrations.
    migrations::run(&db).await?;

    Ok(db)
}
