# Contributing to fs0ciety

Thanks for your interest in contributing. Here's how to get started.

## Development Setup

See the [Quick Start](README.md#quick-start-development) in the README.

```bash
git clone https://github.com/fs0ciety7000/fs0ciety.git
cd fs0ciety
cp .env.example .env
cp backend/.env.example backend/.env
just install
just dev-db
just seed
# Then: just dev-backend (terminal 1) + just dev-frontend (terminal 2)
```

## Project Structure

- `frontend/` — Next.js 15, React 19, Tailwind CSS 4
- `backend/` — Rust + Axum
- `database/` — SurrealDB migrations and seeds
- `content/posts/` — MDX blog posts
- `scripts/` — Utility scripts

## Code Style

### Rust (backend)

- Format with `cargo fmt`
- Lint with `cargo clippy -- -D warnings`
- Follow standard Rust naming conventions

### TypeScript (frontend)

- Format with `npx prettier --write "src/**/*.{ts,tsx}"`
- Lint with `npm run lint`
- Type-check with `npm run type-check`

### Run all checks

```bash
just check
```

## Making Changes

1. Fork the repo and create a feature branch from `main`
2. Make your changes
3. Run `just check` to verify linting and types
4. Test your changes locally (both dev and Docker)
5. Write clear commit messages
6. Open a pull request against `main`

## Commit Messages

Use clear, descriptive commit messages. Examples:

```
Add tag filter component to blog listing
Fix WebSocket reconnection on dashboard
Update SurrealDB migration for user profiles
```

## Pull Requests

- Keep PRs focused on a single change
- Include a description of what changed and why
- If the PR adds a new feature, update relevant documentation
- Screenshots are welcome for UI changes

## Adding a New API Route

1. Create the handler in `backend/src/routes/`
2. Add the route to the router in `main.rs`
3. Add OpenAPI annotations (`#[utoipa::path]`) for Swagger docs
4. Export the module in `routes/mod.rs`

## Adding a New Page

1. Create the page in `frontend/src/app/`
2. If it needs a subdomain, add it to the `SUBDOMAIN_MAP` in `middleware.ts`
3. If it needs API data, the API proxy is already configured in `next.config.ts`

## Adding a New Terminal Command

1. Edit `frontend/src/lib/commands.ts`
2. Add the command name, description, and handler function
3. The terminal component picks it up automatically

## Database Migrations

- Create a new file in `database/migrations/` with the next version number
- Use `DEFINE ... IF NOT EXISTS` for idempotent migrations
- Test with `just migrate` locally before committing

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/OS/environment info if relevant

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
