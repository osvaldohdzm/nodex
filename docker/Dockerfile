# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:20.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONUNBUFFERED=1

# Instalar solo las dependencias esenciales del sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      gnupg \
      apt-transport-https \
      ca-certificates \
      python3 python3-pip \
      nodejs npm \
      supervisor \
    && rm -rf /var/lib/apt/lists/*

# --- Backend ---
WORKDIR /app/backend

# 1. Copiar solo el archivo de dependencias primero
COPY backend/requirements.txt ./

# 2. Instalar dependencias sin usar venv para simplificar
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# 3. Copiar el resto del código del backend
COPY backend/ ./

# Environment variables for backend
ENV REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    REDISGRAPH_GRAPH_NAME=sivg_graph \
    JWT_SECRET_KEY=tu_super_secreto_jwt \
    ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=30

# --- Frontend ---
WORKDIR /app/frontend

# 1. Copiar package.json y package-lock.json primero
COPY frontend/package*.json ./

# 2. Instalar dependencias del frontend usando npm ci para consistencia
RUN npm ci

# 3. Copiar el resto del código del frontend
COPY frontend/ ./

# Environment variables for frontend
ENV WDS_SOCKET_HOST=0.0.0.0 \
    WDS_SOCKET_PORT=4545 \
    WDS_SOCKET_PATH=/ws

# --- Supervisor ---
# Ya no es necesario crear el directorio si ya existe en la imagen base
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 8000 4545

# ENTRYPOINT
ENTRYPOINT ["/usr/bin/supervisord", "-n"]
