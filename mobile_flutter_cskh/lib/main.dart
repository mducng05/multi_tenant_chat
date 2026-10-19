import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

/// Điểm khởi đầu của toàn bộ ứng dụng Flutter (Entry point)
void main() {
  runApp(const GoQuestXStaffApp());
}

/// Root Widget của ứng dụng
class GoQuestXStaffApp extends StatelessWidget {
  const GoQuestXStaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GoQuestX CSKH Staff',
      debugShowCheckedModeBanner: false, // Tắt dải băng 'DEBUG' góc phải
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF2563EB),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        fontFamily: 'sans-serif',
      ),
      home: const LoginScreen(), // Màn hình đầu tiên xuất hiện là Login
    );
  }
}
