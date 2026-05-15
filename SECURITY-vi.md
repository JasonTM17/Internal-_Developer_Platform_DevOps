# Chính sách Bảo mật

> 🇬🇧 [English version](./SECURITY.md)

## Phiên bản được Hỗ trợ

| Phiên bản | Trạng thái |
| --------- | ---------- |
| 1.x.x     | Hỗ trợ     |
| 0.x.x     | Hỗ trợ     |

## Báo cáo Lỗ hổng Bảo mật

Chúng tôi rất coi trọng vấn đề bảo mật. Nếu bạn phát hiện lỗ hổng, vui lòng báo cáo một cách có trách nhiệm.

### Cách Báo cáo

1. **KHÔNG** tạo GitHub issue công khai cho lỗ hổng bảo mật
2. Báo cáo qua GitHub Security Advisories: https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/security/advisories/new
3. Bao gồm:
   - Mô tả lỗ hổng
   - Các bước tái tạo
   - Đánh giá mức độ ảnh hưởng
   - Đề xuất cách sửa (nếu có)

### Thời gian Phản hồi

| Hành động          | Thời gian                               |
| ------------------ | --------------------------------------- |
| Xác nhận nhận được | Trong vòng 24 giờ                       |
| Đánh giá ban đầu   | Trong vòng 48 giờ                       |
| Phát triển bản sửa | Trong 7 ngày (critical), 30 ngày (high) |
| Công bố công khai  | Sau khi bản sửa được triển khai         |

### Phạm vi

Các vấn đề sau nằm trong phạm vi báo cáo bảo mật:

- Bypass xác thực và phân quyền
- SQL injection, XSS, CSRF
- Thực thi mã từ xa (RCE)
- Leo thang đặc quyền
- Rò rỉ hoặc lộ dữ liệu
- Cấu hình sai hạ tầng
- Lỗ hổng dependency (critical/high)

### Ngoài Phạm vi

- Tấn công từ chối dịch vụ (DoS)
- Social engineering
- Bảo mật vật lý
- Vấn đề ở dịch vụ bên thứ ba mà chúng tôi không kiểm soát

## Các Biện pháp Bảo mật

### Bảo mật Ứng dụng

- TypeScript strict mode, không dùng `any`
- Validate input trên tất cả API endpoints (Zod schemas)
- Database queries có tham số hóa (không nối chuỗi SQL)
- Xác thực JWT với token ngắn hạn
- Phân quyền RBAC theo team
- Rate limiting trên tất cả endpoints
- Hạn chế CORS
- Security headers (CSP, HSTS, X-Frame-Options)

### Bảo mật Hạ tầng

- EKS với Pod Security Standards (restricted)
- Network policies (default deny)
- OPA Gatekeeper cho policy enforcement
- Falco giám sát runtime
- WAF với bộ quy tắc OWASP
- VPC với private subnets cho data layer
- Mã hóa at rest (KMS) và in transit (TLS 1.2+)
- IAM roles với least privilege (IRSA)

### Bảo mật Chuỗi cung ứng

- Dependabot cập nhật tự động
- Quét container image (Trivy)
- Tạo SBOM cho mọi release
- Ký image với cosign
- Hạn chế container registry được phép
- Kiểm tra license compliance

### Quản lý Secrets

- HashiCorp Vault lưu trữ secrets
- External Secrets Operator cho Kubernetes
- Không có secrets trong Git (enforced bởi pre-commit hooks)
- Tự động rotate secrets
- Audit logging cho mọi truy cập secret

### Giám sát & Phát hiện

- Cảnh báo bảo mật qua PagerDuty
- Audit log với hash-chain integrity
- Phát hiện container drift (Falco)
- Quét secrets trong CI (TruffleHog, Gitleaks)
- SAST scanning (CodeQL, SonarQube)

## Compliance

Platform được thiết kế hỗ trợ:

- SOC 2 Type II
- ISO 27001
- GDPR (xử lý dữ liệu)

## Liên hệ Bảo mật

- **Security Team**: Báo cáo qua [GitHub Security Advisories](https://github.com/JasonTM17/Internal_Developer_Platform_DevOps/security/advisories/new)
- **On-call Engineer**: Escalation qua PagerDuty
