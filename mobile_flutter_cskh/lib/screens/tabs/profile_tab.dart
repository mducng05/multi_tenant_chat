import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

/// Tab 4: Hồ sơ nhân viên và Cài đặt hệ thống
class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _isOnline = true;

  void _handleLogout() {
    ApiService.authToken = null;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text(
          'Hồ Sơ & Cài Đặt',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // THẺ THÔNG TIN TÀI KHOẢN
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: AppColors.primary.withOpacity(0.3),
                  child: const Icon(Icons.support_agent, size: 36, color: AppColors.primaryLight),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ApiService.companyName ?? 'Công ty Khách Hàng',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Vai trò: ${ApiService.userRole == "client_owner" ? "Chủ Doanh Nghiệp" : "Nhân Viên CSKH"}',
                        style: const TextStyle(color: AppColors.primaryLight, fontSize: 13),
                      ),
                      Text(
                        'Mã Tenant: ${ApiService.clientId ?? "HN-DEMO-001"}',
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // TRẠNG THÁI TRỰC CHAT
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.success,
              title: const Text(
                'Trạng thái sẵn sàng nhận chat',
                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                _isOnline ? 'Đang trực tuyến (Sẵn sàng tiếp quản)' : 'Tạm vắng (Chỉ bot tự động)',
                style: TextStyle(
                  color: _isOnline ? AppColors.success : AppColors.textMuted,
                  fontSize: 12,
                ),
              ),
              value: _isOnline,
              onChanged: (val) => setState(() => _isOnline = val),
            ),
          ),

          const SizedBox(height: 20),

          // THÔNG TIN HỆ THỐNG
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'THÔNG TIN KẾT NỐI BACKEND',
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 12),
                _buildInfoRow('Địa chỉ máy chủ:', ApiService.baseUrl),
                const Divider(color: AppColors.cardBorder, height: 16),
                _buildInfoRow('Nền tảng:', 'GoQuestX Multi-Tenant SaaS'),
                const Divider(color: AppColors.cardBorder, height: 16),
                _buildInfoRow('Phiên bản app:', 'v1.0.0+1 (Flutter Core)'),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // NÚT ĐĂNG XUẤT
          ElevatedButton.icon(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout, color: Colors.white, size: 20),
            label: const Text(
              'Đăng Xuất Khỏi Thiết Bị',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.danger,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    );
  }
}
