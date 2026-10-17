// OpenAPI 3.0 Specification for Go QuestX Multi-Tenant SaaS
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Go QuestX Multi-Tenant AI Chatbot SaaS API',
    version: '1.0.0',
    description: 'Tài liệu API đặc tả chuẩn OpenAPI 3.0 cho hệ thống SaaS Chatbot đa doanh nghiệp (RAG, Optimistic Locking, VietQR, Livechat Escalation).'
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Development Server' }
  ],
  paths: {
    '/admin-api/auth/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Đăng nhập Super Admin',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin_homenest' },
                  password: { type: 'string', example: 'SecurePass123' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Đăng nhập thành công, trả về JWT Token và thông tin Admin' }
        }
      }
    },
    '/admin-api/dashboard': {
      get: {
        tags: ['Super Admin'],
        summary: 'Lấy số liệu KPI tổng quan nền tảng (MRR, Tenants, Registrations, Tickets)',
        responses: { '200': { description: 'Thành công' } }
      }
    },
    '/admin-api/clients': {
      get: {
        tags: ['Super Admin'],
        summary: 'Danh sách tất cả doanh nghiệp (Tenants) cùng số liệu sử dụng Quota',
        responses: { '200': { description: 'Thành công' } }
      },
      post: {
        tags: ['Super Admin'],
        summary: 'Khởi tạo thủ công một doanh nghiệp mới',
        responses: { '201': { description: 'Tạo thành công' } }
      }
    },
    '/admin-api/clients/toggle-status': {
      post: {
        tags: ['Super Admin'],
        summary: 'Khóa hoặc mở khóa quyền truy cập của một doanh nghiệp',
        responses: { '200': { description: 'Cập nhật thành công' } }
      }
    },
    '/admin-api/plans': {
      get: {
        tags: ['Super Admin Plans'],
        summary: 'Danh sách các gói cước subscription',
        responses: { '200': { description: 'Thành công' } }
      },
      post: {
        tags: ['Super Admin Plans'],
        summary: 'Tạo gói cước mới',
        responses: { '201': { description: 'Thành công' } }
      }
    },
    '/api/login': {
      post: {
        tags: ['Client & Employee Auth'],
        summary: 'Đăng nhập cho Doanh Nghiệp (Client Owner) hoặc Nhân viên (Staff)',
        responses: { '200': { description: 'Đăng nhập thành công' } }
      }
    },
    '/api/client/register-client': {
      post: {
        tags: ['Landing & Registration'],
        summary: 'Khách hàng tự đăng ký doanh nghiệp & mua gói cước từ Website',
        responses: { '201': { description: 'Đăng ký thành công kèm mã QR thanh toán' } }
      }
    },
    '/api/client/me': {
      get: {
        tags: ['Client Dashboard'],
        summary: 'Lấy thông tin tenant, hạn mức quota nhân sự và tài liệu RAG',
        responses: { '200': { description: 'Thành công' } }
      },
      put: {
        tags: ['Client Dashboard'],
        summary: 'Cập nhật cấu hình Chatbot Widget (Màu sắc, câu chào, bộ lọc từ khóa)',
        responses: { '200': { description: 'Thành công' } }
      }
    },
    '/api/client-file/upload': {
      post: {
        tags: ['RAG Knowledge Pipeline'],
        summary: 'Tải tài liệu lên và tự động băm Vector Chunks (có kiểm soát File Quota)',
        responses: { '201': { description: 'Nạp tri thức thành công' } }
      }
    },
    '/api/client/chat/take-session': {
      post: {
        tags: ['CSKH Livechat & Handoff'],
        summary: 'Nhân viên tiếp quản hội thoại (Optimistic Locking & Bot Silence)',
        responses: { '200': { description: 'Tiếp quản thành công' } }
      }
    },
    '/api/widget/chat': {
      post: {
        tags: ['Widget Public Chat'],
        summary: 'Nhận tin nhắn từ khách hàng, phân tích RAG, Sentiment Escalation và Carousel',
        responses: { '200': { description: 'Phản hồi chatbot' } }
      }
    }
  },
  components: {
    schemas: {
      Admin: {
        type: 'object',
        properties: {
          username: { type: 'string', example: 'admin_homenest' },
          name: { type: 'string', example: 'Super Administrator' },
          role: { type: 'string', example: 'superadmin' },
          avatar: { type: 'string', example: 'https://...' }
        }
      },
      Client: {
        type: 'object',
        properties: {
          clientId: { type: 'string', example: 'HN-DEMO-001' },
          company_name: { type: 'string', example: 'HomeNest Real' },
          email: { type: 'string', example: 'contact@homenest.vn' },
          status: { type: 'string', example: 'active' }
        }
      }
    }
  }
};
