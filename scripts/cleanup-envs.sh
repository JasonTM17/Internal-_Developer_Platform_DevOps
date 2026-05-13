#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Expired Environment Cleanup
# =============================================================================
# Removes preview/ephemeral environments that have exceeded their TTL.
# Usage: ./scripts/cleanup-envs.sh [--dry-run]
# =============================================================================

DRY_RUN="${1:-}"
NAMESPACE_PREFIX="idp-preview-"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-72}" # 3 days default TTL

echo "=============================================="
echo "  Environment Cleanup"
echo "  Max age: ${MAX_AGE_HOURS} hours"
echo "=============================================="
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "🔍 DRY RUN MODE - no changes will be made"
  echo ""
fi

CLEANED=0
CURRENT_TIME=$(date +%s)

# Find preview namespaces
kubectl get namespaces -l type=preview -o json | jq -r '.items[] | .metadata.name + " " + .metadata.creationTimestamp' | while read -r ns created; do
  # Calculate age
  CREATED_EPOCH=$(date -d "$created" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created" +%s)
  AGE_HOURS=$(( (CURRENT_TIME - CREATED_EPOCH) / 3600 ))
  
  if [[ $AGE_HOURS -gt $MAX_AGE_HOURS ]]; then
    echo "  ✗ $ns (age: ${AGE_HOURS}h, exceeds ${MAX_AGE_HOURS}h TTL)"
    
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
      # Delete Helm releases in namespace
      helm list -n "$ns" -q | xargs -I {} helm uninstall {} -n "$ns" 2>/dev/null || true
      
      # Delete namespace
      kubectl delete namespace "$ns" --wait=false
      
      # Clean up ArgoCD application
      argocd app delete "$ns" --cascade 2>/dev/null || true
      
      CLEANED=$((CLEANED + 1))
    fi
  else
    echo "  ✓ $ns (age: ${AGE_HOURS}h, within TTL)"
  fi
done

# Clean up orphaned ECR images for deleted environments
echo ""
echo "Checking for orphaned container images..."
aws ecr describe-repositories --query "repositories[?starts_with(repositoryName, 'idp-preview-')].[repositoryName]" --output text | while read -r repo; do
  # Check if corresponding namespace exists
  NS_NAME=$(echo "$repo" | sed 's/^idp-//')
  if ! kubectl get namespace "$NS_NAME" &>/dev/null; then
    echo "  ✗ Orphaned repo: $repo"
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
      aws ecr delete-repository --repository-name "$repo" --force
    fi
  fi
done

echo ""
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "Dry run complete. Run without --dry-run to apply changes."
else
  echo "✓ Cleanup complete. Removed $CLEANED environment(s)."
fi
