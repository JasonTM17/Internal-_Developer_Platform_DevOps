#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Platform Health Verification
# =============================================================================
# Comprehensive health check across all platform components.
# Usage: ./scripts/health-check.sh [environment]
# =============================================================================

ENVIRONMENT="${1:-dev}"
NAMESPACE="idp-${ENVIRONMENT}"
PASS=0
FAIL=0
WARN=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
check_fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }

echo "=============================================="
echo "  Platform Health Check - $ENVIRONMENT"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================="
echo ""

# Determine base URLs
case "$ENVIRONMENT" in
  local)
    API_URL="http://localhost:3000"
    PORTAL_URL="http://localhost:5173"
    ;;
  dev)
    API_URL="https://dev-api.idp.example.com"
    PORTAL_URL="https://dev.idp.example.com"
    ;;
  staging)
    API_URL="https://staging-api.idp.example.com"
    PORTAL_URL="https://staging.idp.example.com"
    ;;
  production)
    API_URL="https://api.idp.example.com"
    PORTAL_URL="https://idp.example.com"
    ;;
esac

# --- API Health ---
echo "API Service ($API_URL)"
if curl -sf "$API_URL/health" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "200"; then
  check_pass "Health endpoint responding"
else
  check_fail "Health endpoint not responding"
fi

if curl -sf "$API_URL/ready" -o /dev/null 2>/dev/null; then
  check_pass "Readiness check passing"
else
  check_fail "Readiness check failing"
fi

VERSION=$(curl -sf "$API_URL/version" 2>/dev/null | jq -r '.version' 2>/dev/null || echo "unknown")
echo "  Version: $VERSION"
echo ""

# --- Portal Health ---
echo "Portal ($PORTAL_URL)"
if curl -sf "$PORTAL_URL" -o /dev/null 2>/dev/null; then
  check_pass "Portal accessible"
else
  check_fail "Portal not accessible"
fi
echo ""

# --- Kubernetes Health (skip for local) ---
if [[ "$ENVIRONMENT" != "local" ]]; then
  echo "Kubernetes Cluster"
  
  # Node health
  READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready" || echo "0")
  TOTAL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
  if [[ "$READY_NODES" == "$TOTAL_NODES" ]] && [[ "$TOTAL_NODES" -gt 0 ]]; then
    check_pass "All nodes ready ($READY_NODES/$TOTAL_NODES)"
  else
    check_fail "Nodes not ready ($READY_NODES/$TOTAL_NODES)"
  fi
  
  # Pod health
  NOT_RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -cv "Running\|Completed" || echo "0")
  if [[ "$NOT_RUNNING" == "0" ]]; then
    check_pass "All pods running in $NAMESPACE"
  else
    check_fail "$NOT_RUNNING pod(s) not running in $NAMESPACE"
  fi
  
  # Recent restarts
  RESTARTS=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' 2>/dev/null | tr ' ' '\n' | awk '{s+=$1} END {print s}' || echo "0")
  if [[ "$RESTARTS" -lt 5 ]]; then
    check_pass "Low restart count ($RESTARTS total)"
  else
    check_warn "High restart count ($RESTARTS total)"
  fi
  echo ""
  
  # --- Database Health ---
  echo "Database"
  DB_STATUS=$(aws rds describe-db-instances --db-instance-identifier "idp-${ENVIRONMENT}" --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "unknown")
  if [[ "$DB_STATUS" == "available" ]]; then
    check_pass "RDS instance available"
  else
    check_fail "RDS instance status: $DB_STATUS"
  fi
  echo ""
fi

# --- Summary ---
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}UNHEALTHY${NC} - $FAIL check(s) failed"
  exit 1
else
  echo -e "${GREEN}HEALTHY${NC} - All critical checks passed"
  exit 0
fi
