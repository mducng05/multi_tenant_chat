import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'conversation_list_screen.dart';

/// Màn hình đăng nhập (Login Screen)
/// Kế thừa StatefulWidget vì giao diện này có TRẠNG THÁI thay đổi (loading, lưu text nhập, báo lỗi)
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Controller để quản lý và lấy chữ từ ô nhập (TextField)
  final TextEditingController _usernameController = TextEditingController(text: 'client_demo');
  final TextEditingController _passwordController = TextEditingController(text: 'ClientPass123');

  bool _isLoading = false;
  String? _errorMessage;

  // Hàm xử lý khi bấm nút "Đăng Nhập"
  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng điền đầy đủ tài khoản và mật khẩu!';
      });
      return;
    }

    // setState báo cho Flutter vẽ lại UI hiển thị vòng xoay quay (CircularProgressIndicator)
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    // Gọi API Service
    final result = await ApiService.login(username, password);

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      // Chuyển màn hình sang danh sách hội thoại CSKH (Navigator.pushReplacement)
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ConversationListScreen()),
        );
      }
    } else {
      setState(() {
        _errorMessage = result['message'];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Scaffold: Khung chuẩn của một màn hình điện thoại (AppBar, Body, BottomBar)
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Màu nền tối Sleek Dark
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Logo
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF3B82F6).withOpacity(0.4),
                      blurRadius: 15,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    'GQ',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                'GoQuestX CSKH Mobile',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ứng dụng di động tiếp quản chat khách hàng',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
              ),
              const SizedBox(height: 32),

              // Thông báo lỗi nếu có
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.15),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Color(0xFFF87171), fontSize: 13),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Ô nhập Username
              TextField(
                controller: _usernameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Tài khoản nhân viên',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  prefixIcon: const Icon(Icons.person, color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 16),

              // Ô nhập Password
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Mật khẩu',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  prefixIcon: const Icon(Icons.lock, color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 24),

              // Nút Đăng nhập
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Đăng Nhập Vào Hệ Thống',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
