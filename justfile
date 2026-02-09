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
# Runs surreal CLI inside the dev Docker container (no local install needed).

db_compose := "docker compose -f docker-compose.dev.yml"

# Apply SurrealDB migrations.
migrate:
    {{db_compose}} exec -T surrealdb surreal sql \
        --conn http://localhost:8000 \
        --user root --pass changeme \
        --ns fs0ciety --db main \
        < database/migrations/001_init.surql
    @echo "Migrations applied."

# Seed the database with admin user + sample posts.
seed: migrate
    {{db_compose}} exec -T surrealdb surreal sql \
        --conn http://localhost:8000 \
        --user root --pass changeme \
        --ns fs0ciety --db main \
        < database/seeds/001_admin_and_posts.surql
    @echo "Seed data applied (admin user + sample posts)."

# Open SurrealDB SQL shell.
db-shell:
    {{db_compose}} exec surrealdb surreal sql \
        --conn http://localhost:8000 \
        --user root --pass changeme \
        --ns fs0ciety --db main

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
