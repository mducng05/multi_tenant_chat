# Go QuestX - Cẩm Nang Dành Cho Backend Intern

> Tài liệu hướng dẫn thực chiến dành riêng cho **Backend Intern** trong dự án **Go QuestX SaaS**.  
> Giúp bạn nắm bắt kiến trúc, chuẩn mực viết code, danh sách API, luồng xử lý và sẵn sàng tiếp nhận mọi task từ Mentor.

---

## 🧭 1. Tóm tắt nhanh vai trò của Backend trong Go QuestX

Go QuestX là hệ thống **B2B SaaS Multi-tenant** (đa người thuê). Backend đóng vai trò "trái tim" kết nối:
1. **Admin Web:** Nơi Super Admin bán gói, cấp tài khoản doanh nghiệp.
2. **Client Web:** Nơi Doanh nghiệp (Client) cấu hình bot, quản lý nhân viên, nạp tài liệu huấn luyện AI.
3. **Chatbot Widget:** Nơi khách hàng cuối (End-user) chat trực tiếp trên các website đối tác.
4. **AI Backend (Python RAG):** Dịch vụ băm nhỏ tài liệu, lưu Vector vào ChromaDB và truy vấn LLM.

---

## 🛡️ 2. Nguyên tắc "Sống Còn" cho Backend Intern: Data Isolation (Cách ly dữ liệu)

> [!CAUTION]
> **LỖI NGHIÊM TRỌNG NHẤT:** Rò rỉ dữ liệu giữa các Client (Doanh nghiệp).  
> Khách của Công ty A chat tuyệt đối không được đọc tài liệu hoặc lộ lịch sử chat của Công ty B.

### Quy tắc triển khai trong code:
1. **Mọi collection con (Users, KnowledgeFiles, Chats, Messages, Customers):**
   - Bắt buộc phải có field: `clientId: { type: String, required: true, index: true }`.
2. **Middleware Tenant Context:**
   - Khi request đi qua Auth Middleware (JWT), trích xuất `clientId` và gắn vào `req.client` hoặc `req.user`.
   - Mọi câu lệnh truy vấn CSDL (`find`, `findOne`, `updateOne`, `deleteMany`,...) **PHẢI LUÔN LUÔN** đính kèm điều kiện `clientId: req.clientId`.
3. **Tuyệt đối không tin tưởng client:**
   - Không cho phép người dùng truyền `clientId` qua URL params hoặc body để xem dữ liệu nhạy cảm nếu không khớp với token JWT.

```javascript
// ❌ SAI LẦM: Dễ bị khai thác IDOR (Insecure Direct Object References)
const chats = await Chat.find({ sessionId: req.params.sessionId });

// ✅ ĐÚNG: Luôn khóa chặt bằng clientId của tenant đang đăng nhập
const chats = await Chat.find({ 
  sessionId: req.params.sessionId, 
  clientId: req.user.clientId 
});
```

---

## 📊 3. Thiết kế Mongoose Models (Gợi ý triển khai)

### 3.1. Client Model (`src/models/Client.js`)
```javascript
const clientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true, index: true },
  company_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subscription_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  subscription_plan_end: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  widget_config: {
    color: { type: String, default: '#2563eb' },
    action_color: { type: String, default: '#1d4ed8' },
    avatar: { type: String, default: '' },
    welcome_message: { type: String, default: 'Xin chào! Tôi có thể giúp gì cho bạn?' },
    require_lead_form: { type: Boolean, default: false },
    profanity_words: [{ type: String }]
  },
  api_keys: {
    openai: { type: String, default: '' }, // Lưu chuỗi đã mã hóa AES-256
    gemini: { type: String, default: '' }
  }
}, { timestamps: true });
```

### 3.2. Knowledge File Model (`src/models/KnowledgeFile.js`)
```javascript
const knowledgeFileSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  file_name: { type: String, required: true },
  file_path: { type: String, required: true },
  file_size: { type: Number, required: true }, // byte
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  vector_count: { type: Number, default: 0 },
  error_message: { type: String, default: null },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
```

---

## ⚡ 4. Danh sách API Endpoints cần phát triển

### A. Phân hệ Super Admin (`/api/admin`)
- `POST /api/admin/auth/login`: Đăng nhập Super Admin.
- `GET /api/admin/plans`: Lấy danh sách gói cước.
- `POST /api/admin/plans`: Tạo gói cước mới (`name`, `max_users`, `max_files`, `duration_days`, `price`).
- `PUT /api/admin/plans/:id`: Cập nhật cấu hình gói cước.
- `GET /api/admin/clients`: Danh sách các doanh nghiệp.
- `POST /api/admin/clients`: Cấp tài khoản mới cho doanh nghiệp (tạo `clientId` ngẫu nhiên + hash mật khẩu + gán gói).
- `PATCH /api/admin/clients/:id/status`: Khóa hoặc kích hoạt lại Client.

### B. Phân hệ Client Tenant Dashboard (`/api/client`)
- `POST /api/client/auth/login`: Đăng nhập Client Admin / Nhân viên.
- `GET /api/client/me`: Lấy thông tin tài khoản, gói cước và hạn mức sử dụng (Số user hiện tại / max_users, Số file / max_files).
- `PUT /api/client/widget-config`: Cập nhật màu sắc, avatar, câu chào, danh sách từ ngữ nhạy cảm.
- `PUT /api/client/api-keys`: Cập nhật API key (OpenAI/Gemini) - mã hóa trước khi lưu.
- **Quản lý User (Nhân viên):**
  - `GET /api/client/users`: Danh sách nhân viên của client.
  - `POST /api/client/users`: Tạo nhân viên mới (**Validate không vượt quá `max_users`**).
  - `DELETE /api/client/users/:id`: Xóa nhân viên.
- **Quản lý Tri thức (Knowledge Base):**
  - `GET /api/client/files`: Danh sách tài liệu và trạng thái học.
  - `POST /api/client/files/upload`: Tải file PDF/Word (**Validate `max_files`, đuôi file, dung lượng < 10MB**) -> Bắn Webhook sang Python AI service.
- **Báo cáo & Khách hàng:**
  - `GET /api/client/chats`: Danh sách phiên trò chuyện (`sessionId`, thời gian, tin nhắn cuối).
  - `GET /api/client/chats/:sessionId`: Chi tiết hội thoại của 1 phiên.
  - `GET /api/client/leads`: Danh sách khách hàng tiềm năng (`Customer`) đã để lại form.

### C. Phân hệ Widget Public API (`/api/widget`)
> Các API này được gọi từ website khách hàng (WordPress, React, Vue,...) không có token JWT đăng nhập của Client, mà dùng `clientId`.
- `GET /api/widget/config?clientId=xxx`: Trả về giao diện widget (màu, logo, lời chào, trạng thái bot hoạt động/hết hạn).
- `POST /api/widget/leads`: Lưu thông tin khách hàng (Tên, SĐT, Email) gắn với `clientId` và `sessionId`.
- `POST /api/widget/chat`: Nhận tin nhắn của End-user:
  1. Kiểm tra Client có đang `active` và còn hạn sử dụng không.
  2. Kiểm tra bộ lọc từ ngữ cấm (`Profanity filter`). Nếu có từ cấm -> Trả về cảnh báo từ chối.
  3. Lưu tin nhắn User vào CSDL (`messages`).
  4. Chuyển tiếp truy vấn sang **AI Backend (FastAPI)** kèm `clientId`.
  5. Nhận kết quả từ AI, lưu tin nhắn Bot vào CSDL (`messages`).
  6. Phản hồi về cho Widget.

### D. Webhook nội bộ (`/api/webhooks`)
- `POST /api/webhooks/ingestion-status`: AI Backend gọi về để báo file X đã hoàn tất băm vector hoặc bị lỗi.

---

## 🧠 5. Tích Hợp với AI Backend (Python & ChromaDB)

Khi làm việc với AI Backend, Backend Node.js trao đổi qua HTTP REST / Webhooks:

### 1. Kích hoạt Ingestion (Khi Client upload file):
```http
POST http://ai-service:8000/api/v1/ingest
Content-Type: application/json

{
  "clientId": "client_abc123",
  "fileId": "651a2b3c4d5e6f7a8b9c0d1e",
  "fileUrl": "http://main-backend:5000/uploads/client_abc123/tailieu.pdf",
  "webhookUrl": "http://main-backend:5000/api/webhooks/ingestion-status"
}
```

### 2. Truy vấn Chat RAG:
```http
POST http://ai-service:8000/api/v1/query
Content-Type: application/json

{
  "clientId": "client_abc123",
  "sessionId": "sess_001",
  "question": "Chính sách hoàn tiền như thế nào?",
  "apiKey": "sk-...", // API Key riêng của client nếu có
  "model": "gpt-4o-mini"
}
```

---

## 📝 6. Checklist Kiểm Thử Nhanh Trước Khi Nộp Code Cho Mentor

Khi mentor giao cho bạn viết một module hoặc sửa một bug, hãy luôn tự kiểm tra theo checklist sau:

- [ ] **Kiểm tra Isolation:** Câu query có điều kiện `{ clientId }` chưa?
- [ ] **Kiểm tra Hạn mức (Quota Limit):** 
  - Tạo user có kiểm tra `countDocuments({ clientId }) < plan.max_users` không?
  - Upload file có kiểm tra `countDocuments({ clientId }) < plan.max_files` không?
- [ ] **Kiểm tra Hạn dùng gói (Expiration):** Ngày hiện tại có nhỏ hơn `subscription_plan_end` không?
- [ ] **Bảo mật API Key:** API Key của bên thứ 3 (OpenAI/Gemini) có được mã hóa (Crypto AES) trước khi `save()` vào Mongo không? Khi trả về Client Web có bị lộ full key không? (Nên mask dạng `sk-...xyz`).
- [ ] **Validation đầu vào:** Có dùng `Joi`, `Zod` hoặc `express-validator` để validate dữ liệu từ request body không?
- [ ] **Xử lý lỗi (Error Handling):** Có bọc trong `try...catch` và dùng Global Error Handler không? API có trả về mã HTTP chuẩn (`400`, `401`, `403`, `404`, `500`) không?

---

## 🧭 7. Ánh Xạ 12 Phân Hệ BA Vào Các Task Backend Mentor Hay Giao

Xem chi tiết đặc tả tại **[docs/BA_PRD_FEATURE_CATALOG.md](file:///c:/laragon/www/Go/docs/BA_PRD_FEATURE_CATALOG.md)**. Khi Mentor giao việc, đối chiếu ngay vào bảng sau:

1. **Auto-learning Knowledge Gaps:**
   - Viết Cronjob định kỳ quét collection `unanswered_faqs` (lọc spam, PII redaction).
   - Gọi embedding & thuật toán gom cụm (Clustering), sinh bản ghi `knowledge_gaps`.
2. **Omnichannel (Facebook/Zalo):**
   - Viết controller xác thực HMAC SHA-256 (Meta) và MAC (Zalo).
   - Viết regex phát hiện SĐT trong comment, gọi Graph API ẩn bình luận và lưu Lead.
3. **Lead Capture & CRM Sync:**
   - Viết API `/api/customer/lead-capture`, lọc trùng SĐT trong ngày.
   - Dùng BullMQ đẩy job đồng bộ sang CRM (KiotViet, GetFly).
4. **Thanh toán VietQR & IPN Webhook:**
   - Sinh VietQR động với mã hóa đơn (`INV-xxx`).
   - Xử lý Webhook ngân hàng: đối soát số tiền 100%, gạch nợ và tự động gia hạn gói cước.
5. **Conversational Commerce & Product Carousel:**
   - Quản lý sản phẩm (Draft -> Active).
   - Chặn tuyệt đối bot tự bịa giá (Anti-hallucination of price).
   - Cơ chế SLA timeout 3 phút: nếu nhân viên không nhận ca thì tự động bung Lead Form.
6. **Sentiment Handoff & Bot Silence:**
   - Bắt sentiment score < -0.5, bắn WebSocket cho nhân viên trực chat.
   - Chặn cứng không cho bot gửi tin nhắn khi ca chat đang ở chế độ `human_handling`.
7. **Broadcast Campaign (Gửi tin hàng loạt):**
   - Điều khiển queue BullMQ/Redis gửi tin tránh vượt Rate Limit của Facebook/Zalo.
   - Xử lý logic Opt-out (người dùng từ chối nhận tin).
8. **Subscription Lifecycle & Soft Downgrade:**
   - State machine: `ACTIVE` -> `GRACE_PERIOD` (3 ngày ân hạn, bot ngoài web vẫn chạy) -> `DOWNGRADED` (đóng băng file vượt hạn mức) -> `Auto-Reactivate`.
   - Tính toán Proration khi nâng cấp gói giữa chu kỳ.
9. **Electronic Invoicing (E-Invoice):**
   - Hóa đơn ở trạng thái `paid` là bất biến (immutable), tích hợp tra cứu MST.
10. **Knowledge Base Pipeline:**
    - Hard delete 3 tầng triệt để (DB MongoDB + Cloud Storage S3 + Vector Qdrant).

