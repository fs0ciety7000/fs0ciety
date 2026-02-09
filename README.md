# fs0ciety

> *"Control is an illusion."*

A hyper-modern, terminal-themed personal blog and seedbox dashboard. Deep blacks, neon greens, CRT effects — something Elliot Alderson would use.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, Framer Motion |
| Backend | Rust + Axum (WebSocket, OpenAPI/Swagger) |
| Database | SurrealDB 2.x |
| Content | MDX (Markdown + React components) |
| Deploy | Docker Compose, Traefik (TLS), Hetzner VPS |

## Quick Start

```bash
# Install just (command runner)
cargo install just

# Install dependencies
just install

# Start SurrealDB (dev, in-memory)
just dev-db

# Start backend (separate terminal)
just dev-backend

# Start frontend (separate terminal)
just dev-frontend
```

## Project Structure

```
fs0ciety/
├── frontend/          Next.js 15 + React 19 + Tailwind 4
├── backend/           Rust + Axum API server
├── database/          SurrealDB schema & migrations
├── docker-compose.yml Production stack (Traefik + TLS)
└── justfile           Task runner (just dev, just deploy)
```

## Commands (justfile)

| Command | Description |
|---------|-------------|
| `just dev` | Start all dev services |
| `just build` | Build frontend + backend |
| `just deploy` | Docker build + start production |
| `just migrate` | Apply SurrealDB migrations |
| `just check` | Lint + type-check everything |
| `just fmt` | Format all code |

## Terminal Commands

The blog is navigable via a terminal interface:

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `ls` | List blog posts |
| `cat <slug>` | Read a post |
| `status` | System health check |
| `dashboard` | Open seedbox command center |
| `ssh` | Admin login |
| `neofetch` | System info |
| `clear` | Clear terminal |

## API Docs

Swagger UI available at `/swagger-ui/` when the backend is running.

## Deployment

Copy `.env.example` to `.env`, configure your domain and API keys, then:

```bash
just deploy
```

This starts the full stack: Traefik (TLS via Let's Encrypt), Next.js, Axum, SurrealDB.

## License

MIT
