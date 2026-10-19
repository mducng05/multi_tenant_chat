import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'chat_detail_screen.dart';
import 'login_screen.dart';

/// Màn hình danh sách hội thoại khách hàng (Conversation List Screen)
class ConversationListScreen extends StatefulWidget {
  const ConversationListScreen({super.key});

  @override
  State<ConversationListScreen> createState() => _ConversationListScreenState();
}

class _ConversationListScreenState extends State<ConversationListScreen> {
  List<dynamic> _conversations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    // Tự động tải danh sách hội thoại khi màn hình được tạo
    _fetchConversations();
  }

  Future<void> _fetchConversations() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getConversations();
    setState(() {
      _conversations = list;
      _isLoading = false;
    });
  }

  void _handleLogout() {
    ApiService.authToken = null;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              ApiService.companyName ?? 'CSKH Workspace',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              'Nhân viên: ${ApiService.userRole ?? "Staff"}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF10B981)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchConversations,
            tooltip: 'Làm mới',
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFFF87171)),
            onPressed: _handleLogout,
            tooltip: 'Đăng xuất',
          ),
        ],
      ),
      // RefreshIndicator cho phép kéo xuống để reload (Pull-to-refresh)
      body: RefreshIndicator(
        onRefresh: _fetchConversations,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
            : _conversations.isEmpty
                ? const Center(
                    child: Text(
                      'Hiện không có cuộc trò chuyện nào',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _conversations.length,
                    itemBuilder: (context, index) {
                      final chat = _conversations[index];
                      final isEscalated = chat['status'] == 'escalated';
                      final customerName = chat['customerName'] ?? 'Khách vãng lai';
                      final lastMessage = chat['lastMessage'] ?? 'Bắt đầu cuộc trò chuyện';
                      final sessionId = chat['sessionId'] ?? '';
                      final isLockedByStaff = chat['lockedBy'] != null;

                      // Card hiển thị từng phiên chat
                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: isEscalated ? const Color(0xFFEF4444) : const Color(0xFF334155),
                            width: isEscalated ? 2 : 1,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () async {
                            // Chuyển sang màn hình chat chi tiết
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ChatDetailScreen(conversation: chat),
                              ),
                            );
                            // Khi quay lại thì reload danh sách
                            _fetchConversations();
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(14.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 18,
                                          backgroundColor: isEscalated
                                              ? const Color(0xFFEF4444).withOpacity(0.2)
                                              : const Color(0xFF3B82F6).withOpacity(0.2),
                                          child: Text(
                                            customerName.substring(0, 1).toUpperCase(),
                                            style: TextStyle(
                                              color: isEscalated ? const Color(0xFFEF4444) : const Color(0xFF60A5FA),
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              customerName,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 15,
                                              ),
                                            ),
                                            Text(
                                              'ID: $sessionId',
                                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    // Badge Trạng thái
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isEscalated
                                            ? const Color(0xFFEF4444).withOpacity(0.2)
                                            : (isLockedByStaff
                                                ? const Color(0xFF3B82F6).withOpacity(0.2)
                                                : const Color(0xFF10B981).withOpacity(0.2)),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        isEscalated
                                            ? '🚨 CẢNH BÁO'
                                            : (isLockedByStaff ? '👨‍💼 Đã tiếp quản' : '🤖 Bot tự động'),
                                        style: TextStyle(
                                          color: isEscalated
                                              ? const Color(0xFFF87171)
                                              : (isLockedByStaff ? const Color(0xFF60A5FA) : const Color(0xFF34D399)),
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  lastMessage,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
