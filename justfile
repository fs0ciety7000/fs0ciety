# ╔══════════════════════════════════════════════════════════════╗
# ║  fs0ciety — Command Runner (justfile)                      ║
# ║  Install: cargo install just                                ║
# ║  Usage:  just <recipe>                                     ║
# ╚══════════════════════════════════════════════════════════════╝

set dotenv-load

# ── Development ─────────────────────────────────────────────

# Start all dev services (SurrealDB + backend + frontend).
dev: dev-db dev-backend dev-frontend

# Start SurrealDB in dev mode (in-memory).
dev-db:
    docker compose -f docker-compose.dev.yml up -d
    @echo "SurrealDB running at ws://localhost:8000"

# Start the Rust backend in watch mode.
dev-backend:
    cd backend && cargo watch -x run

# Start the Next.js dev server with Turbopack.
dev-frontend:
    cd frontend && npm run dev

# Install all dependencies.
install:
    cd frontend && npm install
    cd backend && cargo fetch

# ── Database ────────────────────────────────────────────────
# Uses the SurrealDB HTTP endpoint (port 8000) — works with both podman & docker.

db_compose := "docker compose -f docker-compose.dev.yml"
db_url     := "http://localhost:8000"

# Apply SurrealDB migrations.
migrate:
    curl -s -u root:changeme \
        -H "surreal-ns: fs0ciety" \
        -H "surreal-db: main" \
        -H "Accept: application/json" \
        --data-binary @database/migrations/001_init.surql \
        {{db_url}}/sql
    @echo "\nMigrations applied."

# Seed the database with admin user + sample posts.
seed: migrate
    curl -s -u root:changeme \
        -H "surreal-ns: fs0ciety" \
        -H "surreal-db: main" \
        -H "Accept: application/json" \
        --data-binary @database/seeds/001_admin_and_posts.surql \
        {{db_url}}/sql
    @echo "\nSeed data applied (admin user + sample posts)."

# Open SurrealDB SQL shell (requires surreal CLI or use db-query).
db-shell:
    @echo "Interactive shell — paste SurrealQL, press Ctrl+D to execute:"
    @curl -s -u root:changeme \
        -H "surreal-ns: fs0ciety" \
        -H "surreal-db: main" \
        -H "Accept: application/json" \
        --data-binary @- \
        {{db_url}}/sql

# Run a single SurrealQL query: just db-query "SELECT * FROM users"
db-query q:
    @curl -s -u root:changeme \
        -H "surreal-ns: fs0ciety" \
        -H "surreal-db: main" \
        -H "Accept: application/json" \
        -d '{{q}}' \
        {{db_url}}/sql | python3 -m json.tool 2>/dev/null || cat

# ── Build ───────────────────────────────────────────────────

# Build the Rust backend (release).
build-backend:
    cd backend && cargo build --release

# Build the Next.js frontend (production).
build-frontend:
    cd frontend && npm run build

# Build everything.
build: build-backend build-frontend

# ── Docker ──────────────────────────────────────────────────

# Build and start production stack.
deploy:
    docker compose build
    docker compose up -d
    @echo "fs0ciety deployed. Access at https://${DOMAIN:-localhost}"

# Stop production stack.
down:
    docker compose down

# View logs.
logs service="":
    docker compose logs -f {{service}}

# Rebuild a specific service.
rebuild service:
    docker compose build {{service}}
    docker compose up -d {{service}}

# ── Quality ─────────────────────────────────────────────────

# Run Rust linter.
lint-backend:
    cd backend && cargo clippy -- -D warnings

# Run frontend linter.
lint-frontend:
    cd frontend && npm run lint

# Type-check frontend.
typecheck:
    cd frontend && npm run type-check

# Run all checks.
check: lint-backend lint-frontend typecheck

# ── Utilities ───────────────────────────────────────────────

# Format all code.
fmt:
    cd backend && cargo fmt
    cd frontend && npx prettier --write "src/**/*.{ts,tsx}"

# Clean build artifacts.
clean:
    cd backend && cargo clean
    cd frontend && rm -rf .next node_modules

# Show project status.
status:
    @echo "╔══════════════════════════════════════╗"
    @echo "║       fs0ciety System Status         ║"
    @echo "╠══════════════════════════════════════╣"
    @echo "║  Frontend: Next.js 15 + React 19    ║"
    @echo "║  Backend:  Rust + Axum              ║"
    @echo "║  Database: SurrealDB 2.x            ║"
    @echo "║  Docker:   Traefik + TLS            ║"
    @echo "╚══════════════════════════════════════╝"
    @docker compose ps 2>/dev/null || echo "Docker not running."
