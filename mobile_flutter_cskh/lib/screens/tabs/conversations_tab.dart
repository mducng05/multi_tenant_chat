import 'package:flutter/material.dart';
import '../../constants/app_colors.dart';
import '../../models/conversation_model.dart';
import '../../services/api_service.dart';
import '../chat_detail_screen.dart';

/// Tab 1: Danh sách hội thoại CSKH với bộ lọc và tìm kiếm
class ConversationsTab extends StatefulWidget {
  const ConversationsTab({super.key});

  @override
  State<ConversationsTab> createState() => _ConversationsTabState();
}

class _ConversationsTabState extends State<ConversationsTab> {
  List<Conversation> _allConversations = [];
  String _selectedFilter = 'all'; // 'all' | 'escalated' | 'staff' | 'bot'
  String _searchQuery = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    final list = await ApiService.getConversations();
    if (mounted) {
      setState(() {
        _allConversations = list;
        _isLoading = false;
      });
    }
  }

  List<Conversation> get _filteredList {
    return _allConversations.where((c) {
      // 1. Lọc theo trạng thái Tab Chip
      if (_selectedFilter == 'escalated' && !c.isEscalated) return false;
      if (_selectedFilter == 'staff' && !c.isLockedByStaff) return false;
      if (_selectedFilter == 'bot' && (c.isLockedByStaff || c.isEscalated)) return false;

      // 2. Lọc theo từ khóa tìm kiếm
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchName = c.customerName.toLowerCase().contains(query);
        final matchPhone = c.phone?.toLowerCase().contains(query) ?? false;
        final matchId = c.sessionId.toLowerCase().contains(query);
        return matchName || matchPhone || matchId;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredList;
    final int escalatedCount = _allConversations.where((c) => c.isEscalated).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.cardBg,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              ApiService.companyName ?? 'CSKH Trực Tuyến',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              '${_allConversations.length} cuộc trò chuyện • $escalatedCount cần xử lý khẩn',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. THANH TÌM KIẾM
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Tìm theo tên, SĐT hoặc mã hội thoại...',
                hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted, size: 20),
                filled: true,
                fillColor: AppColors.cardBg,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
              ),
            ),
          ),

          // 2. BỘ LỌC NHANH (CHIP FILTER)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                _buildFilterChip('Tất cả (${_allConversations.length})', 'all'),
                const SizedBox(width: 8),
                _buildFilterChip(
                  '🚨 Khẩn cấp ($escalatedCount)',
                  'escalated',
                  isDanger: true,
                ),
                const SizedBox(width: 8),
                _buildFilterChip('👨‍💼 Đã tiếp quản', 'staff'),
                const SizedBox(width: 8),
                _buildFilterChip('🤖 Bot tự động', 'bot'),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // 3. DANH SÁCH CUỘC TRÒ CHUYỆN
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchData,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : list.isEmpty
                      ? const Center(
                          child: Text(
                            'Không tìm thấy cuộc trò chuyện nào',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: list.length,
                          itemBuilder: (context, index) {
                            final chat = list[index];
                            return _buildConversationItem(chat);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, {bool isDanger = false}) {
    final bool isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected
              ? Colors.white
              : (isDanger ? AppColors.danger : AppColors.textMuted),
        ),
      ),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedFilter = value),
      selectedColor: isDanger ? AppColors.danger : AppColors.primary,
      backgroundColor: AppColors.cardBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isDanger ? AppColors.danger.withOpacity(0.4) : AppColors.cardBorder,
        ),
      ),
      showCheckmark: false,
    );
  }

  Widget _buildConversationItem(Conversation chat) {
    return Card(
      color: AppColors.cardBg,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: chat.isEscalated ? AppColors.danger : AppColors.cardBorder,
          width: chat.isEscalated ? 2 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ChatDetailScreen(conversation: chat),
            ),
          );
          _fetchData();
        },
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
                        radius: 20,
                        backgroundColor: chat.isEscalated
                            ? AppColors.danger.withOpacity(0.2)
                            : AppColors.primary.withOpacity(0.2),
                        child: Text(
                          chat.customerName.isNotEmpty
                              ? chat.customerName.substring(0, 1).toUpperCase()
                              : 'K',
                          style: TextStyle(
                            color: chat.isEscalated ? AppColors.danger : AppColors.primaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            chat.customerName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            chat.phone ?? 'Mã: ${chat.sessionId}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Badge Trạng thái
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: chat.isEscalated
                          ? AppColors.danger.withOpacity(0.2)
                          : (chat.isLockedByStaff
                              ? AppColors.primary.withOpacity(0.2)
                              : AppColors.success.withOpacity(0.2)),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      chat.isEscalated
                          ? '🚨 KHẨN CẤP'
                          : (chat.isLockedByStaff ? '👨‍💼 Tiếp quản' : '🤖 Bot'),
                      style: TextStyle(
                        color: chat.isEscalated
                            ? const Color(0xFFF87171)
                            : (chat.isLockedByStaff ? AppColors.primaryLight : AppColors.success),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                chat.lastMessage,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
