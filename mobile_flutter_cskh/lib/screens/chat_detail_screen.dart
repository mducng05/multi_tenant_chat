import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Màn hình chi tiết khung chat và tiếp quản hội thoại (Chat Detail & Takeover)
class ChatDetailScreen extends StatefulWidget {
  final Map<String, dynamic> conversation;

  const ChatDetailScreen({super.key, required this.conversation});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late List<dynamic> _messages;
  late bool _isEscalated;
  late bool _isLockedByStaff;
  bool _isTakingOver = false;

  @override
  void initState() {
    super.initState();
    _messages = widget.conversation['messages'] ?? [];
    _isEscalated = widget.conversation['status'] == 'escalated';
    _isLockedByStaff = widget.conversation['lockedBy'] != null;

    // Tự động cuộn xuống tin nhắn cuối cùng
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  // 1. Hàm tiếp quản hội thoại (Khóa bot)
  Future<void> _handleTakeOver() async {
    setState(() => _isTakingOver = true);
    final sessionId = widget.conversation['sessionId'];
    final success = await ApiService.takeOverSession(sessionId);

    setState(() {
      _isTakingOver = false;
      if (success) {
        _isLockedByStaff = true;
        _isEscalated = false; // Đã tiếp quản nên tắt cảnh báo đỏ
      }
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Đã tiếp quản thành công! Bot đã tắt để bạn chat trực tiếp.'
              : 'Tiếp quản thất bại.'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  // 2. Hàm nhân viên gửi tin nhắn phản hồi khách hàng
  Future<void> _handleSendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final sessionId = widget.conversation['sessionId'];
    _messageController.clear();

    // Optimistic UI update: thêm tin nhắn vào UI ngay lập tức
    setState(() {
      _messages.add({
        'sender': 'staff',
        'text': text,
        'createdAt': DateTime.now().toIso8601String(),
      });
      _isLockedByStaff = true; // Nhân viên nhắn tin là tự động tiếp quản
    });
    _scrollToBottom();

    // Gửi request lên server Express
    await ApiService.sendStaffReply(sessionId, text);
  }

  @override
  Widget build(BuildContext context) {
    final customerName = widget.conversation['customerName'] ?? 'Khách hàng';
    final sessionId = widget.conversation['sessionId'] ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(customerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            Text('Mã: $sessionId', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
        actions: [
          // Nút bấm Tiếp quản trên AppBar
          if (!_isLockedByStaff)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: TextButton.icon(
                onPressed: _isTakingOver ? null : _handleTakeOver,
                icon: const Icon(Icons.support_agent, color: Colors.white, size: 18),
                label: const Text('Tiếp Quản', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // BANNER CẢNH BÁO ESCALATION (Khách hàng giận dữ)
          if (_isEscalated)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: const Color(0xFFDC2626),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 24),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Khách hàng đang bức xúc! Vui lòng bấm tiếp quản để hỗ trợ ngay.',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: _handleTakeOver,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFFDC2626),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    child: const Text('TIẾP QUẢN'),
                  ),
                ],
              ),
            ),

          // KHUNG DANH SÁCH TIN NHẮN
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final sender = msg['sender'] ?? 'bot';
                final text = msg['text'] ?? '';
                final isUser = sender == 'user';
                final isStaff = sender == 'staff';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                    decoration: BoxDecoration(
                      color: isUser
                          ? const Color(0xFF2563EB) // Tin nhắn khách
                          : (isStaff ? const Color(0xFF1E3A5F) : const Color(0xFF1E293B)), // Nhân viên vs Bot
                      borderRadius: BorderRadius.circular(14).copyWith(
                        bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(14),
                        bottomLeft: !isUser ? const Radius.circular(2) : const Radius.circular(14),
                      ),
                      border: isStaff ? Border.all(color: const Color(0xFF3B82F6)) : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Nhãn phân biệt người gửi
                        Text(
                          isUser ? 'Khách hàng' : (isStaff ? '👨‍💼 Bạn (CSKH)' : '🤖 Trợ lý Bot AI'),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isUser
                                ? Colors.white70
                                : (isStaff ? const Color(0xFF93C5FD) : const Color(0xFF94A3B8)),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          text,
                          style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // KHUNG NHẬP TIN NHẮN DÀNH CHO NHÂN VIÊN
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: const Color(0xFF1E293B),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: _isLockedByStaff
                            ? 'Nhập phản hồi gửi đến khách...'
                            : 'Nhập tin nhắn (tự động tiếp quản)...',
                        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF2563EB),
                    radius: 20,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: _handleSendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
