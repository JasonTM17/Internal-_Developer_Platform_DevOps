# Hướng Dẫn Vận Hành / Operations Guide

> Tài liệu song ngữ Tiếng Việt - English

---

## Tổng Quan / Overview

**Tiếng Việt:** Tài liệu này mô tả quy trình vận hành hàng ngày của Internal Developer Platform, bao gồm giám sát, xử lý sự cố, và bảo trì hệ thống.

**English:** This document describes the day-to-day operational procedures for the Internal Developer Platform, including monitoring, incident handling, and system maintenance.

---

## Giám Sát Hệ Thống / System Monitoring

### Dashboard Chính / Primary Dashboards

| Dashboard          | URL                                         | Mục đích / Purpose                                        |
| ------------------ | ------------------------------------------- | --------------------------------------------------------- |
| Platform Overview  | `http://localhost:3001/d/platform-overview` | Tổng quan sức khỏe hệ thống / System health overview      |
| API Performance    | `http://localhost:3001/d/api-performance`   | Latency, throughput, error rate                           |
| Deployment Metrics | `http://localhost:3001/d/deployments`       | Tần suất và tỷ lệ thành công / Frequency and success rate |
| Infrastructure     | `http://localhost:3001/d/infrastructure`    | CPU, memory, disk, network                                |
| SLO Burn Rate      | `http://localhost:3001/d/slo-overview`      | Error budget consumption                                  |

![Grafana Dashboard](../assets/screenshots/11-grafana-dashboard.png)

### Prometheus Targets

**Tiếng Việt:** Prometheus thu thập metrics từ tất cả các service thông qua service discovery. Kiểm tra trạng thái targets tại Prometheus UI.

**English:** Prometheus collects metrics from all services via service discovery. Check target status at the Prometheus UI.

![Prometheus Targets](../assets/screenshots/12-prometheus-targets.png)

### Cảnh Báo / Alerting Rules

| Cảnh báo / Alert    | Ngưỡng / Threshold                   | Hành động / Action                                               |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| API High Error Rate | > 5% trong 5 phút / for 5 min        | Kiểm tra logs, rollback nếu cần / Check logs, rollback if needed |
| API High Latency    | p99 > 2s trong 10 phút / for 10 min  | Kiểm tra DB queries, scale pods / Check DB queries, scale pods   |
| Pod CrashLooping    | > 3 restarts trong 5 phút / in 5 min | Kiểm tra logs, resource limits / Check logs, resource limits     |
| Disk Usage High     | > 80%                                | Dọn dẹp logs, mở rộng volume / Clean logs, expand volume         |
| Certificate Expiry  | < 7 ngày / days                      | Chạy cert rotation runbook / Run cert rotation runbook           |

---

## Quy Trình Triển Khai / Deployment Procedures

### Triển Khai Tự Động / Automated Deployment

```
Developer Push → CI Pipeline → Build Image → Push to GHCR
                                                    ↓
                                          ArgoCD detects change
                                                    ↓
                                          Canary deployment (10%)
                                                    ↓
                                          Flagger analysis (5 min)
                                                    ↓
                                    ┌───────────────┴───────────────┐
                                    ↓                               ↓
                              Metrics OK                      Metrics BAD
                                    ↓                               ↓
                          Progressive rollout              Automatic rollback
                          (10% → 30% → 60% → 100%)       (restore previous)
```

### Kiểm Tra Trước Triển Khai / Pre-Deployment Checklist

- [ ] CI pipeline xanh / CI pipeline green
- [ ] Security scan không có critical/high / No critical/high vulnerabilities
- [ ] Integration tests pass trên staging / Integration tests pass on staging
- [ ] Database migration đã test / Database migration tested
- [ ] Rollback plan đã chuẩn bị / Rollback plan prepared
- [ ] Thông báo team / Team notified

### Rollback Nhanh / Quick Rollback

```bash
# Via ArgoCD (khuyến nghị / recommended)
argocd app rollback idp-api-production

# Via kubectl (khẩn cấp / emergency)
kubectl rollout undo deployment/idp-api -n idp-production

# Via Helm
helm rollback idp-api -n idp-production
```

---

## Xử Lý Sự Cố / Incident Response

### Quy Trình / Process

```
1. Phát hiện / Detect     → Alert fires hoặc user report
2. Phân loại / Triage     → Xác định severity (P1-P4)
3. Thông báo / Notify     → Cập nhật Slack #incidents
4. Điều tra / Investigate → Kiểm tra logs, metrics, traces
5. Khắc phục / Mitigate   → Rollback, scale, hoặc hotfix
6. Giải quyết / Resolve   → Xác nhận service recovered
7. Postmortem             → Blameless review trong 48h
```

### Công Cụ Điều Tra / Investigation Tools

```bash
# Kiểm tra pod status / Check pod status
kubectl get pods -n idp-production -l app=idp-api

# Xem logs gần đây / View recent logs
kubectl logs -n idp-production -l app=idp-api --tail=100 --since=5m

# Kiểm tra events / Check events
kubectl get events -n idp-production --sort-by='.lastTimestamp' | tail -20

# Kiểm tra resource usage / Check resource usage
kubectl top pods -n idp-production

# Truy vấn Prometheus / Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])'
```

---

## Bảo Trì Định Kỳ / Scheduled Maintenance

### Hàng Ngày / Daily

- [ ] Kiểm tra Grafana dashboards / Review Grafana dashboards
- [ ] Xem xét alerts đã fire / Review fired alerts
- [ ] Kiểm tra error budget / Check error budget consumption

### Hàng Tuần / Weekly

- [ ] Review Dependabot PRs
- [ ] Kiểm tra disk usage / Check disk usage across nodes
- [ ] Xem xét slow queries / Review slow query logs
- [ ] Cập nhật documentation nếu cần / Update docs if needed

### Hàng Tháng / Monthly

- [ ] Certificate rotation check
- [ ] Security scan toàn diện / Comprehensive security scan
- [ ] Capacity planning review
- [ ] Cost optimization review
- [ ] SLO target review
- [ ] Chaos engineering game day

---

## Scaling Guide

### Horizontal Pod Autoscaler

```yaml
# Cấu hình HPA / HPA Configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: idp-api
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Ngưỡng Scaling / Scaling Thresholds

| Metric       | Scale Up       | Scale Down    | Cooldown |
| ------------ | -------------- | ------------- | -------- |
| CPU          | > 70%          | < 30%         | 3 min    |
| Memory       | > 80%          | < 40%         | 5 min    |
| Request Rate | > 1000 rps/pod | < 200 rps/pod | 5 min    |
| Queue Depth  | > 100 jobs     | < 10 jobs     | 3 min    |

---

## Liên Hệ / Contacts

| Vai trò / Role   | Kênh / Channel              | Thời gian / Hours |
| ---------------- | --------------------------- | ----------------- |
| Platform On-Call | PagerDuty                   | 24/7              |
| Platform Team    | Slack #platform-engineering | Business hours    |
| Security Team    | Slack #security             | Business hours    |
| SRE Team         | Slack #sre                  | 24/7              |

---

## Tài Liệu Liên Quan / Related Documentation

- [Runbooks](../runbooks/) — Quy trình xử lý chi tiết / Detailed procedures
- [SLO Definitions](../slo/) — Mục tiêu độ tin cậy / Reliability targets
- [Architecture](../architecture/) — Kiến trúc hệ thống / System architecture
- [Monitoring Config](../../infra/monitoring/) — Cấu hình giám sát / Monitoring configuration
