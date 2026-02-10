<![CDATA[<div align="center">

```
  ██████  ██████   ██████   ██████ ██ ███████ ████████ ██    ██
  ██      ██      ██  ████ ██      ██ ██         ██     ██  ██
  █████   ███████ ██ ██ ██ ██      ██ █████      ██      ████
  ██           ██ ████  ██ ██      ██ ██         ██       ██
  ██      ██████   ██████   ██████ ██ ███████    ██       ██
```

**Terminal-themed blog & seedbox dashboard**

*Deep blacks, neon greens, CRT effects — something Elliot Alderson would use.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## What is this?

A self-hosted, terminal-aesthetic personal blog with a built-in seedbox command center. The blog is navigable via a real terminal interface. The dashboard proxies Plex, Sonarr, Radarr, and qBittorrent through a single Rust API with real-time WebSocket stats.

### Features

- **Terminal UI** — interactive shell with `ls`, `cat <slug>`, `grep`, `status`, `neofetch`, and more
- **Blog engine** — MDX content, tag filtering, full-text search, cipher-text post titles
- **Seedbox dashboard** — real-time download/upload speeds, disk usage, torrent counts, ASCII charts
- **Media aggregation** — Plex now playing, Sonarr/Radarr activity, service health monitoring
- **Honeypot** — trap routes (`/wp-admin`, `/.env`, `/.git/config`) that log probes with anonymized IPs
- **PGP & warrant canary** — public key page, signature verification, canary status
- **Tor hidden service** — `.onion` address auto-generated, served through the Tor container
- **Security hardened** — CSP, HSTS, X-Frame-Options, EXIF stripping on uploads, Argon2 passwords
- **CRT effects** — scanlines, noise overlay, glitch text, Matrix rain, boot sequence animation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS 4, Framer Motion |
| Backend | [Rust](https://www.rust-lang.org/) + [Axum](https://github.com/tokio-rs/axum) (WebSocket, OpenAPI/Swagger) |
| Database | [SurrealDB 2.x](https://surrealdb.com/) (RocksDB persistence) |
| Content | MDX (Markdown + React components) |
| Deploy | Docker Compose, optional Traefik (TLS), Tor hidden service |

## Quick Start (Development)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Rust](https://rustup.rs/) (1.75+)
- [Node.js](https://nodejs.org/) (22+)
- [just](https://github.com/casey/just) (task runner) — `cargo install just`

### 1. Clone & configure

```bash
git clone https://github.com/fs0ciety7000/fs0ciety.git
cd fs0ciety
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Start the database

```bash
just dev-db
# SurrealDB running at ws://localhost:8000 (in-memory, dev mode)
```

### 3. Apply migrations & seed data

```bash
just seed
# Creates schema + admin user (admin/admin) + sample posts
```

### 4. Start backend & frontend

In separate terminals:

```bash
# Terminal 1 — Rust backend (hot-reload with cargo-watch)
just dev-backend

# Terminal 2 — Next.js frontend (Turbopack)
just dev-frontend
```

The blog is at **http://localhost:3000** and the API at **http://localhost:3001/swagger-ui/**.

## Production Deployment (Docker Compose)

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full production setup instructions, including:

- Docker Compose with optional Traefik (automated TLS)
- Coolify / self-hosted PaaS deployment
- Environment variable reference
- Tor hidden service setup
- Seedbox service integration

**Quick version:**

```bash
cp .env.example .env
# Edit .env — set DOMAIN, JWT_SECRET, SURREAL_PASS, etc.

docker compose up -d --build
```

## Project Structure

```
fs0ciety/
├── frontend/                 Next.js 15 + React 19 + Tailwind 4
│   ├── src/
│   │   ├── app/              App Router pages
│   │   │   ├── page.tsx      Terminal home
│   │   │   ├── blog/         Blog listing, post reader, PGP page
│   │   │   ├── dashboard/    Seedbox command center
│   │   │   ├── admin/        Post/user management
│   │   │   └── login/        Auth
│   │   ├── components/       UI components (terminal, effects, blog, dashboard)
│   │   ├── hooks/            useWebSocket, useTerminal, etc.
│   │   ├── lib/              API client, commands, URL builder
│   │   └── middleware.ts     Subdomain routing + security headers
│   ├── Dockerfile            3-stage build (deps → build → runner)
│   └── package.json
│
├── backend/                  Rust + Axum API server
│   ├── src/
│   │   ├── main.rs           Entry point, router setup
│   │   ├── config.rs         Environment config
│   │   ├── routes/           API handlers (auth, posts, seedbox, honeypot, etc.)
│   │   ├── proxy/            HTTP clients for Plex/Sonarr/Radarr/qBittorrent
│   │   ├── db/               SurrealDB connection, migrations, seeding
│   │   ├── models/           Data structures
│   │   └── ws/               WebSocket handler
│   ├── Dockerfile            2-stage build (builder → distroless)
│   └── Cargo.toml
│
├── database/
│   ├── migrations/           SurrealQL schema files
│   └── seeds/                Dev seed data (admin user + sample posts)
│
├── content/
│   └── posts/                MDX blog posts (auto-published via CI)
│
├── scripts/
│   └── publish.sh            CLI: publish/list/delete MDX posts via API
│
├── tor/
│   └── torrc                 Tor hidden service config
│
├── docker-compose.yml        Production stack
├── docker-compose.dev.yml    Dev-only SurrealDB (in-memory)
├── justfile                  Task runner recipes
├── .env.example              Environment template
└── .github/workflows/        CI: auto-publish posts on push to main
```

## Terminal Commands

The blog homepage is a functional terminal. Type `help` to see:

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `ls` | List blog posts |
| `cat <slug>` | Read a post |
| `grep <query>` | Search posts |
| `whoami [-v]` | User / environment info |
| `status` | System health check |
| `dashboard` | Open seedbox command center |
| `neofetch` | System info |
| `gpg` | Show PGP public key |
| `fingerprint` | Show key fingerprint |
| `verify <slug>` | Verify post integrity (SHA-256) |
| `canary` | Show warrant canary |
| `ssh` | Admin login |
| `clear` | Clear terminal |

## API Endpoints

Swagger UI at `/swagger-ui/` when the backend is running.

| Route | Description |
|-------|-------------|
| `GET /api/posts` | List published posts |
| `GET /api/posts/:slug` | Get single post |
| `GET /api/tags` | List all tags |
| `POST /api/auth/login` | Authenticate |
| `GET /api/seedbox/stats` | Seedbox metrics |
| `GET /api/honeypot/intruders` | Honeypot probe log |
| `WS /ws` | Real-time WebSocket |

## Blog Posts (MDX)

Posts live in `content/posts/` as `.mdx` files with YAML frontmatter:

```mdx
---
title: My Post Title
slug: my-post-title
tags: [security, rust]
published: true
author: admin
---

Your markdown content here.
```

Publish via CLI or push to `main` (CI auto-publishes changed files):

```bash
export FS0CIETY_API_KEY="your-admin-key"
./scripts/publish.sh content/posts/my-post.mdx
./scripts/publish.sh --list
./scripts/publish.sh --delete my-post-slug
```

## Seedbox Integration

The dashboard proxies four services through the Rust backend — API keys never reach the browser:

| Service | Purpose |
|---------|---------|
| **qBittorrent** | Torrent management, download/upload speeds |
| **Sonarr** | TV show monitoring & automation |
| **Radarr** | Movie monitoring & automation |
| **Plex** | Media streaming, now playing, recently added |

Configure service URLs and API keys in `.env`. The dashboard gracefully shows "offline" for unconfigured services.

## justfile Commands

| Command | Description |
|---------|-------------|
| `just dev` | Start all dev services |
| `just dev-db` | Start SurrealDB (in-memory) |
| `just dev-backend` | Start Rust backend (watch mode) |
| `just dev-frontend` | Start Next.js (Turbopack) |
| `just install` | Install all dependencies |
| `just migrate` | Apply SurrealDB migrations |
| `just seed` | Migrate + seed admin user & sample posts |
| `just build` | Build frontend + backend |
| `just deploy` | Docker build + start production |
| `just down` | Stop production stack |
| `just check` | Lint + type-check everything |
| `just fmt` | Format all code |
| `just clean` | Remove build artifacts |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
]]>