# Go QuestX - SaaS AI Chatbot Platform

> Trung tâm tài liệu đặc tả hệ thống và kiến trúc phát triển cho dự án **Go QuestX SaaS**.
> Dành cho đội ngũ phát triển, đặc biệt là vị trí **Backend Engineer / Backend Intern**.

---

## 📌 Mục lục tài liệu

| Tài liệu | Mô tả | Chi tiết |
| :--- | :--- | :--- |
| **[Master Specification](file:///c:/laragon/www/Go/docs/GOQUESTX_MASTER_SPEC.md)** | Toàn bộ BRD, SRS, Luồng hệ thống (User Flows), Use Cases & Tiêu chuẩn nghiệm thu (Acceptance Criteria). | [Xem chi tiết](file:///c:/laragon/www/Go/docs/GOQUESTX_MASTER_SPEC.md) |
| **[BA PRD Feature Catalog](file:///c:/laragon/www/Go/docs/BA_PRD_FEATURE_CATALOG.md)** | Tổng hợp đặc tả 12 phân hệ nghiệp vụ BA: Auto-learning Gaps, Omnichannel, Lead Capture CRM, VietQR IPN, Conversational Commerce, Sentiment Handoff, Broadcast BullMQ, Subscription Lifecycle, E-Invoice, Qdrant Pipeline. | [Xem chi tiết](file:///c:/laragon/www/Go/docs/BA_PRD_FEATURE_CATALOG.md) |
| **[API Specification Analysis](file:///c:/laragon/www/Go/docs/API_SPECIFICATION_ANALYSIS.md)** | Phân tích toàn bộ 65+ API Endpoints thực tế (OAS 3.0), cách sửa lỗi Swagger Resolver và giải mã các module nâng cao (SSE Stream, Handoff SLA, E-commerce Crawler, VNPay). | [Xem chi tiết](file:///c:/laragon/www/Go/docs/API_SPECIFICATION_ANALYSIS.md) |
| **[Backend Intern Handbook](file:///c:/laragon/www/Go/docs/BACKEND_INTERN_GUIDE.md)** | Cẩm nang Backend: Thiết kế Schema MongoDB, Quy chuẩn Multi-tenant (Data Isolation), Danh sách API cần triển khai, Tích hợp AI RAG Service & Checklists kiểm thử. | [Xem chi tiết](file:///c:/laragon/www/Go/docs/BACKEND_INTERN_GUIDE.md) |

---

## 🏗️ Tổng quan kiến trúc Go QuestX

```
+-----------------------------------------------------------------------------------+
|                                 GO QUESTX SAAS                                    |
+-----------------------------------------------------------------------------------+
                                          |
          +-------------------------------+-------------------------------+
          |                               |                               |
    [Admin Web]                     [Client Web]                  [Chatbot Widget]
 (Super Admin Portal)            (Tenant Dashboard)            (Embedded JS/Iframe)
          |                               |                               |
          +-------------------------------+-------------------------------+
                                          |
                                    (REST / JWT)
                                          v
                    +-------------------------------------------+
                    |          MAIN BACKEND (Node.js)           |
                    |  - Auth & RBAC (Admin, Tenant, Staff)     |
                    |  - Multi-tenant Isolation (clientId)     |
                    |  - Subscription & Quota Limits            |
                    |  - Profanity Filter & Chat Logging        |
                    |  - File Upload & Webhook Handler          |
                    +-------------------------------------------+
                             |                     |
                   (CRUD / Mongoose)         (HTTP Webhook)
                             v                     v
                     +---------------+   +-----------------------------+
                     |    MongoDB    |   |     AI BACKEND (Python)     |
                     |  - Admins     |   |       FastAPI + RAG         |
                     |  - Clients    |   +-----------------------------+
                     |  - Plans      |                 |
                     |  - Users      |        +--------+--------+
                     |  - Chats      |        v                 v
                     |  - Customers  |   +----------+     +------------+
                     +---------------+   | ChromaDB |     | OpenAI/LLM |
                                         | (Vector) |     +------------+
                                         +----------+
```

---

## 🚀 Vai trò và nhiệm vụ cốt lõi của Backend Intern

1. **Multi-tenant Data Isolation (Bắt buộc):**
   - Mọi bản ghi dữ liệu (Users, Chats, Customers, KnowledgeFiles) bắt buộc phải có `clientId`.
   - Mọi câu truy vấn (Find, Update, Delete) bắt buộc phải kèm điều kiện `clientId` từ Token/Context, ngăn chặn tuyệt đối rò rỉ dữ liệu chéo giữa các doanh nghiệp.
2. **Subscription & Resource Limiting:**
   - Kiểm tra `max_users` khi Client tạo nhân viên mới.
   - Kiểm tra `max_files` và dung lượng khi Client upload tài liệu huấn luyện bot.
   - Kiểm tra ngày hết hạn `subscription_plan_end`.
3. **Widget Public Gateway:**
   - API lấy cấu hình giao diện bot theo `clientId`.
   - API kiểm tra và lọc từ ngữ tục tĩu (Profanity Filter).
   - API lưu trữ Leads khách hàng tiềm năng (`Customer`).
   - Quản lý phiên chat `session_id` và lưu vết hội thoại `messages`.
4. **Tích hợp AI RAG Service:**
   - Điều phối luồng Ingestion (gọi FastAPI qua webhook kèm `clientId`).
   - Cập nhật trạng thái huấn luyện file (`pending`, `processing`, `completed`, `failed`).
