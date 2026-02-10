use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use surrealdb::engine::remote::ws::Client;
use surrealdb::Surreal;
use tracing::info;

/// Ensure at least one admin user exists. If the users table is empty,
/// create a default admin with password "admin".
pub async fn ensure_admin(db: &Surreal<Client>) -> Result<(), surrealdb::Error> {
    let result: Vec<serde_json::Value> = db.query("SELECT count() FROM users GROUP ALL")
        .await?
        .take(0)?;

    let count = result
        .first()
        .and_then(|v| v["count"].as_u64())
        .unwrap_or(0);

    if count == 0 {
        info!("No users found — seeding default admin user");

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(b"admin", &salt)
            .expect("Failed to hash password")
            .to_string();

        db.query(
            "CREATE users:admin SET \
                username = 'admin', \
                password_hash = $hash, \
                role = 'admin', \
                email = 'admin@fs0ciety.local', \
                bio = NONE, \
                avatar_url = NONE, \
                profile_public = true, \
                created_at = time::now(), \
                updated_at = time::now(), \
                last_login = NONE"
        )
        .bind(("hash", hash))
        .await?;

        info!("Default admin user created (username: admin, password: admin)");
    }

    Ok(())
}
