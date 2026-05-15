# Bảng Thuật ngữ DevOps & Platform Engineering

> 🇬🇧 [English version](./glossary.md)

Bảng thuật ngữ Anh-Việt dành cho developer Việt Nam tiếp cận DevOps và Platform Engineering.

---

## A

| Thuật ngữ        | Tiếng Việt      | Giải thích                                                          |
| ---------------- | --------------- | ------------------------------------------------------------------- |
| **API Gateway**  | Cổng API        | Điểm vào duy nhất cho tất cả request từ client đến backend services |
| **Artifact**     | Sản phẩm build  | File output sau quá trình build (Docker image, JAR, binary...)      |
| **Auto-scaling** | Tự động mở rộng | Tự động tăng/giảm tài nguyên dựa trên tải                           |
| **Availability** | Tính sẵn sàng   | Khả năng hệ thống hoạt động liên tục (thường đo bằng %)             |

## B

| Thuật ngữ                 | Tiếng Việt          | Giải thích                                                                  |
| ------------------------- | ------------------- | --------------------------------------------------------------------------- |
| **Blue-Green Deployment** | Triển khai xanh-lục | Chiến lược deploy dùng 2 môi trường giống nhau, chuyển traffic khi sẵn sàng |
| **Build Pipeline**        | Pipeline build      | Chuỗi bước tự động: compile → test → package → publish                      |
| **Backoff (Exponential)** | Chờ lũy thừa        | Tăng thời gian chờ giữa các lần retry theo cấp số nhân                      |

## C

| Thuật ngữ             | Tiếng Việt                      | Giải thích                                                       |
| --------------------- | ------------------------------- | ---------------------------------------------------------------- |
| **Canary Deployment** | Triển khai canary               | Đưa phiên bản mới cho % nhỏ user trước, theo dõi rồi mở rộng dần |
| **CI/CD**             | Tích hợp/Triển khai liên tục    | Continuous Integration / Continuous Deployment                   |
| **Circuit Breaker**   | Cầu dao ngắt mạch               | Pattern ngắt kết nối đến service lỗi để tránh cascading failure  |
| **Container**         | Container                       | Đơn vị đóng gói ứng dụng + dependencies, chạy cách ly            |
| **CORS**              | Chia sẻ tài nguyên cross-origin | Cơ chế cho phép request từ domain khác                           |

## D

| Thuật ngữ      | Tiếng Việt    | Giải thích                                                |
| -------------- | ------------- | --------------------------------------------------------- |
| **Deployment** | Triển khai    | Quá trình đưa code mới lên môi trường chạy                |
| **Drift**      | Trôi cấu hình | Khi trạng thái thực tế khác với trạng thái khai báo (IaC) |
| **DRY**        | Không lặp lại | Don't Repeat Yourself — nguyên tắc tránh code trùng lặp   |

## E

| Thuật ngữ        | Tiếng Việt    | Giải thích                                           |
| ---------------- | ------------- | ---------------------------------------------------- |
| **Environment**  | Môi trường    | Nơi ứng dụng chạy (dev, staging, production)         |
| **Error Budget** | Ngân sách lỗi | Lượng downtime/lỗi cho phép trước khi vi phạm SLO    |
| **Event-Driven** | Hướng sự kiện | Kiến trúc giao tiếp qua events thay vì gọi trực tiếp |

## G

| Thuật ngữ             | Tiếng Việt    | Giải thích                                                      |
| --------------------- | ------------- | --------------------------------------------------------------- |
| **GitOps**            | GitOps        | Quản lý hạ tầng/deploy thông qua Git làm nguồn sự thật duy nhất |
| **Graceful Shutdown** | Tắt nhẹ nhàng | Dừng service sau khi xử lý xong request đang chạy               |

## H

| Thuật ngữ              | Tiếng Việt        | Giải thích                                              |
| ---------------------- | ----------------- | ------------------------------------------------------- |
| **Health Check**       | Kiểm tra sức khỏe | Endpoint để xác nhận service đang hoạt động bình thường |
| **Helm**               | Helm              | Package manager cho Kubernetes (quản lý charts)         |
| **Horizontal Scaling** | Mở rộng ngang     | Thêm nhiều instance thay vì nâng cấp máy hiện tại       |
| **Hot Reload**         | Tải lại nóng      | Cập nhật code mà không cần restart service              |

## I

| Thuật ngữ      | Tiếng Việt           | Giải thích                                                     |
| -------------- | -------------------- | -------------------------------------------------------------- |
| **IaC**        | Hạ tầng dưới dạng mã | Infrastructure as Code — quản lý hạ tầng bằng code (Terraform) |
| **Idempotent** | Lũy đẳng             | Thực hiện nhiều lần cho cùng kết quả như 1 lần                 |
| **Ingress**    | Ingress              | Điểm vào traffic từ bên ngoài vào cluster Kubernetes           |
| **Incident**   | Sự cố                | Sự kiện ảnh hưởng đến service, cần xử lý khẩn cấp              |

## K

| Thuật ngữ            | Tiếng Việt | Giải thích                                |
| -------------------- | ---------- | ----------------------------------------- |
| **Kubernetes (K8s)** | Kubernetes | Hệ thống điều phối container ở quy mô lớn |

## L

| Thuật ngữ          | Tiếng Việt    | Giải thích                                         |
| ------------------ | ------------- | -------------------------------------------------- |
| **Latency**        | Độ trễ        | Thời gian từ khi gửi request đến khi nhận response |
| **Load Balancer**  | Cân bằng tải  | Phân phối traffic đều giữa các instance            |
| **Liveness Probe** | Kiểm tra sống | K8s probe xác nhận container còn chạy              |

## M

| Thuật ngữ        | Tiếng Việt    | Giải thích                                             |
| ---------------- | ------------- | ------------------------------------------------------ |
| **Microservice** | Vi dịch vụ    | Kiến trúc chia ứng dụng thành các service nhỏ, độc lập |
| **Monorepo**     | Monorepo      | Một repository chứa nhiều project/package              |
| **mTLS**         | TLS hai chiều | Mutual TLS — cả client và server đều xác thực lẫn nhau |

## N

| Thuật ngữ     | Tiếng Việt     | Giải thích                                        |
| ------------- | -------------- | ------------------------------------------------- |
| **Namespace** | Không gian tên | Phân vùng logic trong K8s để cách ly tài nguyên   |
| **Node**      | Node           | Máy chủ (vật lý hoặc VM) trong cluster Kubernetes |

## O

| Thuật ngữ         | Tiếng Việt        | Giải thích                                                  |
| ----------------- | ----------------- | ----------------------------------------------------------- |
| **Observability** | Khả năng quan sát | Khả năng hiểu trạng thái hệ thống qua metrics, logs, traces |
| **On-call**       | Trực ca           | Kỹ sư chịu trách nhiệm xử lý sự cố ngoài giờ                |
| **Orchestration** | Điều phối         | Quản lý vòng đời container (scheduling, scaling, healing)   |

## P

| Thuật ngữ             | Tiếng Việt       | Giải thích                                              |
| --------------------- | ---------------- | ------------------------------------------------------- |
| **Pod**               | Pod              | Đơn vị nhỏ nhất trong K8s, chứa 1+ containers           |
| **Provisioning**      | Cung cấp hạ tầng | Tạo và cấu hình tài nguyên hạ tầng (VM, DB, network...) |
| **Pull Request (PR)** | Yêu cầu merge    | Đề xuất thay đổi code để review trước khi merge         |

## R

| Thuật ngữ           | Tiếng Việt              | Giải thích                                         |
| ------------------- | ----------------------- | -------------------------------------------------- |
| **Rate Limiting**   | Giới hạn tốc độ         | Hạn chế số request trong khoảng thời gian          |
| **RBAC**            | Phân quyền theo vai trò | Role-Based Access Control                          |
| **Readiness Probe** | Kiểm tra sẵn sàng       | K8s probe xác nhận container sẵn sàng nhận traffic |
| **Replica**         | Bản sao                 | Instance copy của một service/pod                  |
| **Rollback**        | Quay lại                | Khôi phục phiên bản trước khi deploy lỗi           |
| **Runbook**         | Sổ tay vận hành         | Hướng dẫn từng bước xử lý sự cố cụ thể             |

## S

| Thuật ngữ        | Tiếng Việt                   | Giải thích                                                |
| ---------------- | ---------------------------- | --------------------------------------------------------- |
| **SBOM**         | Danh mục thành phần phần mềm | Software Bill of Materials — liệt kê dependencies         |
| **Secret**       | Bí mật                       | Thông tin nhạy cảm (password, API key, certificate)       |
| **Service Mesh** | Lưới dịch vụ                 | Layer hạ tầng quản lý giao tiếp giữa services (Istio)     |
| **SLA**          | Cam kết mức dịch vụ          | Service Level Agreement — hợp đồng với khách hàng         |
| **SLI**          | Chỉ số mức dịch vụ           | Service Level Indicator — metric đo lường thực tế         |
| **SLO**          | Mục tiêu mức dịch vụ         | Service Level Objective — mục tiêu nội bộ                 |
| **Staging**      | Môi trường staging           | Môi trường giống production để test trước khi deploy thật |

## T

| Thuật ngữ      | Tiếng Việt        | Giải thích                                              |
| -------------- | ----------------- | ------------------------------------------------------- |
| **Terraform**  | Terraform         | Công cụ IaC phổ biến nhất, dùng HCL để khai báo hạ tầng |
| **Throughput** | Thông lượng       | Số request xử lý được trong 1 đơn vị thời gian          |
| **Toil**       | Công việc lặp lại | Việc thủ công, lặp đi lặp lại, có thể tự động hóa       |
| **Tracing**    | Truy vết          | Theo dõi request xuyên suốt nhiều services              |

## V

| Thuật ngữ         | Tiếng Việt      | Giải thích                                      |
| ----------------- | --------------- | ----------------------------------------------- |
| **VPC**           | Mạng riêng ảo   | Virtual Private Cloud — mạng cách ly trên cloud |
| **Vulnerability** | Lỗ hổng bảo mật | Điểm yếu có thể bị khai thác                    |

## W

| Thuật ngữ   | Tiếng Việt             | Giải thích                                           |
| ----------- | ---------------------- | ---------------------------------------------------- |
| **WAF**     | Tường lửa ứng dụng web | Web Application Firewall — lọc traffic độc hại       |
| **Webhook** | Webhook                | HTTP callback tự động khi có sự kiện xảy ra          |
| **Worker**  | Worker                 | Process/container xử lý tác vụ nền (background jobs) |

---

## Mẹo cho Developer Việt Nam

- Không cần dịch tất cả thuật ngữ — nhiều từ giữ nguyên tiếng Anh sẽ dễ hiểu hơn (Kubernetes, Docker, Helm...)
- Khi viết tài liệu nội bộ, ưu tiên dùng thuật ngữ gốc + giải thích ngắn bằng tiếng Việt
- Tham khảo thêm: [CNCF Glossary](https://glossary.cncf.io/) cho định nghĩa chuẩn ngành
