FROM ubuntu:20.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC \
    PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      python3 \
      python3-pip \
      supervisor \
    && rm -rf /var/lib/apt/lists/*

FROM base AS backend-builder
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip install --no-cache-dir --upgrade pip && \
    python3 -m pip install --no-cache-dir -r ./backend/requirements.txt

FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./

RUN npm run build

FROM base AS final
WORKDIR /app

ENV REDIS_HOST=localhost \
    REDIS_PORT=6379 \
    REDISGRAPH_GRAPH_NAME=sivg_graph \
    JWT_SECRET_KEY="tu_super_secreto_jwt" \
    ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=30

COPY backend/requirements.txt ./backend/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/static/
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose both backend and frontend ports
EXPOSE 8000 4545

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]