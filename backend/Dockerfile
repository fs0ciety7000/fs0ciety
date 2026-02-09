# ── fs0ciety Backend — Multi-stage Rust Build ─────────────────

# Stage 1: Build with full toolchain
FROM rust:1.84-bookworm AS builder
WORKDIR /app

# Cache dependencies by copying manifests first.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Copy real source and build.
COPY src ./src
COPY ../database ./database
RUN touch src/main.rs && cargo build --release

# Stage 2: Minimal runtime
FROM gcr.io/distroless/cc-debian12 AS runner

COPY --from=builder /app/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001

ENTRYPOINT ["fs0ciety-backend"]
