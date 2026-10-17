# HomeNest QuestX SaaS Backend - API Specification & In-Depth Analysis

> **Phiên bản:** OAS 3.0 / HomeNest QuestX SaaS Backend 1.0.0  
> **Ngôn ngữ:** Tiếng Việt  
> **Phạm vi:** Tài liệu hóa đầy đủ các API Endpoints, phân tích luồng dữ liệu kỹ thuật, chẩn đoán lỗi Swagger hiện tại và cẩm nang triển khai cho Backend Developer / Intern.

---

## ⚠️ 1. Chẩn đoán & Khắc phục lỗi Swagger (Resolver Error)

Khi mở Swagger UI hiện tại, hệ thống báo 2 lỗi:
```
Resolver error at paths./admin-api/auth/refresh-token.post.responses.200.content.application/json.schema.properties.admin.$ref
Could not resolve reference: Could not resolve pointer: /components/schemas/Admin does not exist in document

Resolver error at paths./api/refresh-token.post.responses.200.content.application/json.schema.properties.admin.$ref
Could not resolve reference: Could not resolve pointer: /components/schemas/Admin does not exist in document
```

### Nguyên nhân:
Trong comment JSDoc / Swagger config của 2 endpoint `/admin-api/auth/refresh-token` và `/api/refresh-token`, schema response đang gọi tới:
`$ref: '#/components/schemas/Admin'`, nhưng trong phần cấu hình `components.schemas` của OpenAPI document chưa khai báo định nghĩa model `Admin`.

### Cách sửa trong code Node.js (swagger options / JSDoc):
Thêm schema `Admin` vào swagger definition:
```javascript
/**
 * @openapi
 * components:
 *   schemas:
 *     Admin:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           example: admin_homenest
 *         name:
 *           type: string
 *           example: Quản trị viên HomeNest
 *         role:
 *           type: string
 *           example: superadmin
 *         avatar:
 *           type: string
 *           example: https://example.com/avatar.png
 */
```
*(Nếu bạn được Mentor giao fix bug Swagger UI, hãy áp dụng đoạn fix trên là Swagger sẽ hết lỗi ngay lập tức).*

---

## 🗺️ 2. Phân Tích 11 Phân Hệ API Thực Tế Của Dự Án

Hệ thống Backend thực tế của Go QuestX rộng hơn BRD ban đầu rất nhiều, bao gồm các module nâng cao:

| Phân hệ (Tag) | Tiền tố Router | Mô tả nghiệp vụ cốt lõi |
| :--- | :--- | :--- |
| **1. Xác thực Admin** | `/admin-api/auth` | Đăng ký, đăng nhập, cấp refresh token cho Super Admin Homenest. |
| **2. Quản lý Admin** | `/admin-api` | Quản trị Client (CRUD, kích hoạt/tạm dừng, sync), gói dịch vụ (Plans), duyệt đăng ký doanh nghiệp, ticket hỗ trợ và dashboard thống kê. |
| **3. Hội thoại & Chat** | `/api/client`, `/api/chat` | Quản lý hội thoại, tiếp nhận ca chat (SLA Human Handoff), chuyển đổi chế độ Bot <-> Nhân viên, lưu trữ và xóa hội thoại. |
| **4. Quản lý Tập tin Client** | `/api/client-file` | Upload nhiều tài liệu (.txt, .pdf, .doc, .docx - tối đa 10 file/5MB), xóa tệp và đồng bộ hóa ChromaDB, retrain tài liệu. |
| **5. Proxy Chat Khách hàng** | `/api/customer` | Cổng kết nối từ Chat Widget: Lead Capture, Chat SSE Stream kèm confidence score, Text-To-Speech (TTS), Handoff request. |
| **6. Tải lên S3** | `/api/upload` | Cấp S3 Presigned URL để upload file trực tiếp lên cloud storage. |
| **7. Tài khoản & Cấu hình** | `/api`, `/api/client` | Đăng nhập/quên/đổi mật khẩu, quản lý nhân viên (Employees), cấu hình AI provider, API key, Dashboard thống kê. |
| **8. Thông tin Công khai** | `/public/client` | Lấy cấu hình Widget, tự động đăng ký/hủy kích hoạt Client từ WordPress Plugin. |
| **9. Third Party (Mạng xã hội)**| `/api/third-party` | Kết nối OAuth Facebook Page & Instagram (Connect, Disconnect, Reconnect). |
| **10. Quản lý Sản phẩm** | `/api/client/products` | Quản lý sản phẩm E-commerce, trạng thái (Draft, Active, Hidden) và **Bộ cào dữ liệu tự động (Web Crawler Background Job)**. |
| **11. Đặt lịch & Thanh toán** | `/api/billing` | Tích hợp cổng thanh toán VNPay (Tạo URL thanh toán, tính phí nâng cấp gói và xử lý IPN Webhook callback). |

---

## 🔍 3. Chi Tiết Các Module "Đinh" Cần Nắm Chắc (Kèm Luồng Kỹ Thuật)

### 3.1. Phân hệ Chat: Human Handoff & Optimistic Lock (Chống tranh chấp ca chat)
Dự án có cơ chế **Hybrid Support** (kết hợp Bot AI và Nhân viên tư vấn):
- `POST /api/customer/chat/request-handoff`: Khách bấm nút "Gặp tư vấn viên" từ Widget -> Trạng thái phiên chuyển sang chờ nhân viên.
- `POST /api/client/chat/take-session`:
  - Nhân viên bấm "Nhận ca chat".
  - **Kỹ thuật Backend:** Áp dụng **Optimistic Locking** (Khóa lạc quan) trong MongoDB. Nếu 2 nhân viên cùng bấm nhận 1 lúc, người thứ hai sẽ nhận HTTP **409 Conflict** ("Phiên chat đã được tiếp nhận bởi nhân viên khác").
  - `chatMode` chuyển thành `human_handling`.
- `POST /api/client/reply`: Nhân viên chat trực tiếp với khách (không qua AI).
- `POST /api/client/chat/resolve-session`: Nhân viên xử lý xong -> Chuyển `chatMode` về lại `bot` để AI tiếp quản.

### 3.2. Chat Proxy Stream với SSE (Server-Sent Events) & Confidence Scoring
- Endpoint: `POST /api/customer/chat-proxy-stream`
- **Cơ chế hoạt động:**
  1. Widget gửi tin nhắn của khách hàng.
  2. Backend thiết lập HTTP Response Headers: `Content-Type: text/event-stream; Cache-Control: no-cache; Connection: keep-alive`.
  3. Stream từng token trả về từ AI Backend sang Client để hiển thị hiệu ứng gõ phím mượt mà.
  4. Lắng nghe sự kiện `reasoning`: chứa điểm tin cậy (**confidence score**).
  5. Backend tự động tính toán và lưu `successRate` và tăng `totalBotMessage` của cuộc hội thoại vào MongoDB.

### 3.3. Text-To-Speech (TTS) với Google Cloud TTS
- Endpoint: `POST /api/customer/tts`
- Request: `{ "clientId": "HN-0001", "text": "Xin chào...", "provider": "cloud", "lang": "vi-VN" }`
- Response: Stream nhị phân âm thanh `audio/mpeg` hoặc `audio/wav`.
- Backend gọi Google Cloud Text-to-Speech API hoặc cache các đoạn âm thanh phổ biến để tiết kiệm chi phí.

### 3.4. Quản lý Sản phẩm & Trình Cào Dữ Liệu (E-commerce Web Crawler)
- `POST /api/client/products/crawl`:
  - Request: `{ "sourceUrl": "https://shophoatuoi.com/danh-muc/hoa-khai-truong" }`
  - Response: HTTP **202 Accepted** ("Đã bắt đầu tiến trình cào dữ liệu").
  - **Kỹ thuật Backend:** Chạy Background Worker / Queue (BullMQ, Celery hoặc worker_threads). Cào tên, giá, hình ảnh sản phẩm rồi lưu vào `products`.
- `GET /api/client/products/crawl-jobs`: Kiểm tra tiến độ và lịch sử các jobs cào dữ liệu.

### 3.5. Cổng Thanh Toán VNPay & Quản Lý Gói Dịch Vụ
- `POST /api/billing/subscribe/detail`: Tính toán số tiền chênh lệch khi đổi gói, nâng cấp hoặc gia hạn (prorated billing).
- `POST /api/billing/subscribe`: Tạo mã đơn hàng, tạo URL Redirect sang cổng thanh toán VNPay với checksum SHA512.
- `GET /api/billing/vnpay-ipn`:
  - Server-to-server callback từ VNPay.
  - Xác thực chữ ký `vnp_SecureHash`.
  - Cập nhật hạn dùng `subscription_plan_end` cho Client, trả về mã `{ RspCode: '00', Message: 'Confirm Success' }`.

---

## 📑 4. Tổng Hợp Đầy Đủ 65+ API Endpoints Theo Nhóm

```
├── [Admin Auth]
│   ├── POST   /admin-api/auth/register
│   ├── POST   /admin-api/auth/login
│   └── POST   /admin-api/auth/refresh-token
│
├── [Admin Management]
│   ├── POST   /admin-api/clients/sync
│   ├── GET    /admin-api/clients
│   ├── POST   /admin-api/clients
│   ├── GET    /admin-api/clients/{clientId}
│   ├── PUT    /admin-api/clients/{clientId}
│   ├── DELETE /admin-api/clients/{clientId}
│   ├── POST   /admin-api/clients/reactivate
│   ├── POST   /admin-api/clients/deactivate
│   ├── GET    /admin-api/plans
│   ├── POST   /admin-api/plans
│   ├── PUT    /admin-api/plans/{id}
│   ├── DELETE /admin-api/plans/{id}
│   ├── GET    /admin-api/support-tickets
│   ├── GET    /admin-api/support-tickets/{ticketId}
│   ├── POST   /admin-api/support-tickets/{ticketId}/reply
│   ├── POST   /admin-api/support-tickets/{ticketId}/close
│   ├── POST   /admin-api/support-tickets/{ticketId}/open
│   ├── GET    /admin-api/client-registrations
│   ├── GET    /admin-api/client-registrations/{id}
│   ├── POST   /admin-api/client-registrations/{id}/approve
│   ├── POST   /admin-api/client-registrations/{id}/reject
│   ├── GET    /admin-api/dashboard
│   └── GET    /admin-api/client-files
│
├── [Client Files / Knowledge Ingestion]
│   ├── GET    /api/client-file/files
│   ├── POST   /api/client-file/upload
│   ├── DELETE /api/client-file
│   ├── POST   /api/client-file/{id}/retrain
│   └── PUT    /api/client-file/{id}
│
├── [Customer Widget Proxy]
│   ├── POST   /api/customer/lead-capture
│   ├── POST   /api/customer/train-proxy
│   ├── POST   /api/customer/chat-proxy-stream
│   ├── POST   /api/customer/tts
│   └── POST   /api/customer/chat/request-handoff
│
├── [Conversations & Chat Management]
│   ├── POST   /api/client/reply
│   ├── POST   /api/client/chat/take-session
│   ├── POST   /api/client/chat/resolve-session
│   ├── GET    /api/chat/conversations/{userId}
│   ├── GET    /api/chat/{clientId}/{userId}
│   ├── POST   /api/client/switch-chat-mode
│   ├── GET    /api/client/conversations
│   ├── PUT    /api/client/conversations/{customerId}/save
│   ├── PUT    /api/client/conversations/{customerId}/delete
│   └── DELETE /api/client/conversations/{customerId}
│
├── [Client Account & Config]
│   ├── POST   /api/login
│   ├── POST   /api/refresh-token
│   ├── POST   /api/change-password
│   ├── POST   /api/forgot-password
│   ├── POST   /api/reset-password
│   ├── POST   /api/client/reactivate
│   ├── POST   /api/client/create-employee
│   ├── GET    /api/client/employees
│   ├── GET    /api/client/employees/{userId}
│   ├── PUT    /api/client/employees/{userId}
│   ├── DELETE /api/client/employees/{userId}
│   ├── POST   /api/client/support
│   ├── POST   /api/client/ai-provider
│   ├── POST   /api/client/api-key
│   ├── GET    /api/client/me
│   ├── PUT    /api/client/me
│   ├── GET    /api/client/dashboard/today
│   ├── GET    /api/client/dashboard/stats-graph
│   ├── GET    /api/client/support-tickets
│   ├── GET    /api/client/support-tickets/{ticketId}
│   ├── POST   /api/client/support-tickets/{ticketId}/reply
│   ├── POST   /api/client/register-client
│   ├── GET    /api/client/customer-data
│   └── GET    /api/client/plans
│
├── [Public Widget & WordPress]
│   ├── GET    /public/client/{clientId}
│   ├── POST   /public/client/register-wp-site
│   └── POST   /public/client/unregister-wp-site
│
├── [Third-Party Integrations]
│   ├── GET    /api/third-party/facebook/connect
│   ├── POST   /api/third-party/facebook/disconnect
│   ├── POST   /api/third-party/facebook/reconnect
│   ├── GET    /api/third-party/instagram/connect
│   ├── POST   /api/third-party/instagram/disconnect
│   └── POST   /api/third-party/instagram/reconnect
│
├── [E-commerce Product Management & Web Scraper]
│   ├── GET    /api/client/products
│   ├── POST   /api/client/products
│   ├── PUT    /api/client/products/{id}
│   ├── GET    /api/client/products/{id}
│   ├── PATCH  /api/client/products/{id}/status
│   ├── POST   /api/client/products/crawl
│   └── GET    /api/client/products/crawl-jobs
│
└── [Billing & VNPay]
    ├── GET    /api/billing/vnpay-ipn
    ├── POST   /api/billing/subscribe/detail
    └── POST   /api/billing/subscribe
```

---

## 🎯 5. Bản Đồ Kỹ Năng & Tình Huống Mentor Hay Giao Cho Intern

Nếu Mentor giao task, thường sẽ thuộc các nhóm sau:

1. **Nhóm Task "Sửa lỗi Swagger / Tài liệu hóa":**
   - Thêm Schema cho `Admin` để fix 2 lỗi pointer resolver.
   - Thêm Swagger tags/JSDoc cho các router mới tạo.
2. **Nhóm Task "CRUD & Phân Quyền Nhân Sự":**
   - Viết API `/api/client/create-employee`, check quota `max_users`.
   - Viết tính năng phân trang (`page`, `limit`) cho `/api/client/employees`.
3. **Nhóm Task "Xử lý File & AI Sync":**
   - Cấu hình Multer upload tối đa 10 file, giới hạn 5MB/file tại `/api/client-file/upload`.
   - Viết logic gọi sang ChromaDB/Python AI khi xoá file tại `DELETE /api/client-file`.
4. **Nhóm Task "Hội Thoại & Handoff":**
   - Xử lý Optimistic Lock cho API `/api/client/chat/take-session` (dùng `findOneAndUpdate({ _id: customerId, chatMode: 'bot' })`).
   - Xử lý Export CSV dữ liệu khách hàng `/api/client/customer-data`.
5. **Nhóm Task "E-commerce & Crawler":**
   - Viết logic crawl dữ liệu sản phẩm từ URL sử dụng `cheerio` hoặc `puppeteer` tại `/api/client/products/crawl`.
