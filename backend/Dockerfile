# Stage 1: Build
FROM rust:1.84-bookworm AS builder

# Replicate repo layout so include_str! paths resolve identically:
#   /build/backend/src/db/migrations.rs  →  ../../../database/  →  /build/database/
WORKDIR /build/backend

# 1. On copie la structure nécessaire
# On crée les dossiers AVANT de copier pour éviter les erreurs de contexte
RUN mkdir -p backend/src database

# 2. On copie les manifests
COPY backend/Cargo.toml backend/Cargo.lock* ./backend/
COPY database/ ./database/

# 3. ÉTAPE CRUCIALE : On crée un squelette COMPLET
# Si ton Cargo.toml contient [lib] ou d'autres [[bin]], il faut les simuler
WORKDIR /app/backend
RUN touch src/lib.rs && \
    echo "fn main() {}" > src/main.rs

# 4. Build des dépendances uniquement
# On utilise --locked pour garantir la cohérence avec Cargo.lock
RUN cargo build --release --locked && \
    rm -rf src

# 5. On copie le vrai code source
COPY backend/src ./src

# 6. Build final
RUN touch src/main.rs && cargo build --release --locked

# Stage 2: Runtime
FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app
# Vérifie bien que le nom du binaire 'fs0ciety-backend' correspond au 'name' dans Cargo.toml
COPY --from=builder /app/backend/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001
ENTRYPOINT ["fs0ciety-backend"]