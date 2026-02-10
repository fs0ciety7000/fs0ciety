# Architecture

System design overview for fs0ciety.

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              Reverse Proxy                   │
                    │     (Traefik / Coolify / Nginx / Caddy)      │
                    │         TLS termination + routing            │
                    └──────┬──────────────┬───────────────┬───────┘
                           │              │               │
                    ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
                    │  Frontend   │ │  SurrealDB  │ │    Tor      │
                    │  (Next.js)  │ │  (Database) │ │  (.onion)   │
                    │  :3000      │ │  :8000      │ │             │
                    └──────┬──────┘ └─────▲──────┘ └─────────────┘
                           │              │
                    ┌──────▼──────────────┤
                    │    Backend (Axum)    │
                    │    :3001             │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
        ┌─────▼────┐ ┌────▼─────┐ ┌────────▼────────┐
        │   Plex   │ │  Sonarr  │ │  qBittorrent    │
        │  :32400  │ │  :8989   │ │  :8080          │
        └──────────┘ │  Radarr  │ └─────────────────┘
                     │  :7878   │
                     └──────────┘
```

## Request Flow

### Blog Request (`GET /blog/my-post`)

```
Browser → Reverse Proxy → Next.js (:3000)
  → SSR renders page
  → next.config.ts rewrites /api/* to backend
  → Backend (:3001) queries SurrealDB
  → Returns JSON → Next.js renders HTML → Browser
```

### Subdomain Routing (`blog.domain.com/`)

```
Browser → Reverse Proxy → Next.js (:3000)
  → middleware.ts reads Host header
  → "blog.domain.com" → subdomain = "blog"
  → Rewrite URL: / → /blog
  → App Router serves /blog/page.tsx
```

### Dashboard WebSocket (`WS /ws`)

```
Browser → Next.js (:3000)
  → next.config.ts proxies /ws to backend
  → Backend (:3001) opens WebSocket
  → Polls seedbox services every 2s
  → Pushes stats (speeds, disk, torrents) to browser
  → Frontend renders ASCII charts in real-time
```

### Honeypot (`GET /wp-admin`)

```
Bot → Reverse Proxy → Next.js → next.config.ts
  → Rewrites to backend /api path
  → Backend honeypot route matches
  → Logs: IP (anonymized), path, user-agent, timestamp
  → Returns 403 (or decoy response)
  → Entry visible at /blog/intruders
```

## Frontend Architecture

### App Router (Next.js 15)

```
src/app/
├── page.tsx              Server Component → Terminal UI (client hydrated)
├── layout.tsx            Root layout (fonts, global CSS, metadata)
├── not-found.tsx         Custom 404 (glitch effect)
├── blog/
│   ├── page.tsx          Blog post listing with tag filters
│   ├── [slug]/page.tsx   Post reader with terminal markdown blocks
│   ├── pgp/page.tsx      PGP key + warrant canary
│   └── intruders/        Honeypot transparency dashboard
├── dashboard/page.tsx    Seedbox command center (admin only)
├── admin/                Admin panel (posts, users, audit log)
└── login/page.tsx        Authentication form
```

### Component Organization

```
components/
├── terminal/     Core terminal interface (input, output, rendering)
├── blog/         PostCard, BlogHeader, BlogFooter, SearchDialog, CipherText
├── dashboard/    ASCIIChart, ServiceStatus, StatsCard
├── admin/        AdminSidebar, MarkdownEditor, TagInput
├── effects/      MatrixRain, TypewriterText, GlitchText, CRTScreen, BootSequence
└── ui/           Generic reusable components
```

### Key Patterns

- **Subdomain middleware** — `middleware.ts` rewrites subdomains to paths before routing
- **API proxy** — `next.config.ts` rewrites `/api/*` to the backend, hiding the backend port
- **Terminal state** — `useTerminal` hook manages command history, output, and prompt
- **WebSocket** — `useWebSocket` hook with auto-reconnect for real-time dashboard stats
- **Cipher effect** — `useCipherReveal` hook scrambles text through random characters on mount

## Backend Architecture

### Module Structure

```
src/
├── main.rs           Entry point: config → DB → router → serve
├── config.rs         Typed config from environment (29 fields)
├── error.rs          Unified error type → IntoResponse
├── middleware.rs      Request/response middleware
├── db/
│   ├── mod.rs        SurrealDB connection with retry logic
│   ├── migrations.rs Schema initialization
│   └── seed.rs       Admin user seeding
├── models/           Serde structs (User, Post, SeedboxMetrics, etc.)
├── routes/
│   ├── auth.rs       Login, JWT, password reset (Argon2)
│   ├── posts.rs      CRUD + admin post management
│   ├── seedbox.rs    Aggregated seedbox metrics
│   ├── media.rs      Plex/Sonarr/Radarr aggregation
│   ├── honeypot.rs   Trap routes + intruder log
│   ├── audit.rs      Audit logging
│   ├── upload.rs     File upload + EXIF stripping
│   ├── users.rs      User management
│   └── health.rs     Health check + ping
├── proxy/
│   ├── plex.rs       Plex API client
│   ├── sonarr.rs     Sonarr API client
│   ├── radarr.rs     Radarr API client
│   └── qbittorrent.rs qBittorrent API client (SID cookie auth)
└── ws/
    └── mod.rs        WebSocket handler (real-time stats)
```

### Request Pipeline

```
Request
  → Tower middleware (CORS, compression, tracing)
  → Axum router match
  → Extractor validation (JWT, JSON body, path params)
  → Handler logic
  → SurrealDB / proxy call
  → Response serialization (JSON)
```

### Authentication Flow

1. `POST /api/auth/login` — validates credentials (Argon2), returns JWT
2. JWT stored in HttpOnly cookie + localStorage
3. Protected routes extract JWT from `Authorization: Bearer` header
4. Admin routes additionally check `user.role == "admin"`
5. API key auth (`ADMIN_API_KEY`) for CI/CD publishing

### Proxy Pattern

The backend acts as a reverse proxy for seedbox services:

```
Browser → Frontend → Backend → External Service
         (no API keys)  (has API keys)   (Plex, Sonarr, etc.)
```

API keys never reach the browser. The backend makes authenticated requests and returns sanitized responses.

## Database

### SurrealDB Schema

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│     users        │  │     posts        │  │ seedbox_metrics   │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ username (unique)│  │ title            │  │ download_speed   │
│ password_hash    │  │ slug (unique)    │  │ upload_speed     │
│ role             │  │ content (MDX)    │  │ disk_used        │
│ email (unique)   │  │ tags[]           │  │ disk_total       │
│ bio              │  │ published        │  │ active_torrents  │
│ avatar_url       │  │ author           │  │ seeding_torrents │
│ profile_public   │  │ created_at       │  │ timestamp        │
│ created_at       │  │ updated_at       │  └──────────────────┘
│ updated_at       │  └──────────────────┘
│ last_login       │  ┌──────────────────┐
└──────────────────┘  │  honeypot_hits   │
                      ├──────────────────┤
                      │ ip_hash          │
                      │ path             │
                      │ user_agent       │
                      │ timestamp        │
                      └──────────────────┘
```

### Why SurrealDB?

- Document model fits blog posts (flexible schema per post)
- Built-in auth and permissions (not currently used, but available)
- Time-series queries for seedbox metrics
- Single binary, easy to deploy
- SurrealQL is expressive for both document and relational queries

## Security Model

### Headers (applied by Next.js middleware)

| Header | Value |
|--------|-------|
| Content-Security-Policy | Restrictive CSP (self + inline for Next.js) |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| Referrer-Policy | no-referrer |
| Permissions-Policy | Denies camera, mic, geolocation, FLoC |

### Authentication

- Passwords hashed with Argon2id
- JWT tokens with configurable TTL
- HttpOnly cookies for session management
- Role-based access (admin / guest)

### Upload Security

- EXIF metadata stripped from uploaded images (`img-parts` crate)
- File type validation server-side
- Uploads served from a dedicated path (`/api/uploads/`)

### Honeypot

- Trap routes for common attack paths (`/wp-admin`, `/.env`, `/.git/config`)
- IPs are SHA-256 hashed (anonymized) before storage
- Public transparency page at `/blog/intruders`

## Docker Images

### Backend (distroless)

```dockerfile
# Build: rust:slim-bookworm (compile)
# Run:   gcr.io/distroless/cc-debian12 (minimal, no shell)
# Size:  ~25MB
```

### Frontend (Node.js Alpine)

```dockerfile
# Deps:  node:22-alpine (npm ci)
# Build: node:22-alpine (next build, standalone output)
# Run:   node:22-alpine (node server.js)
# Size:  ~150MB
```

### SurrealDB

- Official `surrealdb/surrealdb:v2` image
- RocksDB backend for persistence in production
- In-memory backend for development

### Tor

- `goldy/tor-hidden-service` image
- Auto-generates v3 `.onion` address
- Proxies port 80 to frontend:3000
