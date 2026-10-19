import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/conversation_model.dart';
import '../models/tenant_quota_model.dart';
import '../models/lead_model.dart';

/// Service quản lý toàn bộ việc gọi REST API từ Flutter tới Backend Node.js
class ApiService {
  // Tự động nhận diện môi trường chạy:
  // - Chạy trên Web (Chrome) hoặc Windows App -> dùng http://localhost:5000
  // - Chạy trên máy ảo Android -> dùng http://10.0.2.2:5000
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5000';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5000';
    return 'http://localhost:5000';
  }

  static String? authToken;
  static String? userRole;
  static String? companyName;
  static String? clientId;

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

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
        clientId = data['clientId'];
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Đăng nhập thất bại'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Không thể kết nối đến máy chủ: $e'};
    }
  }

  /// 2. API Lấy thông tin Tenant & Hạn mức Quota
  static Future<TenantQuota?> getTenantInfo() async {
    final url = Uri.parse('$baseUrl/api/client/me');
    try {
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          return TenantQuota.fromJson(data);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Lỗi getTenantInfo: $e');
      return null;
    }
  }

  /// 3. API Lấy danh sách hội thoại khách hàng (đã map thành List<Conversation>)
  static Future<List<Conversation>> getConversations() async {
    final url = Uri.parse('$baseUrl/api/client/conversations');
    try {
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          final list = data['conversations'] as List<dynamic>? ?? [];
          return list.map((c) => Conversation.fromJson(c)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Lỗi getConversations: $e');
      return [];
    }
  }

  /// 4. API Tiếp quản hội thoại (Optimistic Locking & Khóa Bot)
  static Future<bool> takeOverSession(String sessionId) async {
    final url = Uri.parse('$baseUrl/api/client/chat/take-session');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'sessionId': sessionId}),
      );
      final data = jsonDecode(response.body);
      return data['ok'] == true;
    } catch (e) {
      debugPrint('Lỗi takeOverSession: $e');
      return false;
    }
  }

  /// 5. API Đánh dấu hoàn tất hội thoại (Bàn giao lại cho Bot tự động)
  static Future<bool> resolveSession(String sessionId) async {
    final url = Uri.parse('$baseUrl/api/client/chat/resolve-session');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'sessionId': sessionId}),
      );
      final data = jsonDecode(response.body);
      return data['ok'] == true;
    } catch (e) {
      debugPrint('Lỗi resolveSession: $e');
      return false;
    }
  }

  /// 6. API Nhân viên CSKH gửi tin nhắn phản hồi
  static Future<bool> sendStaffReply(String sessionId, String message) async {
    final url = Uri.parse('$baseUrl/api/client/reply');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({
          'sessionId': sessionId,
          'message': message,
        }),
      );
      final data = jsonDecode(response.body);
      return data['ok'] == true;
    } catch (e) {
      debugPrint('Lỗi sendStaffReply: $e');
      return false;
    }
  }

  /// 7. API AI Chuốt Lời (AI Polish Writing Assistant)
  static Future<String?> polishMessageDraft(String draft) async {
    final url = Uri.parse('$baseUrl/api/client/chat/ai-polish');
    try {
      final response = await http.post(
        url,
        headers: _headers,
        body: jsonEncode({'draft': draft}),
      );
      final data = jsonDecode(response.body);
      if (data['ok'] == true) {
        return data['polished'] as String?;
      }
      return null;
    } catch (e) {
      debugPrint('Lỗi polishMessageDraft: $e');
      return null;
    }
  }

  /// 8. API Lấy danh sách khách hàng tiềm năng (Leads CRM)
  static Future<List<CustomerLead>> getLeads() async {
    final url = Uri.parse('$baseUrl/api/client/customer-data');
    try {
      final response = await http.get(url, headers: _headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          final list = data['leads'] as List<dynamic>? ?? [];
          return list.map((l) => CustomerLead.fromJson(l)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Lỗi getLeads: $e');
      return [];
    }
  }
}
