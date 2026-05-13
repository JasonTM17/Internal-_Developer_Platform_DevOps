#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Local TLS Certificate Generation
# =============================================================================
# Generates self-signed certificates for local HTTPS development.
# Usage: ./scripts/generate-certs.sh
# =============================================================================

CERTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.certs"
DOMAIN="localhost"
DAYS=365

mkdir -p "$CERTS_DIR"

echo "=============================================="
echo "  Local TLS Certificate Generation"
echo "=============================================="
echo ""

# Generate CA key and certificate
echo "Generating CA certificate..."
openssl req -x509 -nodes -new -sha256 -days 1024 \
  -newkey rsa:2048 \
  -keyout "$CERTS_DIR/ca.key" \
  -out "$CERTS_DIR/ca.pem" \
  -subj "/C=US/ST=Local/L=Dev/O=IDP Platform/CN=IDP Local CA"

# Create SAN config
cat > "$CERTS_DIR/san.cnf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = Local
L = Dev
O = IDP Platform
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = api.localhost
DNS.4 = portal.localhost
DNS.5 = grafana.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate server key and CSR
echo "Generating server certificate..."
openssl req -new -nodes -newkey rsa:2048 \
  -keyout "$CERTS_DIR/server.key" \
  -out "$CERTS_DIR/server.csr" \
  -config "$CERTS_DIR/san.cnf"

# Sign server certificate with CA
openssl x509 -req -sha256 -days $DAYS \
  -in "$CERTS_DIR/server.csr" \
  -CA "$CERTS_DIR/ca.pem" \
  -CAkey "$CERTS_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERTS_DIR/server.crt" \
  -extfile "$CERTS_DIR/san.cnf" \
  -extensions v3_req

# Clean up CSR
rm -f "$CERTS_DIR/server.csr" "$CERTS_DIR/san.cnf" "$CERTS_DIR/ca.srl"

# Set permissions
chmod 600 "$CERTS_DIR"/*.key
chmod 644 "$CERTS_DIR"/*.pem "$CERTS_DIR"/*.crt

echo ""
echo "✓ Certificates generated in $CERTS_DIR"
echo ""
echo "Files:"
echo "  CA Certificate:     $CERTS_DIR/ca.pem"
echo "  Server Certificate: $CERTS_DIR/server.crt"
echo "  Server Key:         $CERTS_DIR/server.key"
echo ""
echo "To trust the CA on macOS:"
echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/ca.pem"
echo ""
echo "To trust the CA on Linux:"
echo "  sudo cp $CERTS_DIR/ca.pem /usr/local/share/ca-certificates/idp-local-ca.crt"
echo "  sudo update-ca-certificates"
