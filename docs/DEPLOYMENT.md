# Deployment Guide

This guide covers deploying fs0ciety in development and production environments.

## Table of Contents

- [Development Setup](#development-setup)
- [Production with Docker Compose](#production-with-docker-compose)
- [Production with Traefik (TLS)](#production-with-traefik-tls)
- [Coolify Deployment](#coolify-deployment)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [Tor Hidden Service](#tor-hidden-service)
- [Seedbox Services](#seedbox-services)
- [Subdomain Routing](#subdomain-routing)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | 24+ | [docker.com](https://docs.docker.com/get-docker/) |
| Rust | 1.75+ | [rustup.rs](https://rustup.rs/) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| just | latest | `cargo install just` |
| cargo-watch | latest | `cargo install cargo-watch` |

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/fs0ciety7000/fs0ciety.git
cd fs0ciety

# 2. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Install dependencies
just install

# 4. Start SurrealDB (in-memory, dev mode)
just dev-db

# 5. Apply schema + seed admin user and sample posts
just seed

# 6. Start backend (terminal 1)
just dev-backend
# Backend runs at http://localhost:3001
# Swagger UI at http://localhost:3001/swagger-ui/

# 7. Start frontend (terminal 2)
just dev-frontend
# Frontend runs at http://localhost:3000
```

### Default Dev Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin` |
| Role | `admin` |

> Change these immediately in production. The seed data is for development only.

---

## Production with Docker Compose

The simplest production deployment — no reverse proxy, direct port exposure.

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with production values:

```bash
# REQUIRED — change these
DOMAIN=yourdomain.com
JWT_SECRET=$(openssl rand -hex 32)
SURREAL_PASS=$(openssl rand -hex 16)
ADMIN_API_KEY=$(openssl rand -hex 32)

# OPTIONAL — seedbox services (leave blank to disable)
PLEX_URL=http://plex:32400
PLEX_TOKEN=your_plex_token
SONARR_URL=http://sonarr:8989
SONARR_API_KEY=your_sonarr_key
RADARR_URL=http://radarr:7878
RADARR_API_KEY=your_radarr_key
QBITTORRENT_URL=http://qbittorrent:8080
QBITTORRENT_USER=admin
QBITTORRENT_PASS=your_qbit_password
```

### 2. Build & start

```bash
docker compose up -d --build
```

### 3. Apply migrations

```bash
# Wait for SurrealDB to be ready, then:
just migrate

# Or manually:
curl -s -u root:YOUR_SURREAL_PASS \
    -H "surreal-ns: fs0ciety" \
    -H "surreal-db: main" \
    -H "Accept: application/json" \
    --data-binary @database/migrations/001_init.surql \
    http://localhost:8000/sql
```

### 4. Create admin user

The backend auto-seeds an admin user on first boot. To change the password, log in and use the profile settings page, or call the API:

```bash
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "admin", "new_password": "your-secure-password"}'
```

### Services & Ports

| Service | Internal Port | Description |
|---------|--------------|-------------|
| frontend | 3000 | Next.js application |
| backend | 3001 | Rust/Axum API |
| surrealdb | 8000 | SurrealDB database |
| tor | — | Tor hidden service (no exposed port) |

---

## Production with Traefik (TLS)

For automated Let's Encrypt TLS certificates, use the Traefik compose override.

### 1. Create `docker-compose.traefik.yml`

```yaml
services:
  traefik:
    image: traefik:v3.2
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    restart: unless-stopped

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`${DOMAIN}`) || Host(`blog.${DOMAIN}`) || Host(`dash.${DOMAIN}`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  surrealdb:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.surrealdb.rule=Host(`db.${DOMAIN}`)"
      - "traefik.http.routers.surrealdb.entrypoints=websecure"
      - "traefik.http.routers.surrealdb.tls.certresolver=letsencrypt"
      - "traefik.http.services.surrealdb.loadbalancer.server.port=8000"

volumes:
  letsencrypt_data:
```

### 2. Deploy with both compose files

```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

This gives you:
- `https://yourdomain.com` — Blog
- `https://blog.yourdomain.com` — Blog (subdomain)
- `https://dash.yourdomain.com` — Dashboard
- `https://db.yourdomain.com` — SurrealDB admin

### DNS Setup

Point these DNS records to your server IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `your.server.ip` |
| A | `blog` | `your.server.ip` |
| A | `dash` | `your.server.ip` |
| A | `db` | `your.server.ip` |

---

## Coolify Deployment

If you use [Coolify](https://coolify.io/) (self-hosted PaaS):

1. Connect your GitHub repo in Coolify
2. Set the compose file to `docker-compose.yml`
3. Add environment variables in the Coolify UI
4. Configure domains per service in Coolify:
   - **frontend**: `yourdomain.com`, `blog.yourdomain.com`, `dash.yourdomain.com`
   - **surrealdb**: `db.yourdomain.com`
5. Coolify handles Traefik and TLS automatically

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `fs0ciety.org` |
| `JWT_SECRET` | 64-char hex secret for JWT signing | `openssl rand -hex 32` |
| `SURREAL_PASS` | SurrealDB root password | `openssl rand -hex 16` |

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_HOST` | `0.0.0.0` | Bind address |
| `BACKEND_PORT` | `3001` | API port |
| `RUST_LOG` | `info,fs0ciety_backend=debug` | Log level |
| `SURREAL_URL` | `ws://surrealdb:8000` | SurrealDB connection (Docker) |
| `SURREAL_NS` | `fs0ciety` | SurrealDB namespace |
| `SURREAL_DB` | `main` | SurrealDB database name |
| `SURREAL_USER` | `root` | SurrealDB username |
| `ADMIN_API_KEY` | — | API key for admin endpoints & CI publishing |
| `PUBLIC_URL` | `https://fs0ciety.org` | Public URL (for emails, links) |
| `RESEND_API_KEY` | — | [Resend](https://resend.com/) key for password reset emails |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DOMAIN` | `fs0ciety.org` | Domain for subdomain routing |
| `INTERNAL_API_URL` | `http://backend:3001` | Backend URL (Docker network) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend URL (browser, dev only) |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3001/ws` | WebSocket URL (dev only) |

### Seedbox Services (all optional)

| Variable | Description |
|----------|-------------|
| `PLEX_URL` | Plex server URL (internal) |
| `PLEX_TOKEN` | Plex authentication token |
| `PLEX_EXTERNAL_URL` | Plex web UI URL (for dashboard links) |
| `SONARR_URL` | Sonarr API URL (internal) |
| `SONARR_API_KEY` | Sonarr API key |
| `SONARR_EXTERNAL_URL` | Sonarr web UI URL |
| `RADARR_URL` | Radarr API URL (internal) |
| `RADARR_API_KEY` | Radarr API key |
| `RADARR_EXTERNAL_URL` | Radarr web UI URL |
| `QBITTORRENT_URL` | qBittorrent API URL (internal) |
| `QBITTORRENT_USER` | qBittorrent username |
| `QBITTORRENT_PASS` | qBittorrent password |
| `QBITTORRENT_EXTERNAL_URL` | qBittorrent web UI URL |

### Deployment

| Variable | Description |
|----------|-------------|
| `ACME_EMAIL` | Email for Let's Encrypt (Traefik TLS) |

---

## Database Management

### Applying Migrations

Migrations are idempotent SurrealQL files in `database/migrations/`:

```bash
# Via justfile (uses localhost)
just migrate

# Via Docker exec
docker compose exec surrealdb /surreal sql \
  --conn http://localhost:8000 \
  --user root --pass YOUR_PASS \
  --ns fs0ciety --db main \
  < database/migrations/001_init.surql
```

### Running Queries

```bash
# Via justfile
just db-query "SELECT * FROM users"
just db-query "SELECT count() FROM posts GROUP ALL"

# Interactive shell
just db-shell
```

### Backups

SurrealDB uses RocksDB for persistence. The data lives in the `surrealdb_data` Docker volume.

```bash
# Export database
docker compose exec surrealdb /surreal export \
  --conn http://localhost:8000 \
  --user root --pass YOUR_PASS \
  --ns fs0ciety --db main \
  > backup.surql

# Import database
docker compose exec surrealdb /surreal import \
  --conn http://localhost:8000 \
  --user root --pass YOUR_PASS \
  --ns fs0ciety --db main \
  < backup.surql
```

---

## Tor Hidden Service

The Tor container automatically generates a `.onion` address on first boot.

### Finding your .onion address

```bash
docker compose exec tor cat /var/lib/tor/hidden_service/hostname
```

### How it works

- The `tor` service runs a Tor daemon configured to forward port 80 to the frontend container on port 3000
- The `.onion` private key is stored in the `tor_data` Docker volume
- **Do not delete the `tor_data` volume** or you will lose your `.onion` address permanently

### Disabling Tor

To disable the Tor service, remove or comment out the `tor` section in `docker-compose.yml`.

---

## Seedbox Services

The dashboard proxies external services through the Rust backend. API keys stay server-side.

### Connecting Services

1. Set the service URLs and API keys in `.env`
2. The backend proxies requests to each service
3. The dashboard auto-detects which services are configured and shows their status

### Without Seedbox Services

The blog works fully without any seedbox services configured. The dashboard will show all services as "offline" but the blog, terminal, and admin panel function independently.

### Service Network

If your seedbox services run on the same Docker network, use container names:

```bash
PLEX_URL=http://plex:32400
SONARR_URL=http://sonarr:8989
```

If they run on a different host, use the actual IP/hostname:

```bash
PLEX_URL=http://192.168.1.100:32400
SONARR_URL=http://seedbox.local:8989
```

---

## Subdomain Routing

The Next.js middleware handles subdomain-to-path rewriting:

| Subdomain | Rewrites to |
|-----------|-------------|
| `blog.yourdomain.com` | `/blog` |
| `dash.yourdomain.com` | `/dashboard` |
| `yourdomain.com` | `/` (no rewrite) |

This works with any reverse proxy (Traefik, Nginx, Caddy, Coolify). The only requirement is that all subdomains point to the frontend container.

### Without Subdomains

If you don't want subdomains, everything works on paths too:
- `yourdomain.com/blog` — Blog
- `yourdomain.com/dashboard` — Dashboard
- `yourdomain.com/admin` — Admin panel

---

## CI/CD

### Auto-publish Blog Posts

The GitHub Actions workflow (`.github/workflows/publish-posts.yml`) automatically publishes MDX files when pushed to `main`.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `FS0CIETY_API_KEY` | The `ADMIN_API_KEY` value from your `.env` |

The workflow:
1. Detects changed `.mdx` files in `content/posts/`
2. Waits for the deployment to finish (120s)
3. Publishes each changed file via the API

### Manual Publishing

```bash
export FS0CIETY_API_KEY="your-admin-api-key"
export FS0CIETY_URL="https://yourdomain.com"

# Publish a single post
./scripts/publish.sh content/posts/my-post.mdx

# Publish all posts
./scripts/publish.sh content/posts/*.mdx

# List existing posts
./scripts/publish.sh --list

# Delete a post
./scripts/publish.sh --delete post-slug
```

---

## Troubleshooting

### Backend can't connect to SurrealDB

```
Error: Connection refused (ws://surrealdb:8000)
```

- Ensure SurrealDB is running: `docker compose ps`
- Check SurrealDB logs: `docker compose logs surrealdb`
- Verify `SURREAL_URL` matches the service name in your compose file

### Frontend shows blank page

- Check the frontend logs: `docker compose logs frontend`
- Ensure `INTERNAL_API_URL` is set to `http://backend:3001` (Docker network name)
- Verify the backend is healthy: `curl http://localhost:3001/api/health`

### Tor .onion address not working

- Check Tor logs: `docker compose logs tor`
- Verify the hostname exists: `docker compose exec tor cat /var/lib/tor/hidden_service/hostname`
- Ensure the frontend container is reachable from the Tor container on port 3000

### Dashboard shows all services offline

- The dashboard requires seedbox service URLs and API keys in `.env`
- Verify the backend can reach the services: check `docker compose logs backend` for proxy errors
- The services must be network-accessible from the backend container

### Permission denied on uploads

- The `uploads_data` volume must be writable by the backend process
- Check: `docker compose exec backend ls -la /data/uploads`
