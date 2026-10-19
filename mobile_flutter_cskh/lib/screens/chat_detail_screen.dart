import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';
import '../../models/conversation_model.dart';
import '../../services/api_service.dart';

/// Màn hình chi tiết khung chat và tiếp quản hội thoại (Chat Detail & Takeover)
class ChatDetailScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatDetailScreen({super.key, required this.conversation});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late List<ChatMessage> _messages;
  late bool _isEscalated;
  late bool _isLockedByStaff;
  bool _isActionLoading = false;
  bool _isPolishing = false;

  final List<String> _quickTemplates = [
    'Dạ em chào anh/chị, em có thể hỗ trợ gì ạ?',
    'Dạ em đã kiểm tra thông tin và xin gửi lại ngay ạ.',
    'Em đã tiếp nhận yêu cầu và xử lý ưu tiên cho mình ạ.',
  ];

  @override
  void initState() {
    super.initState();
    _messages = List.from(widget.conversation.messages);
    _isEscalated = widget.conversation.isEscalated;
    _isLockedByStaff = widget.conversation.isLockedByStaff;

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

  // 1. Tiếp quản hội thoại (Optimistic Locking & Khóa Bot)
  Future<void> _handleTakeOver() async {
    setState(() => _isActionLoading = true);
    final success = await ApiService.takeOverSession(widget.conversation.sessionId);

    setState(() {
      _isActionLoading = false;
      if (success) {
        _isLockedByStaff = true;
        _isEscalated = false;
      }
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Đã tiếp quản thành công! Bot đã tắt để bạn chat trực tiếp.'
              : 'Tiếp quản thất bại.'),
          backgroundColor: success ? AppColors.success : AppColors.danger,
        ),
      );
    }
  }

  // 2. Đánh dấu hoàn tất (Bàn giao lại cho Bot)
  Future<void> _handleResolve() async {
    setState(() => _isActionLoading = true);
    final success = await ApiService.resolveSession(widget.conversation.sessionId);

    setState(() {
      _isActionLoading = false;
      if (success) {
        _isLockedByStaff = false;
      }
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Đã đánh dấu hoàn tất. Bot tự động sẽ tiếp tục trả lời.'
              : 'Thao tác thất bại.'),
          backgroundColor: success ? AppColors.success : AppColors.danger,
        ),
      );
    }
  }

  // 3. AI Chuốt Lời (AI Polish Writing Assistant)
  Future<void> _handleAIPolish() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng gõ vài ý phác thảo trước khi bấm AI Chuốt Lời!'),
          backgroundColor: AppColors.accent,
        ),
      );
      return;
    }

    setState(() => _isPolishing = true);
    final polishedText = await ApiService.polishMessageDraft(text);
    setState(() => _isPolishing = false);

    if (polishedText != null && mounted) {
      _messageController.text = polishedText;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✨ AI đã chuốt lời văn phong CSKH chuyên nghiệp!'),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  // 4. Gửi tin nhắn phản hồi
  Future<void> _handleSendMessage([String? customText]) async {
    final text = (customText ?? _messageController.text).trim();
    if (text.isEmpty) return;

    if (customText == null) {
      _messageController.clear();
    }

    // Optimistic UI update: hiện ngay lên màn hình
    setState(() {
      _messages.add(
        ChatMessage(
          id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'staff',
          text: text,
          createdAt: DateTime.now(),
        ),
      );
      _isLockedByStaff = true;
    });
    _scrollToBottom();

    await ApiService.sendStaffReply(widget.conversation.sessionId, text);
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
            Text(
              widget.conversation.customerName,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              '${widget.conversation.phone ?? "ID: ${widget.conversation.sessionId}"} • ${_isLockedByStaff ? "Đã tiếp quản" : "Bot tự động"}',
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          if (!_isLockedByStaff)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
              child: ElevatedButton.icon(
                onPressed: _isActionLoading ? null : _handleTakeOver,
                icon: const Icon(Icons.support_agent, size: 16),
                label: const Text('Tiếp Quản', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
              child: OutlinedButton.icon(
                onPressed: _isActionLoading ? null : _handleResolve,
                icon: const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                label: const Text('Hoàn Tất', style: TextStyle(fontSize: 12, color: AppColors.success)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.success),
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
              color: AppColors.danger,
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
                      foregroundColor: AppColors.danger,
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
                final isUser = msg.sender == 'user';
                final isStaff = msg.sender == 'staff';

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                    decoration: BoxDecoration(
                      color: isUser
                          ? AppColors.primary
                          : (isStaff ? const Color(0xFF1E3A5F) : AppColors.cardBg),
                      borderRadius: BorderRadius.circular(14).copyWith(
                        bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(14),
                        bottomLeft: !isUser ? const Radius.circular(2) : const Radius.circular(14),
                      ),
                      border: isStaff ? Border.all(color: AppColors.primaryLight) : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isUser ? 'Khách hàng' : (isStaff ? '👨‍💼 Bạn (CSKH)' : '🤖 Trợ lý Bot AI'),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isUser
                                ? Colors.white70
                                : (isStaff ? AppColors.primaryLight : AppColors.textMuted),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          msg.text,
                          style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // GỢI Ý CÂU TRẢ LỜI NHANH (QUICK TEMPLATES)
          Container(
            color: AppColors.cardBg,
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              itemCount: _quickTemplates.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                return InkWell(
                  onTap: () => _handleSendMessage(_quickTemplates[i]),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.inputBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Text(
                      _quickTemplates[i],
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ),
                );
              },
            ),
          ),

          // KHUNG NHẬP TIN NHẮN & NÚT AI CHUỐT LỜI
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: AppColors.cardBg,
            child: SafeArea(
              child: Row(
                children: [
                  // Nút AI Polish
                  IconButton(
                    onPressed: _isPolishing ? null : _handleAIPolish,
                    icon: _isPolishing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                          )
                        : const Icon(Icons.auto_awesome, color: AppColors.accent, size: 22),
                    tooltip: 'AI Chuốt Lời',
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: _isLockedByStaff
                            ? 'Nhập phản hồi gửi đến khách...'
                            : 'Nhập tin nhắn (tự động tiếp quản)...',
                        hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                        filled: true,
                        fillColor: AppColors.inputBg,
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
                    backgroundColor: AppColors.primary,
                    radius: 20,
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 18),
                      onPressed: () => _handleSendMessage(),
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
