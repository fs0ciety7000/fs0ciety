# Stage 1: Build
FROM rust:1.84-bookworm AS builder
WORKDIR /app

# 1. Création explicite de la structure de dossiers
RUN mkdir -p backend/src

# 2. Copie des fichiers de configuration (Manifests)
COPY backend/Cargo.toml backend/Cargo.lock* ./backend/

# 3. Création des fichiers "Dummy" pour le cache des dépendances
RUN echo "fn main() {}" > backend/src/main.rs && \
    touch backend/src/lib.rs

# 4. Build des dépendances (Mise en cache)
WORKDIR /app/backend
RUN cargo build --release && rm -rf src

# 5. Copie du VRAI code source
WORKDIR /app
COPY backend/src ./backend/src

# 6. Build final du binaire
WORKDIR /app/backend
# On "touch" le main.rs pour forcer Cargo à recompiler le binaire final
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime (Image finale légère)
FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app

# On récupère le binaire compilé depuis l'étape précédente
COPY --from=builder /app/backend/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001
ENTRYPOINT ["fs0ciety-backend"]