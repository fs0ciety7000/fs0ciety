use surrealdb::engine::remote::ws::Client;
use surrealdb::Surreal;
use tracing::info;

const MIGRATION_V001: &str = include_str!("../../../database/migrations/001_init.surql");
const MIGRATION_V002: &str = include_str!("../../../database/migrations/002_user_profile.surql");

/// Apply all pending migrations in order.
pub async fn run(db: &Surreal<Client>) -> Result<(), surrealdb::Error> {
    info!("Running database migrations...");

    // Execute the initial schema migration.
    db.query(MIGRATION_V001).await?;
    db.query(MIGRATION_V002).await?;

    info!("Migrations complete.");
    Ok(())
}
