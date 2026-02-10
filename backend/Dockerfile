# Stage 1: Build
FROM rust:1.84-slim-bookworm AS builder
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    cmake \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY Cargo.toml Cargo.lock* ./
COPY src ./src

RUN cargo build --release

# Stage 2: Runtime
FROM gcr.io/distroless/cc-debian12 AS runner

COPY --from=builder /app/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001
ENTRYPOINT ["fs0ciety-backend"]