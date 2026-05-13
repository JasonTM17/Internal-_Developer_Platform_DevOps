#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# kubectl Port-Forward Helper
# =============================================================================
# Quickly set up port forwarding to cluster services.
# Usage: ./scripts/port-forward.sh [service] [environment]
# =============================================================================

SERVICE="${1:-all}"
ENVIRONMENT="${2:-dev}"
NAMESPACE="idp-${ENVIRONMENT}"

echo "=============================================="
echo "  Port Forward - $ENVIRONMENT"
echo "=============================================="
echo ""

# Ensure kubectl context is correct
CLUSTER="idp-${ENVIRONMENT}"
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
echo "Current context: $CURRENT_CONTEXT"
echo "Target namespace: $NAMESPACE"
echo ""

cleanup() {
  echo ""
  echo "Stopping port forwards..."
  kill $(jobs -p) 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT

forward_service() {
  local svc=$1
  local local_port=$2
  local remote_port=$3
  
  echo "  $svc: localhost:$local_port → $remote_port"
  kubectl port-forward -n "$NAMESPACE" "svc/$svc" "$local_port:$remote_port" &
}

case "$SERVICE" in
  api)
    forward_service "idp-api" 3000 3000
    ;;
  portal)
    forward_service "idp-portal" 5173 8080
    ;;
  postgres|db)
    forward_service "idp-postgres" 5432 5432
    ;;
  redis)
    forward_service "idp-redis" 6379 6379
    ;;
  grafana)
    forward_service "grafana" 3001 3000
    kubectl port-forward -n monitoring svc/grafana 3001:3000 &
    ;;
  prometheus)
    kubectl port-forward -n monitoring svc/prometheus-server 9090:9090 &
    echo "  prometheus: localhost:9090"
    ;;
  argocd)
    kubectl port-forward -n argocd svc/argocd-server 8443:443 &
    echo "  argocd: localhost:8443"
    ;;
  all)
    echo "Forwarding all services:"
    forward_service "idp-api" 3000 3000
    forward_service "idp-portal" 5173 8080
    kubectl port-forward -n monitoring svc/grafana 3001:3000 &
    echo "  grafana: localhost:3001"
    kubectl port-forward -n monitoring svc/prometheus-server 9090:9090 &
    echo "  prometheus: localhost:9090"
    ;;
  *)
    echo "Unknown service: $SERVICE"
    echo "Available: api, portal, postgres, redis, grafana, prometheus, argocd, all"
    exit 1
    ;;
esac

echo ""
echo "Port forwards active. Press Ctrl+C to stop."
wait
