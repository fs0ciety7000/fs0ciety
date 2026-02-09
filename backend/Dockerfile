# Stage 1: Build
FROM rust:1.84-bookworm AS builder
WORKDIR /app

# 1. On copie d'abord tous les fichiers de définition de projet
# Incluant le dossier database si Cargo.toml y fait référence
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY database ../database 

# 2. On crée le squelette pour simuler un build et mettre en cache les deps
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# 3. Maintenant on copie le vrai code source du backend
COPY backend/src ./src

# 4. On re-build (cela sera très rapide car les deps sont cachées)
RUN touch src/main.rs && cargo build --release