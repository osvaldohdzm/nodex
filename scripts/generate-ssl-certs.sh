#!/bin/bash

# Create certificates directory if it doesn't exist
mkdir -p certificates

# Generate root CA key and certificate
openssl genrsa -out certificates/ca.key 2048
openssl req -new -x509 -days 365 -key certificates/ca.key -out certificates/ca.crt \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Nodex/OU=Development/CN=Nodex Root CA"

# Generate server key and CSR
openssl genrsa -out certificates/server.key 2048
openssl req -new -key certificates/server.key -out certificates/server.csr \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Nodex/OU=Development/CN=192.168.0.4"

# Create server certificate signed by CA
openssl x509 -req -days 365 -in certificates/server.csr \
    -CA certificates/ca.crt -CAkey certificates/ca.key \
    -CAcreateserial -out certificates/server.crt

# Generate client key and CSR
openssl genrsa -out certificates/client.key 2048
openssl req -new -key certificates/client.key -out certificates/client.csr \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Nodex/OU=Development/CN=Nodex Client"

# Create client certificate signed by CA
openssl x509 -req -days 365 -in certificates/client.csr \
    -CA certificates/ca.crt -CAkey certificates/ca.key \
    -CAcreateserial -out certificates/client.crt

# Set proper permissions
chmod 600 certificates/*.key
chmod 644 certificates/*.crt

echo "SSL certificates generated in certificates/ directory"
echo "Add these certificates to your system's trusted certificates:"
echo "  - certificates/ca.crt (Root CA certificate)"
echo "  - certificates/server.crt (Server certificate)"
echo "  - certificates/client.crt (Client certificate)" 