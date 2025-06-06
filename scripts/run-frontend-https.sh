#!/bin/bash

# Check if certificates exist
if [ ! -f "certificates/client.crt" ] || [ ! -f "certificates/client.key" ]; then
    echo "SSL certificates not found. Generating them first..."
    ./scripts/generate-ssl-certs.sh
fi

# Set environment variables for HTTPS
export HTTPS=true
export SSL_CRT_FILE=certificates/client.crt
export SSL_KEY_FILE=certificates/client.key

# Run the frontend development server
cd frontend && npm start 