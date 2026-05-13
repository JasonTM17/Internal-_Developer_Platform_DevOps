# TLS Certificate Rotation

## Overview

TLS certificates are managed by cert-manager with Let's Encrypt. This runbook covers both automated and manual rotation scenarios.

## Automated Rotation (Normal Operation)

cert-manager automatically renews certificates 30 days before expiry.

### Verify Auto-Renewal Status

```bash
# Check certificate status
kubectl get certificates -n idp-production
kubectl describe certificate idp-tls -n idp-production

# Check certificate expiry
kubectl get secret idp-tls -n idp-production -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates

# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager -f --tail=50
```

## Manual Rotation

### When Manual Rotation is Needed

- Certificate compromised (private key leaked)
- Domain name change
- cert-manager malfunction
- CA certificate rotation

### Procedure

```bash
# 1. Delete existing certificate (triggers re-issuance)
kubectl delete certificate idp-tls -n idp-production

# 2. Verify new certificate is issued
kubectl get certificaterequest -n idp-production
kubectl get order -n idp-production
kubectl get challenge -n idp-production

# 3. Wait for certificate to be ready
kubectl wait --for=condition=Ready certificate/idp-tls \
  -n idp-production --timeout=300s

# 4. Verify new certificate
kubectl get secret idp-tls -n idp-production -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -text | head -20

# 5. Restart ingress controller to pick up new cert
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

### Emergency: Replace with Manual Certificate

If cert-manager is broken and you need to manually provide a certificate:

```bash
# 1. Generate CSR (if needed)
openssl req -new -newkey rsa:2048 -nodes \
  -keyout idp.key -out idp.csr \
  -subj "/CN=*.idp.example.com"

# 2. Create Kubernetes secret from certificate files
kubectl create secret tls idp-tls-manual \
  -n idp-production \
  --cert=fullchain.pem \
  --key=privkey.pem

# 3. Update ingress to use manual secret
kubectl patch ingress idp-api -n idp-production \
  -p '{"spec":{"tls":[{"hosts":["api.idp.example.com"],"secretName":"idp-tls-manual"}]}}'
```

## Monitoring & Alerts

### Prometheus Alert Rules

```yaml
- alert: CertificateExpiringSoon
  expr: certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Certificate {{ $labels.name }} expires in less than 7 days"

- alert: CertificateExpiryCritical
  expr: certmanager_certificate_expiration_timestamp_seconds - time() < 24 * 3600
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Certificate {{ $labels.name }} expires in less than 24 hours"
```

### Verification Script

```bash
#!/bin/bash
# Run weekly to verify all certificates
for ns in idp-production idp-staging; do
  echo "=== Namespace: $ns ==="
  for cert in $(kubectl get certificates -n $ns -o jsonpath='{.items[*].metadata.name}'); do
    EXPIRY=$(kubectl get certificate $cert -n $ns -o jsonpath='{.status.notAfter}')
    READY=$(kubectl get certificate $cert -n $ns -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
    echo "  $cert: expires=$EXPIRY ready=$READY"
  done
done
```

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Challenge pending | DNS not propagated | Check Route 53 records |
| Order failed | Rate limit hit | Wait 1 hour, retry |
| Secret not updated | cert-manager crash | Restart cert-manager pod |
| Ingress using old cert | Nginx cache | Restart ingress controller |
