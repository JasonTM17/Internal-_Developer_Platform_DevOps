# Domain Configuration

## Placeholder Values

All infrastructure configurations use `example.com` as a placeholder domain.
Before deploying to any environment, replace these values with your actual domain:

| Placeholder                 | Replace With            |
| --------------------------- | ----------------------- |
| `idp.example.com`           | Your production domain  |
| `dev.idp.example.com`       | Your development domain |
| `staging.idp.example.com`   | Your staging domain     |
| `platform-team@example.com` | Your team email         |

## How to Update

1. Update `infra/terraform/environments/*/terraform.tfvars`
2. Update `infra/security/cert-manager/certificates.yaml`
3. Update `infra/istio/` virtual services and gateway
4. Run `grep -r "example.com" infra/` to find all occurrences
