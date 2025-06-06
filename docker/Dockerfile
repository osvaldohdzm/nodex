# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:20.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Etc/UTC

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      gnupg \
      apt-transport-https \
      ca-certificates \
      openjdk-11-jre-headless \
      python3 python3-pip python3-venv \
      nodejs npm \
      supervisor \
      net-tools \
      git \
    && rm -rf /var/lib/apt/lists/*

# Configuración Neo4j (v4.4)
RUN curl -sSL https://debian.neo4j.com/neotechnology.gpg.key | apt-key add - && \
    echo "deb https://debian.neo4j.com stable 4.4" > /etc/apt/sources.list.d/neo4j.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends neo4j=1:4.4.27 && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/lib/neo4j/data && \
    mkdir -p /var/lib/neo4j/logs && \
    ln -s /var/lib/neo4j/data /data

ENV NEO4J_AUTH=neo4j/yourStrongPassword \
    NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
    NEO4J_HOME=/usr/share/neo4j \
    NEO4J_CONF=/etc/neo4j

# Preparar backend
WORKDIR /app/backend
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m venv /app/backend/venv && \
    /app/backend/venv/bin/pip install --upgrade pip && \
    /app/backend/venv/bin/pip install -r /app/backend/requirements.txt
COPY backend /app/backend

ENV NEO4J_URI=bolt://localhost:7687 \
    NEO4J_USER=neo4j \
    NEO4J_PASSWORD=yourStrongPassword \
    JWT_SECRET_KEY=tu_super_secreto_jwt \
    ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=30

# Preparar frontend
WORKDIR /app/frontend
COPY frontend/package.json /app/frontend/package.json
COPY frontend/package-lock.json /app/frontend/package-lock.json
RUN npm install
COPY frontend /app/frontend

ENV WDS_SOCKET_HOST=0.0.0.0 \
    WDS_SOCKET_PORT=4545 \
    WDS_SOCKET_PATH=/ws

# Configurar Supervisor
RUN mkdir -p /etc/supervisor/conf.d
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Exponer puertos: Neo4j, backend, frontend
EXPOSE 7474 7687 8000 4545

# ENTRYPOINT: iniciar Supervisor en primer plano
ENTRYPOINT ["/usr/bin/supervisord", "-n"]
