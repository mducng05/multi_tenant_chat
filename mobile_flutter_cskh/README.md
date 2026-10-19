# 📱 GoQuestX Mobile CSKH - Demo Ứng Dụng Flutter

Ứng dụng di động (iOS & Android) dành cho **Nhân viên CSKH cơ động** kết nối trực tiếp với Backend Node.js/Express của dự án **GoQuestX Multi-Tenant SaaS**.

---

## 📂 Cấu Trúc Thư Mục Chuẩn Flutter

```text
mobile_flutter_cskh/
├── pubspec.yaml                 # Quản lý dependencies (tương tự package.json của Node.js)
├── lib/
│   ├── main.dart                # Điểm khởi chạy chính của app (hàm main() -> runApp())
│   ├── services/
│   │   └── api_service.dart     # Service gọi REST API (Login, Danh sách chat, Tiếp quản, Gửi tin)
│   └── screens/
│       ├── login_screen.dart             # Màn hình đăng nhập tài khoản nhân viên
│       ├── conversation_list_screen.dart # Màn hình danh sách hội thoại & Cảnh báo Escalation
│       └── chat_detail_screen.dart       # Màn hình chat tiếp quản (Optimistic Lock & Bot Silence)
└── README.md                    # Hướng dẫn chi tiết
```

---

## ⚡ Các Tính Năng Đã Được Hiện Thực

1. **Đăng nhập nhân viên (`LoginScreen`)**:
   - Gọi `POST /api/login` với username/password.
   - Nhận về JWT Token lưu vào bộ nhớ để xác thực các màn hình sau.

2. **Giám sát hội thoại theo thời gian thực (`ConversationListScreen`)**:
   - Gọi `GET /api/client/conversations`.
   - Có tính năng **Kéo xuống để tải lại (Pull-to-refresh)**.
   - **Cảnh báo đỏ (Escalation Badge)** khi khách hàng phàn nàn / giận dữ (Sentiment -0.85).

3. **Tiếp quản hội thoại & Chat (`ChatDetailScreen`)**:
   - Phân biệt màu sắc tin nhắn: Khách hàng (xanh dương đậm), Bot AI (xám đậm), Nhân viên CSKH (xanh viền sáng).
   - Nút **"Tiếp Quản"**: Gọi `POST /api/client/chat/take-session` (khoá bot im lặng để nhân viên chat).
   - Ô nhập tin nhắn: Gọi `POST /api/client/reply` cập nhật ngay trên giao diện (Optimistic UI).

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử App

### Bước 1: Cài đặt Flutter SDK trên máy
1. Tải Flutter SDK cho Windows tại: [https://docs.flutter.dev/get-started/install/windows](https://docs.flutter.dev/get-started/install/windows)
2. Giải nén vào thư mục (Ví dụ: `C:\src\flutter`).
3. Thêm đường dẫn `C:\src\flutter\bin` vào biến môi trường **PATH** của Windows.
4. Mở terminal gõ:
   ```bash
   flutter doctor
   ```

### Bước 2: Cài đặt Extension trên VS Code
- Cài 2 extension: **Flutter** và **Dart** trong VS Code.

### Bước 3: Chạy ứng dụng
1. Đảm bảo Backend Node.js đang chạy trên cổng 5000:
   ```bash
   cd c:\laragon\www\Go
   node server.js
   ```
2. Mở thư mục `mobile_flutter_cskh` trong terminal:
   ```bash
   cd mobile_flutter_cskh
   flutter pub get
   flutter run
   ```
   *(Bạn có thể chọn chạy trên Trình duyệt Chrome, Ứng dụng Windows, hoặc Máy ảo Android).*
