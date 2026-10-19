import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../constants/app_colors.dart';
import '../../models/lead_model.dart';
import '../../services/api_service.dart';

/// Tab 3: Quản lý khách hàng tiềm năng (Leads CRM)
class LeadsTab extends StatefulWidget {
  const LeadsTab({super.key});

  @override
  State<LeadsTab> createState() => _LeadsTabState();
}

class _LeadsTabState extends State<LeadsTab> {
  List<CustomerLead> _leads = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchLeads();
  }

  Future<void> _fetchLeads() async {
    setState(() => _isLoading = true);
    final leads = await ApiService.getLeads();
    if (mounted) {
      setState(() {
        _leads = leads;
        _isLoading = false;
      });
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép $label: $text'),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Khách Hàng Tiềm Năng (Leads)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
            ),
            Text(
              'AI tự động thu thập từ chat: ${_leads.length} khách',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchLeads,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _leads.isEmpty
              ? const Center(
                  child: Text(
                    'Chưa có Leads nào được thu thập',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchLeads,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _leads.length,
                    itemBuilder: (context, index) {
                      final lead = _leads[index];
                      return Card(
                        color: AppColors.cardBg,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: AppColors.cardBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: AppColors.success.withOpacity(0.2),
                                        radius: 18,
                                        child: const Icon(Icons.person, color: AppColors.success, size: 20),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        lead.name,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Mã: ${lead.sessionId}',
                                      style: const TextStyle(color: AppColors.primaryLight, fontSize: 10),
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(color: AppColors.cardBorder, height: 20),
                              // Số điện thoại & Email
                              Row(
                                children: [
                                  Expanded(
                                    child: InkWell(
                                      onTap: () => _copyToClipboard(lead.phone, 'Số điện thoại'),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.phone_outlined, color: AppColors.primaryLight, size: 16),
                                          const SizedBox(width: 6),
                                          Text(
                                            lead.phone,
                                            style: const TextStyle(
                                              color: AppColors.primaryLight,
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  if (lead.email != '--')
                                    Expanded(
                                      child: InkWell(
                                        onTap: () => _copyToClipboard(lead.email, 'Email'),
                                        child: Row(
                                          children: [
                                            const Icon(Icons.email_outlined, color: AppColors.textMuted, size: 16),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                lead.email,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              // Ghi chú / Yêu cầu
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.inputBg,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '📌 Nhu cầu: ${lead.notes}',
                                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
