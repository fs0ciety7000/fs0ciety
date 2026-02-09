# Stage 1: Build
FROM rust:1.84-bookworm AS builder
WORKDIR /app

# 1. On copie d'abord TOUTE la structure de fichiers nécessaire à Cargo
# Cargo a besoin de voir les manifests pour valider les dépendances
COPY backend/Cargo.toml backend/Cargo.lock* ./backend/
COPY database ./database/

# On se place dans le dossier backend pour la suite
WORKDIR /app/backend

# 2. On crée un squelette valide pour le build de cache
# On s'assure que le dossier src existe avec un main.rs minimal
RUN mkdir src && echo "fn main() { println!(\"dummy\"); }" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# 3. Maintenant on copie le vrai code source
COPY backend/src ./src

# 4. On re-build (Cargo ne re-compilera que votre code, pas les dépendances)
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime
FROM gcr.io/distroless/cc-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/backend/target/release/fs0ciety-backend /usr/local/bin/fs0ciety-backend

EXPOSE 3001
ENV BACKEND_PORT=3001
ENTRYPOINT ["fs0ciety-backend"]