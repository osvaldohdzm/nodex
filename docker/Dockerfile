# ============================================
# Stage 1: Frontend Build
# ============================================
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ============================================
# Stage 2: Backend Build
# ============================================
FROM python:3.10-slim AS backend-builder
WORKDIR /backend
COPY backend/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
COPY backend/ .

# ============================================
# Stage 3: Final Image
# ============================================
FROM ubuntu:22.04
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    nginx \
    python3 \
    python3-pip \
    openjdk-11-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/sites-available/default
RUN mkdir -p /var/www/html
COPY --from=frontend-builder /frontend/build /var/www/html

# Configure Backend
COPY --from=backend-builder /backend /app/backend
COPY --from=backend-builder /root/.local /root/.local
ENV PATH="/root/.local/bin:${PATH}"
ENV PYTHONPATH="/app/backend"

# Install Neo4j
ENV NEO4J_HOME="/var/lib/neo4j"
ENV NEO4J_URI="bolt://localhost:7687"
ENV NEO4J_USER="neo4j"
ENV NEO4J_PASSWORD="password"

# Copy entrypoint
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose ports
# - 4545: Frontend (Nginx)
# - 8000: Backend (FastAPI)
# - 7474: Neo4j Browser
# - 7687: Neo4j Bolt
EXPOSE 4545 8000 7474 7687

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4545 || exit 1

CMD ["/app/entrypoint.sh"]
