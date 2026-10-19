import 'dart:convert';
import 'package:http/http.dart' as http;

/// Service quản lý toàn bộ việc gọi REST API từ Flutter tới Backend Node.js
class ApiService {
  // LƯU Ý KHI CHẠY:
  // - Nếu chạy máy ảo Android Emulator: dùng 'http://10.0.2.2:5000'
  // - Nếu chạy trên điện thoại thật cắm cáp: dùng IP máy tính của bạn (VD: 'http://192.168.1.15:5000')
  // - Nếu chạy Flutter Web hoặc Windows App: dùng 'http://localhost:5000'
  static const String baseUrl = 'http://10.0.2.2:5000';

  // Lưu trữ Token sau khi đăng nhập thành công
  static String? authToken;
  static String? userRole;
  static String? companyName;

  /// 1. API Đăng nhập nhân viên CSKH
  static Future<Map<String, dynamic>> login(String username, String password) async {
    final url = Uri.parse('$baseUrl/api/login');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['ok'] == true) {
        authToken = data['token'];
        userRole = data['role'];
        companyName = data['company_name'];
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Đăng nhập thất bại'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Không thể kết nối đến máy chủ: $e'};
    }
  }

  /// 2. API Lấy danh sách hội thoại khách hàng
  static Future<List<dynamic>> getConversations() async {
    final url = Uri.parse('$baseUrl/api/client/conversations');
    try {
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['ok'] == true) {
        return data['conversations'] ?? [];
      }
      return [];
    } catch (e) {
      print('Lỗi lấy danh sách chat: $e');
      return [];
    }
  }

  /// 3. API Tiếp quản hội thoại (Optimistic Locking & Khóa Bot)
  static Future<bool> takeOverSession(String sessionId) async {
    final url = Uri.parse('$baseUrl/api/client/chat/take-session');
    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'sessionId': sessionId}),
      );

      final data = jsonDecode(response.body);
      return data['ok'] == true;
    } catch (e) {
      print('Lỗi tiếp quản: $e');
      return false;
    }
  }

  /// 4. API Nhân viên CSKH gửi tin nhắn phản hồi
  static Future<bool> sendStaffReply(String sessionId, String message) async {
    final url = Uri.parse('$baseUrl/api/client/reply');
    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'sessionId': sessionId,
          'message': message,
        }),
      );

      final data = jsonDecode(response.body);
      return data['ok'] == true;
    } catch (e) {
      print('Lỗi gửi tin nhắn: $e');
      return false;
    }
  }
}
