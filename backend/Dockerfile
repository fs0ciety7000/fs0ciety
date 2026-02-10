# ── fs0ciety Backend — Multi-stage Rust Build ─────────────────
# Build context is the repo root (set in docker-compose.yml)

# Stage 1: Build with full toolchain
FROM rust:1.84-bookworm AS builder

# Replicate repo layout so include_str! paths resolve identically:
#   /build/backend/src/db/migrations.rs  →  ../../../database/  →  /build/database/
WORKDIR /build/backend

# Cache dependencies by copying manifests first.
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs && \
    cargo build --release 2>/dev/null || true && \
    rm -rf src

# Copy real source + database migrations (needed by include_str! at compile time).
COPY backend/src ./src
COPY database /build/database
RUN touch src/main.rs && cargo build --release --locked

# Stage 2: Minimal runtime
FROM gcr.io/distroless/cc-debian12 AS runner

COPY --from=builder /build/backend/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001

ENTRYPOINT ["fs0ciety-backend"]
