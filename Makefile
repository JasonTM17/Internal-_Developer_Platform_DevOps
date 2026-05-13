# =============================================================================
# IDP Platform - Makefile
# =============================================================================
# Common development and operations tasks.
# Usage: make [target]
# =============================================================================

.PHONY: help install dev build test lint clean docker-up docker-down deploy

# Default target
.DEFAULT_GOAL := help

# Variables
ENVIRONMENT ?= dev
SERVICE ?= all
VERSION ?= $(shell git describe --tags --always --dirty)

## help: Show this help message
help:
	@echo "IDP Platform - Available targets:"
	@echo ""
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed 's/^/  /'
	@echo ""

# =============================================================================
# Development
# =============================================================================

## install: Install all dependencies
install:
	npm ci --prefer-offline

## dev: Start development environment
dev: docker-up
	npx turbo dev

## build: Build all packages
build:
	npx turbo build

## test: Run all tests
test:
	npx turbo test

## test-watch: Run tests in watch mode
test-watch:
	npx turbo test -- --watch

## lint: Run linting
lint:
	npx turbo lint
	npx prettier --check "**/*.{ts,tsx,js,jsx,json,yaml,yml,md}"

## lint-fix: Fix linting issues
lint-fix:
	npx turbo lint -- --fix
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,yaml,yml,md}"

## typecheck: Run TypeScript type checking
typecheck:
	npx turbo typecheck

## clean: Clean build artifacts and caches
clean:
	rm -rf node_modules/.cache
	rm -rf .turbo
	rm -rf apps/*/dist
	rm -rf apps/*/.turbo
	rm -rf packages/*/dist
	rm -rf coverage

# =============================================================================
# Docker
# =============================================================================

## docker-up: Start Docker development services
docker-up:
	docker compose up -d

## docker-down: Stop Docker services
docker-down:
	docker compose down

## docker-reset: Reset Docker services (removes volumes)
docker-reset:
	docker compose down -v
	docker compose up -d

## docker-logs: Follow Docker service logs
docker-logs:
	docker compose logs -f

## docker-build: Build Docker images
docker-build:
	docker compose build --no-cache

## docker-monitoring: Start monitoring stack
docker-monitoring:
	docker compose -f docker-compose.yaml -f docker-compose.monitoring.yaml up -d

# =============================================================================
# Database
# =============================================================================

## db-migrate: Run database migrations
db-migrate:
	./scripts/db-migrate.sh $(ENVIRONMENT)

## db-seed: Seed development data
db-seed:
	./scripts/db-seed.sh

## db-reset: Reset database (drop, create, migrate, seed)
db-reset: docker-up
	docker compose exec postgres dropdb -U idp idp_dev --if-exists
	docker compose exec postgres createdb -U idp idp_dev
	$(MAKE) db-migrate
	$(MAKE) db-seed

## db-backup: Create database backup
db-backup:
	./scripts/backup.sh $(ENVIRONMENT)

## db-restore: Restore database from backup
db-restore:
	./scripts/restore.sh $(ENVIRONMENT)

# =============================================================================
# Infrastructure
# =============================================================================

## tf-plan: Run Terraform plan
tf-plan:
	cd infra/terraform/environments/$(ENVIRONMENT) && \
	terraform init && \
	terraform plan -var-file=terraform.tfvars

## tf-apply: Apply Terraform changes
tf-apply:
	cd infra/terraform/environments/$(ENVIRONMENT) && \
	terraform apply -var-file=terraform.tfvars

## helm-lint: Lint Helm charts
helm-lint:
	helm lint infra/helm/idp-platform

## helm-template: Render Helm templates
helm-template:
	helm template idp-platform infra/helm/idp-platform \
		--values infra/helm/idp-platform/values-$(ENVIRONMENT).yaml

# =============================================================================
# Deployment
# =============================================================================

## deploy: Deploy to environment
deploy:
	@echo "Deploying version $(VERSION) to $(ENVIRONMENT)..."
	helm upgrade --install idp-platform infra/helm/idp-platform \
		--namespace idp-$(ENVIRONMENT) \
		--set image.tag=$(VERSION) \
		--values infra/helm/idp-platform/values-$(ENVIRONMENT).yaml \
		--wait

## rollback: Rollback deployment
rollback:
	helm rollback idp-platform -n idp-$(ENVIRONMENT)

# =============================================================================
# Security
# =============================================================================

## security-scan: Run security scans
security-scan:
	npx audit-ci --critical
	docker run --rm -v $(PWD):/src aquasec/trivy fs --severity HIGH,CRITICAL /src

## secret-scan: Scan for secrets
secret-scan:
	docker run --rm -v $(PWD):/src trufflesecurity/trufflehog filesystem /src

# =============================================================================
# Utilities
# =============================================================================

## port-forward: Set up kubectl port forwarding
port-forward:
	./scripts/port-forward.sh all $(ENVIRONMENT)

## health-check: Run platform health checks
health-check:
	./scripts/health-check.sh $(ENVIRONMENT)

## generate-certs: Generate local TLS certificates
generate-certs:
	./scripts/generate-certs.sh

## setup: Full developer setup
setup:
	./scripts/setup.sh
