import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';
import '../../models/tenant_quota_model.dart';
import '../../services/api_service.dart';
import '../../widgets/quota_card.dart';

/// Tab 2: Giám sát Quota & Thống kê kinh doanh của Doanh nghiệp
class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  TenantQuota? _quota;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTenantInfo();
  }

  Future<void> _loadTenantInfo() async {
    setState(() => _isLoading = true);
    final quota = await ApiService.getTenantInfo();
    if (mounted) {
      setState(() {
        _quota = quota;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: const Text(
          'Giám Sát Quota & Thống Kê',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadTenantInfo,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _quota == null
              ? const Center(
                  child: Text('Không tải được thông tin', style: TextStyle(color: AppColors.textMuted)),
                )
              : RefreshIndicator(
                  onRefresh: _loadTenantInfo,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // THẺ DOANH NGHIỆP TỔNG QUAN
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1E3A5F), Color(0xFF1E293B)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _quota!.companyName,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Mã Tenant: ${_quota!.clientId}',
                                        style: const TextStyle(color: AppColors.primaryLight, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: AppColors.primaryLight.withOpacity(0.4)),
                                  ),
                                  child: Text(
                                    _quota!.planName,
                                    style: const TextStyle(
                                      color: AppColors.primaryLight,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(color: AppColors.cardBorder, height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildMiniStat('Leads CRM', '${_quota!.totalLeads}', Icons.people_outline),
                                _buildMiniStat('Hội thoại', '${_quota!.totalConversations}', Icons.chat_bubble_outline),
                                _buildMiniStat('Hạn dùng', '${_quota!.daysRemaining} ngày', Icons.hourglass_bottom),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      const Text(
                        'HẠN MỨC GÓI CƯỚC (QUOTA)',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // THẺ QUOTA NHÂN SỰ
                      QuotaCard(
                        title: 'Tài Khoản Nhân Sự (User Quota)',
                        current: _quota!.currentUsers,
                        max: _quota!.maxUsers,
                        icon: Icons.badge_outlined,
                        accentColor: AppColors.primary,
                        unit: 'nhân viên',
                      ),
                      const SizedBox(height: 12),

                      // THẺ QUOTA TÀI LIỆU RAG
                      QuotaCard(
                        title: 'Tài Liệu Huấn Luyện AI (RAG Files Quota)',
                        current: _quota!.currentFiles,
                        max: _quota!.maxFiles,
                        icon: Icons.menu_book_outlined,
                        accentColor: AppColors.accent,
                        unit: 'tài liệu',
                      ),

                      const SizedBox(height: 20),

                      // THẺ CHẾ ĐỘ HOẠT ĐỘNG
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.cardBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.smart_toy_outlined, color: AppColors.success, size: 28),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Chế độ phản hồi hiện tại',
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                  ),
                                  Text(
                                    _quota!.chatMode == 'human'
                                        ? '👨‍💼 Nhân viên đang trực chat'
                                        : '🤖 AI Bot tự động trả lời',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppColors.textMuted, size: 18),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        Text(
          label,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ],
    );
  }
}
