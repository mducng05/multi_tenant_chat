/// Model khách hàng tiềm năng được AI thu thập từ chat
class CustomerLead {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String notes;
  final String sessionId;
  final DateTime createdAt;

  CustomerLead({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.notes,
    required this.sessionId,
    required this.createdAt,
  });

  factory CustomerLead.fromJson(Map<String, dynamic> json) {
    return CustomerLead(
      id: json['_id'] ?? '',
      name: json['name'] ?? 'Khách Chưa Để Tên',
      phone: json['phone'] ?? '--',
      email: json['email'] ?? '--',
      notes: json['notes'] ?? json['requirement'] ?? 'Quan tâm tư vấn',
      sessionId: json['sessionId'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
