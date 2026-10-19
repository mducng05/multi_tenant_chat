/// Model thông tin hạn mức Quota và thông số của Tenant
class TenantQuota {
  final String companyName;
  final String clientId;
  final String email;
  final String status;
  final String chatMode;
  final String planName;
  final int maxUsers;
  final int currentUsers;
  final int maxFiles;
  final int currentFiles;
  final int daysRemaining;
  final int totalLeads;
  final int totalConversations;

  TenantQuota({
    required this.companyName,
    required this.clientId,
    required this.email,
    required this.status,
    required this.chatMode,
    required this.planName,
    required this.maxUsers,
    required this.currentUsers,
    required this.maxFiles,
    required this.currentFiles,
    required this.daysRemaining,
    required this.totalLeads,
    required this.totalConversations,
  });

  factory TenantQuota.fromJson(Map<String, dynamic> json) {
    final client = json['client'] ?? {};
    final sub = client['subscription'] ?? {};
    final stats = json['stats'] ?? {};

    return TenantQuota(
      companyName: client['company_name'] ?? 'Doanh Nghiệp',
      clientId: client['clientId'] ?? '',
      email: client['email'] ?? '',
      status: client['status'] ?? 'active',
      chatMode: client['chatMode'] ?? 'bot',
      planName: sub['plan_name'] ?? 'Free Plan',
      maxUsers: sub['max_users'] ?? 0,
      currentUsers: sub['current_users'] ?? 0,
      maxFiles: sub['max_files'] ?? 0,
      currentFiles: sub['current_files'] ?? 0,
      daysRemaining: sub['days_remaining'] ?? 0,
      totalLeads: stats['total_leads'] ?? 0,
      totalConversations: stats['total_conversations'] ?? 0,
    );
  }
}
