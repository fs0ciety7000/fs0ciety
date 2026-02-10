# Stage 1: Build
FROM rust:slim-bookworm AS builder
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    cmake \
    protobuf-compiler \
    curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build/backend

COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/src ./src
COPY database /build/database

RUN cargo build --release

# Stage 2: Runtime
FROM gcr.io/distroless/cc-debian12 AS runner

COPY --from=builder /build/backend/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001
ENTRYPOINT ["fs0ciety-backend"]
