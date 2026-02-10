pub mod migrations;
pub mod seed;

use crate::config::Config;
use surrealdb::engine::remote::ws::{Client, Ws};
use surrealdb::opt::auth::Root;
use surrealdb::Surreal;
use tracing::info;

pub type Db = Surreal<Client>;

/// Connect to SurrealDB and run migrations.
pub async fn init(config: &Config) -> Result<Db, surrealdb::Error> {
    info!("Connecting to SurrealDB at {}", config.surreal_url);

    // Strip the ws:// prefix for the Ws connector.
    let addr = config
        .surreal_url
        .trim_start_matches("ws://")
        .trim_start_matches("wss://");

    let db = Surreal::new::<Ws>(addr).await?;

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
