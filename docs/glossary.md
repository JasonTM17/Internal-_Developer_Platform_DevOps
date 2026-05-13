# Platform Glossary

## A

**API Gateway**
The entry point for all external API traffic. Handles routing, rate limiting, authentication, and TLS termination.

**ApplicationSet**
An ArgoCD resource that generates multiple Application resources from a template. Used for PR preview environments and multi-cluster deployments.

**ArgoCD**
A declarative GitOps continuous delivery tool for Kubernetes. The platform uses ArgoCD as the single source of truth for all deployments.

---

## B

**Blue/Green Deployment**
A deployment strategy that runs two identical environments (blue and green). Traffic is switched from the current version (blue) to the new version (green) atomically.

**Burn Rate**
The rate at which an error budget is being consumed. A burn rate of 1x means the budget will be exhausted exactly at the end of the SLO window. Higher values indicate faster consumption.

---

## C

**Canary Deployment**
A deployment strategy that gradually shifts traffic from the old version to the new version while monitoring for errors. Allows automatic rollback if metrics degrade.

**Catalog (Service Catalog)**
The registry of all services in the platform. Contains metadata, ownership, dependencies, and health status for every service.

**Change Failure Rate (CFR)**
The percentage of deployments that result in a failure requiring rollback or hotfix. One of the four DORA metrics.

---

## D

**DORA Metrics**
Four key metrics from the DevOps Research and Assessment team: Deployment Frequency, Lead Time for Changes, Change Failure Rate, and Time to Restore Service.

---

## E

**Error Budget**
The allowed amount of unreliability for a service, calculated as `1 - SLO target`. For example, a 99.95% SLO has an error budget of 0.05% (21.6 minutes/month).

**Environment**
An isolated deployment target. Types include: production, staging, development, and preview (ephemeral).

---

## F

**Feature Flag**
A mechanism to enable or disable features at runtime without deploying new code. Used for gradual rollouts, A/B testing, and kill switches.

---

## G

**GitOps**
An operational framework where the desired state of infrastructure and applications is stored in Git. Changes are applied automatically by reconciliation controllers (ArgoCD).

**Golden Signals**
The four key metrics for monitoring any service: Latency, Traffic, Errors, and Saturation (from Google SRE).

---

## H

**Helm Chart**
A package format for Kubernetes applications. Contains templates, values, and metadata for deploying services.

**HPA (Horizontal Pod Autoscaler)**
A Kubernetes resource that automatically scales the number of pod replicas based on observed metrics (CPU, memory, custom metrics).

---

## I

**IDP (Internal Developer Platform)**
A self-service layer that enables developers to deploy, manage, and observe their services without deep infrastructure knowledge.

**Immutable Infrastructure**
Infrastructure that is never modified after deployment. Changes are made by replacing resources entirely rather than updating in place.

---

## K

**Karpenter**
A Kubernetes node autoscaler that provisions right-sized compute resources in response to pending pods. Replaces Cluster Autoscaler.

---

## L

**Lead Time for Changes**
The time from code commit to running in production. One of the four DORA metrics. Platform target: < 1 hour.

---

## M

**mTLS (Mutual TLS)**
A security protocol where both client and server authenticate each other using certificates. Used for service-to-service communication within the mesh.

**MTTR (Mean Time to Recovery)**
The average time from incident detection to service restoration. Platform target: < 30 minutes.

---

## N

**Namespace**
A Kubernetes mechanism for isolating groups of resources within a cluster. Each team/environment gets its own namespace.

---

## O

**OPA (Open Policy Agent)**
A general-purpose policy engine used for admission control, RBAC, and compliance enforcement in Kubernetes.

**OpenTelemetry (OTel)**
A vendor-neutral observability framework for generating, collecting, and exporting telemetry data (traces, metrics, logs).

---

## P

**Platform Engineering**
The discipline of building and maintaining internal platforms that enable developer self-service and reduce cognitive load.

**Postmortem**
A blameless analysis conducted after an incident to identify root causes, contributing factors, and preventive actions.

**Preview Environment**
An ephemeral environment automatically created for each pull request. Destroyed when the PR is merged or closed.

---

## R

**RBAC (Role-Based Access Control)**
An authorization model where permissions are assigned to roles, and roles are assigned to users. Platform roles: admin, platform-engineer, developer, viewer.

**Rolling Update**
A deployment strategy that gradually replaces old pods with new ones, maintaining availability throughout the process.

---

## S

**Sealed Secret**
A Kubernetes Secret encrypted with a public key so it can be safely stored in Git. Only the cluster's sealed-secrets controller can decrypt it.

**Service Level Agreement (SLA)**
A contractual commitment to customers about service reliability. Typically backed by financial penalties.

**Service Level Indicator (SLI)**
A quantitative measure of a specific aspect of service behavior (e.g., request latency, error rate, availability).

**Service Level Objective (SLO)**
A target value for an SLI over a time window (e.g., "99.95% of requests succeed over 30 days").

**Service Mesh**
A dedicated infrastructure layer for handling service-to-service communication. Provides mTLS, traffic management, and observability.

**Service Tier**
A classification that determines SLO targets, on-call requirements, and deployment policies. Tiers: critical, standard, experimental.

---

## T

**Terraform**
An Infrastructure as Code tool that manages cloud resources declaratively. The platform uses Terraform for all AWS infrastructure.

**Toil**
Manual, repetitive, automatable work that scales linearly with service growth. Reducing toil is a core SRE principle.

**TTL (Time to Live)**
The maximum lifetime of an ephemeral resource (e.g., preview environment). After TTL expires, the resource is automatically destroyed.

---

## V

**VPA (Vertical Pod Autoscaler)**
A Kubernetes resource that automatically adjusts CPU and memory requests/limits for pods based on historical usage.

---

## W

**WAF (Web Application Firewall)**
A security layer that filters and monitors HTTP traffic. Protects against common web exploits (SQL injection, XSS, etc.).

---

## Acronyms

| Acronym | Full Form |
|---------|-----------|
| ACM | AWS Certificate Manager |
| ALB | Application Load Balancer |
| CDN | Content Delivery Network |
| CI/CD | Continuous Integration / Continuous Delivery |
| CMK | Customer Managed Key |
| CSI | Container Storage Interface |
| EKS | Elastic Kubernetes Service |
| HPA | Horizontal Pod Autoscaler |
| IAM | Identity and Access Management |
| IaC | Infrastructure as Code |
| IRSA | IAM Roles for Service Accounts |
| KMS | Key Management Service |
| OAC | Origin Access Control |
| OIDC | OpenID Connect |
| OTel | OpenTelemetry |
| PVC | Persistent Volume Claim |
| RDS | Relational Database Service |
| SLI | Service Level Indicator |
| SLO | Service Level Objective |
| SRE | Site Reliability Engineering |
| SSO | Single Sign-On |
| VPC | Virtual Private Cloud |
