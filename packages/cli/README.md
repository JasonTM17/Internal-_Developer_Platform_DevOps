# @idp/cli

Developer CLI for the Internal Developer Platform. Manage services, deployments, environments, and configuration from your terminal.

## Installation

```bash
# From the monorepo
npm install -g @idp/cli

# Or use directly with npx
npx @idp/cli <command>
```

## Quick Start

```bash
# Login to the platform
idp login

# Check platform status
idp status

# Search the service catalog
idp catalog search "user-service"

# Deploy a service
idp deploy create --service <id> --env staging --version v1.2.0

# Stream logs
idp logs stream --service <id> --env production
```

## Configuration

Configuration is stored in `~/.idp/config.json`. Credentials are stored separately in `~/.idp/credentials.json` with restricted file permissions.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `IDP_API_URL` | API server base URL |
| `IDP_TOKEN` | Authentication token (overrides stored token) |
| `IDP_TIMEOUT` | Request timeout in milliseconds |
| `IDP_DEFAULT_ENV` | Default environment for commands |
| `IDP_OUTPUT_FORMAT` | Output format (text, json, yaml) |
| `IDP_DEBUG` | Enable debug output (true/false) |
| `NO_COLOR` | Disable colored output |

### Profiles

```bash
# Use a specific profile
idp --profile staging deploy list

# Set active profile
idp config profile use staging
```

## Commands

### Service Catalog

```bash
# Search services
idp catalog search <query>

# Register a new service
idp catalog register \
  --name my-service \
  --namespace backend \
  --owner platform-team \
  --repo https://github.com/org/my-service \
  --lifecycle development \
  --tags "api,backend"

# Get service details
idp catalog info <service-id>

# Update a service
idp catalog update <id> --lifecycle production --owner new-team

# Manage dependencies
idp catalog deps <id>
idp catalog deps <id> --add <target-id> --type runtime
idp catalog deps <id> --remove <target-id>
```

### Deployments

```bash
# Create a deployment
idp deploy create \
  --service <id> \
  --env production \
  --version v2.0.0 \
  --strategy canary \
  --canary-pct 10 \
  --require-approval

# Check deployment status
idp deploy status <deployment-id>
idp deploy status <deployment-id> --watch

# List deployments
idp deploy list --env production --state in_progress

# Approve a pending deployment
idp deploy approve <deployment-id>

# Cancel a deployment
idp deploy cancel <deployment-id> --reason "Found regression in staging"

# Rollback a failed deployment
idp deploy rollback <deployment-id>
```

### Environments

```bash
# List environments
idp env list
idp env list --tier production

# Create an environment
idp env create \
  --name preview-feat-123 \
  --tier preview \
  --ttl 24 \
  --description "Preview for feature branch"

# Get environment details
idp env info <id>

# Promote to next tier
idp env promote <id> --target staging

# Manage environment variables
idp env vars list <env-id>
idp env vars set <env-id> DATABASE_URL "postgresql://..." --secret

# Delete an environment
idp env delete <id> --force
```

### Configuration

```bash
# Get a config value
idp config get app.feature-flags.dark-mode

# Set a config value
idp config set app.timeout 30 \
  --scope environment \
  --scope-id production \
  --type number

# Resolve effective config for a service
idp config resolve <service-id> --env production

# View change history
idp config history app.timeout --scope environment --scope-id production

# Rollback to a previous version
idp config rollback app.timeout --to-version 2
```

### Logs

```bash
# Stream real-time logs
idp logs stream --service <id> --env production --level warn

# Tail recent logs
idp logs tail --service <id> --lines 100 --since 1h

# Search historical logs
idp logs search "error" --service <id> --from 2024-01-01 --level error
```

### Platform Status

```bash
# Overall platform health
idp status

# Service health overview
idp status services

# Active deployments
idp status deploys --env production

# Environment status
idp status envs
```

## Global Options

| Option | Description |
|--------|-------------|
| `--api-url <url>` | Override the API base URL |
| `--profile <name>` | Use a specific configuration profile |
| `--json` | Output results as JSON |
| `--no-color` | Disable colored output |
| `--verbose` | Enable verbose logging |
| `--quiet` | Suppress non-essential output |
| `-v, --version` | Display the CLI version |
| `-h, --help` | Display help |

## Authentication

### API Key (CI/CD)

```bash
export IDP_TOKEN="your-api-key"
idp deploy create --service <id> --env staging --version v1.0.0
```

### Interactive Login (OAuth2 Device Flow)

```bash
idp login
# Opens browser for authentication
```

### Token-based

```bash
idp login --token <jwt-token>
```

## Development

```bash
# Build the CLI
npm run build

# Run in development mode
npm run dev -- status

# Run tests
npm test

# Link for local development
npm link
```

## License

MIT
