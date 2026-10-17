/**
 * Go QuestX SaaS - In-Memory Database Engine
 * Mô phỏng Mongoose ODM với đầy đủ các collections & cơ chế Data Isolation theo clientId.
 */

class Database {
  constructor() {
    this.admins = [];
    this.subscriptionPlans = [];
    this.clients = [];
    this.users = [];
    this.knowledgeFiles = [];
    this.knowledgeChunks = [];
    this.chats = [];
    this.messages = [];
    this.customers = [];
    this.invoices = [];
    this.unansweredFaqs = [];
    this.products = [];
    this.knowledgeGaps = [];
    this.clientRegistrations = [];
    this.supportTickets = [];

    this.seedInitialData();
  }

  seedInitialData() {
    // 1. Super Admin Homenest
    this.admins.push({
      _id: 'admin_1',
      username: 'admin_homenest',
      password: 'SecurePass123',
      name: 'Quản trị viên HomeNest',
      role: 'superadmin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
    });

    // 2. Subscription Plans
    this.subscriptionPlans.push(
      {
        _id: 'plan_basic',
        name: 'Basic Plan',
        price: 199000,
        max_users: 2,
        max_files: 3,
        message_limit: 1000,
        storage_limit: 50, // MB
        duration_days: 30,
        description: 'Dành cho cá nhân hoặc hộ kinh doanh'
      },
      {
        _id: 'plan_pro',
        name: 'Pro Enterprise Plan',
        price: 499000,
        max_users: 10,
        max_files: 20,
        message_limit: 10000,
        storage_limit: 500, // MB
        duration_days: 30,
        description: 'Dành cho doanh nghiệp vừa và lớn'
      }
    );

    // 3. Demo Client Tenant
    const oneMonthLater = new Date();
    oneMonthLater.setDate(oneMonthLater.getDate() + 30);

    const demoClient = {
      _id: 'client_rec_1',
      clientId: 'HN-DEMO-001',
      company_name: 'Bất Động Sản HomeNest Real',
      email: 'client@homenest.vn',
      username: 'client_demo',
      password: 'ClientPass123',
      subscription_plan_id: 'plan_pro',
      subscription_plan_end: oneMonthLater.toISOString(),
      status: 'active', // active | inactive | suspended | grace_period
      widget_config: {
        color: '#2563eb',
        action_color: '#1d4ed8',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
        welcome_message: 'Xin chào! Em là Trợ lý AI HomeNest. Anh/Chị muốn tìm hiểu về căn hộ 2 phòng ngủ hay bảng giá ưu đãi tháng này ạ?',
        require_lead_form: true,
        profanity_words: ['lừa đảo', 'chửi bậy', 'ngu ngốc']
      },
      api_keys: {
        openai: 'sk-proj-****-DEMO-KEY',
        gemini: ''
      },
      ai_provider: 'openai',
      chatMode: 'bot' // bot | human_handling
    };
    this.clients.push(demoClient);

    // 4. Employee User
    this.users.push({
      _id: 'user_1',
      clientId: 'HN-DEMO-001',
      username: 'staff_tuvan',
      password: 'StaffPass123',
      fullName: 'Nguyễn Văn Tuấn (CSKH)',
      role: 'staff',
      createdAt: new Date().toISOString()
    });

    // 5. Pre-seeded Knowledge File & RAG Chunks
    const sampleFileId = 'file_001';
    this.knowledgeFiles.push({
      _id: sampleFileId,
      clientId: 'HN-DEMO-001',
      file_name: 'Bang_Gia_Can_Ho_HomeNest_2026.pdf',
      file_size: 1024 * 512, // 512 KB
      status: 'ready', // pending | processing | ready | failed
      vector_count: 3,
      createdAt: new Date().toISOString()
    });

    // RAG Knowledge Chunks cho demo client
    this.knowledgeChunks.push(
      {
        _id: 'chunk_1',
        clientId: 'HN-DEMO-001',
        fileId: sampleFileId,
        content: 'Dự án HomeNest Riverside tọa lạc tại Quận 7. Căn hộ 2 phòng ngủ (diện tích 68m2) có giá khởi điểm từ 2.8 tỷ đồng. Chiết khấu 5% khi thanh toán nhanh 95%.',
        keywords: ['căn hộ', '2 phòng ngủ', 'giá', 'quận 7', 'chiết khấu', '68m2', '2.8 tỷ']
      },
      {
        _id: 'chunk_2',
        clientId: 'HN-DEMO-001',
        fileId: sampleFileId,
        content: 'Chính sách vay ngân hàng: Hỗ trợ vay tối đa 70% giá trị căn hộ trong 25 năm, ân hạn nợ gốc và lãi suất 0% trong 18 tháng đầu.',
        keywords: ['vay ngân hàng', 'lãi suất', 'ân hạn', '70%', 'chính sách']
      },
      {
        _id: 'chunk_3',
        clientId: 'HN-DEMO-001',
        fileId: sampleFileId,
        content: 'Thời gian bàn giao nhà dự kiến: Quý 4 năm 2026. Tiêu chuẩn bàn giao bao gồm nội thất liền tường cao cấp từ Kohler và Hafele.',
        keywords: ['bàn giao', 'thời gian', 'tiêu chuẩn', 'nội thất', 'quý 4 2026']
      }
    );

    // 6. Pre-seeded Sample Chat & Lead
    this.customers.push({
      _id: 'cust_01',
      clientId: 'HN-DEMO-001',
      name: 'Trần Minh Quân',
      phone: '0912345678',
      email: 'minhquan@gmail.com',
      context_product_id: 'Can-Ho-2PN',
      createdAt: new Date().toISOString()
    });

    this.chats.push({
      _id: 'chat_01',
      clientId: 'HN-DEMO-001',
      sessionId: 'sess_demo_01',
      customerId: 'cust_01',
      customerName: 'Trần Minh Quân',
      chatMode: 'bot', // bot | human_handling
      status: 'active', // active | escalated | resolved
      sentiment: 'neutral', // positive | neutral | negative
      sentimentScore: 0.1,
      lastMessage: 'Dạ vâng, em đã ghi nhận số điện thoại của anh rồi ạ.',
      updatedAt: new Date().toISOString()
    });

    // 7. Conversational Commerce: Pre-seeded Products (PRD BA-06)
    this.products.push(
      {
        _id: 'prod_01',
        clientId: 'HN-DEMO-001',
        name: 'Căn hộ Studio Smart Home',
        price: 1650000000,
        image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=350',
        product_url: 'https://homenest.vn/can-ho-studio',
        status: 'Active',
        attributes: {
          area: '36m2',
          floor: 'Tầng 12',
          view: 'View Công Viên Nội Khu'
        }
      },
      {
        _id: 'prod_02',
        clientId: 'HN-DEMO-001',
        name: 'Căn hộ 2PN Riverside View Sông',
        price: 2800000000,
        image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=350',
        product_url: 'https://homenest.vn/can-ho-2pn',
        status: 'Active',
        attributes: {
          area: '68m2',
          balcony: 'Hướng Nam đón gió',
          furnishing: 'Full nội thất cao cấp'
        }
      },
      {
        _id: 'prod_03',
        clientId: 'HN-DEMO-001',
        name: 'Sky Villa Penthouse Đẳng Cấp',
        price: 8500000000,
        image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=350',
        product_url: 'https://homenest.vn/penthouse',
        status: 'Active',
        attributes: {
          area: '185m2',
          pool: 'Hồ bơi chân mây riêng',
          elevator: 'Thang máy riêng tận cửa'
        }
      }
    );

    // 8. Auto-learning: Knowledge Gaps (PRD BA-01)
    this.knowledgeGaps.push({
      _id: 'gap_01',
      clientId: 'HN-DEMO-001',
      cluster_title: 'Chính sách bảo lãnh ngân hàng & tiến độ xây dựng móng',
      question_count: 5,
      sample_questions: [
        'Dự án có ngân hàng nào bảo lãnh không em?',
        'Bao giờ xong móng hở bạn?',
        'Tiến độ xây dựng hiện tại đến đâu rồi?'
      ],
      status: 'new', // new | resolved | ignored
      suggested_answer: 'Dự án được Ngân hàng Quân Đội (MB) bảo lãnh tiến độ 100%. Hiện tại phần móng đã hoàn thành nghiệm thu vào Quý 1/2026.',
      createdAt: new Date().toISOString()
    });

    // 9. Client Registrations (Yêu cầu đăng ký từ Landing Page - OAS 3.0)
    this.clientRegistrations.push(
      {
        _id: 'reg_01',
        name: 'Công ty Công Nghệ TechLand',
        email: 'contact@techland.vn',
        phone: '0908123456',
        domain: 'techland.vn',
        plan_id: 'plan_pro',
        status: 'pending', // pending | approved | rejected
        notes: 'Chờ đối soát thanh toán gói Pro',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        _id: 'reg_02',
        name: 'Chuỗi Thời Trang Stella Chic',
        email: 'sales@stellachic.vn',
        phone: '0933456789',
        domain: 'stellachic.vn',
        plan_id: 'plan_basic',
        status: 'approved',
        notes: 'Đã duyệt và cấp mã HN-889911',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    );

    // 10. Support Tickets (OAS 3.0)
    this.supportTickets.push({
      _id: 'ticket_01',
      ticketId: 'TCK-1092',
      clientId: 'HN-DEMO-001',
      subject: 'Hỏi về việc băm vector tài liệu PDF scan hình ảnh',
      status: 'open', // open | closed
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      responses: [
        {
          message: 'Chào Admin, tôi upload file PDF scan hóa đơn thì bot báo không đọc được text. Cần làm thế nào?',
          admin: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
          message: 'Chào bạn, hiện tại hệ thống chỉ đọc được PDF dạng Text. Nếu file scan, bạn vui lòng OCR chuyển sang text trước khi tải lên nhé.',
          admin: true,
          created_at: new Date(Date.now() - 3600000 * 3).toISOString()
        }
      ]
    });
  }

  // --- Multi-Tenant Query Helpers ---

  findClientById(clientId) {
    return this.clients.find(c => c.clientId === clientId);
  }

  getFilesByClient(clientId) {
    return this.knowledgeFiles.filter(f => f.clientId === clientId);
  }

  getUsersByClient(clientId) {
    return this.users.filter(u => u.clientId === clientId);
  }

  getLeadsByClient(clientId) {
    return this.customers.filter(c => c.clientId === clientId);
  }

  getChatsByClient(clientId) {
    return this.chats.filter(ch => ch.clientId === clientId);
  }

  getProductsByClient(clientId) {
    return this.products.filter(p => p.clientId === clientId && p.status === 'Active');
  }

  getGapsByClient(clientId) {
    return this.knowledgeGaps.filter(g => g.clientId === clientId);
  }

  getTicketsByClient(clientId) {
    return this.supportTickets.filter(t => t.clientId === clientId);
  }

  getPlanById(planId) {
    return this.subscriptionPlans.find(p => p._id === planId);
  }
}

const db = new Database();
module.exports = db;
