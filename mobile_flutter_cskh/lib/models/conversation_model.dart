/// Model đại diện cho một tin nhắn trong cuộc trò chuyện
class ChatMessage {
  final String id;
  final String sender; // 'user' | 'bot' | 'staff'
  final String text;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.text,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['_id'] ?? 'msg_${DateTime.now().millisecondsSinceEpoch}',
      sender: json['sender'] ?? 'bot',
      text: json['text'] ?? json['content'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

/// Model đại diện cho một phiên hội thoại của khách hàng
class Conversation {
  final String id;
  final String sessionId;
  final String clientId;
  final String customerName;
  final String? phone;
  final String status; // 'active' | 'escalated' | 'resolved'
  final String? lockedBy;
  final String lastMessage;
  final List<ChatMessage> messages;
  final double sentimentScore;
  final DateTime updatedAt;

  Conversation({
    required this.id,
    required this.sessionId,
    required this.clientId,
    required this.customerName,
    this.phone,
    required this.status,
    this.lockedBy,
    required this.lastMessage,
    required this.messages,
    required this.sentimentScore,
    required this.updatedAt,
  });

  bool get isEscalated => status == 'escalated';
  bool get isLockedByStaff => lockedBy != null;

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final rawMsgs = json['messages'] as List<dynamic>? ?? [];
    return Conversation(
      id: json['_id'] ?? '',
      sessionId: json['sessionId'] ?? '',
      clientId: json['clientId'] ?? '',
      customerName: json['customerName'] ?? 'Khách vãng lai',
      phone: json['phone'],
      status: json['status'] ?? 'active',
      lockedBy: json['lockedBy'],
      lastMessage: json['lastMessage'] ?? 'Bắt đầu cuộc trò chuyện',
      messages: rawMsgs.map((m) => ChatMessage.fromJson(m)).toList(),
      sentimentScore: (json['sentimentScore'] as num?)?.toDouble() ?? 0.0,
      updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
