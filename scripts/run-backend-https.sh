#!/bin/bash

# Check if certificates exist
if [ ! -f "certificates/server.crt" ] || [ ! -f "certificates/server.key" ]; then
    echo "SSL certificates not found. Generating them first..."
    ./scripts/generate-ssl-certs.sh
fi

# Run uvicorn with SSL
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --ssl-keyfile certificates/server.key \
    --ssl-certfile certificates/server.crt \
    --reload 