const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// POST /api/login (Dành cho Client Owner hoặc Nhân viên)
exports.loginClient = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Thiếu thông tin đăng nhập' });
  }

  // 1. Kiểm tra tài khoản Client Owner
  const client = db.clients.find(c => (c.username === username || c.email === username) && c.password === password);
  if (client) {
    const token = jwt.sign(
      { id: client._id, clientId: client.clientId, role: 'client_owner', username: client.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      ok: true,
      token,
      role: 'client_owner',
      clientId: client.clientId,
      company_name: client.company_name
    });
  }

  // 2. Kiểm tra tài khoản Nhân viên (User)
  const employee = db.users.find(u => u.username === username && u.password === password);
  if (employee) {
    const parentClient = db.findClientById(employee.clientId);
    const token = jwt.sign(
      { id: employee._id, clientId: employee.clientId, role: employee.role, username: employee.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    return res.json({
      ok: true,
      token,
      role: employee.role,
      clientId: employee.clientId,
      company_name: parentClient ? parentClient.company_name : 'Company'
    });
  }

  return res.status(401).json({ ok: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
};

// GET /api/client/me
exports.getMe = (req, res) => {
  const client = req.client;
  const plan = db.getPlanById(client.subscription_plan_id);
  const users = db.getUsersByClient(client.clientId);
  const files = db.getFilesByClient(client.clientId);
  const leads = db.getLeadsByClient(client.clientId);

  const now = new Date();
  const planEnd = new Date(client.subscription_plan_end);
  const daysRemaining = Math.max(0, Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24)));

  return res.json({
    ok: true,
    client: {
      clientId: client.clientId,
      company_name: client.company_name,
      email: client.email,
      status: client.status,
      chatMode: client.chatMode || 'bot',
      subscription: {
        plan_name: plan ? plan.name : 'Unknown',
        plan_id: client.subscription_plan_id,
        plan_end: client.subscription_plan_end,
        days_remaining: daysRemaining,
        max_users: plan ? plan.max_users : 0,
        current_users: users.length,
        max_files: plan ? plan.max_files : 0,
        current_files: files.length
      },
      widget_config: client.widget_config
    },
    stats: {
      total_leads: leads.length,
      total_conversations: db.getChatsByClient(client.clientId).length
    }
  });
};

// PUT /api/client/me (Cập nhật widget config)
exports.updateWidgetConfig = (req, res) => {
  const client = req.client;
  const { color, action_color, welcome_message, require_lead_form, profanity_words } = req.body;

  if (color) client.widget_config.color = color;
  if (action_color) client.widget_config.action_color = action_color;
  if (welcome_message) client.widget_config.welcome_message = welcome_message;
  if (typeof require_lead_form === 'boolean') client.widget_config.require_lead_form = require_lead_form;
  if (Array.isArray(profanity_words)) client.widget_config.profanity_words = profanity_words;

  return res.json({
    ok: true,
    message: 'Cập nhật cấu hình Widget thành công',
    widget_config: client.widget_config
  });
};

// GET /api/client/employees
exports.getEmployees = (req, res) => {
  const users = db.getUsersByClient(req.clientId);
  return res.json({ ok: true, employees: users });
};

// POST /api/client/create-employee (kết hợp quota middleware checkUserQuota)
exports.createEmployee = (req, res) => {
  const { username, password, fullName, role } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ ok: false, message: 'Vui lòng nhập đủ username, password và họ tên nhân viên' });
  }

  const existing = db.users.find(u => u.username === username);
  if (existing) {
    return res.status(400).json({ ok: false, message: 'Username nhân viên này đã tồn tại' });
  }

  const newEmployee = {
    _id: `user_${Date.now()}`,
    clientId: req.clientId, // ĐẢM BẢO DATA ISOLATION
    username,
    password,
    fullName,
    role: role || 'staff',
    createdAt: new Date().toISOString()
  };

  db.users.push(newEmployee);
  return res.status(201).json({ ok: true, message: 'Tạo tài khoản nhân viên thành công', employee: newEmployee });
};

// GET /api/client/customer-data (Danh sách Leads)
exports.getLeads = (req, res) => {
  const leads = db.getLeadsByClient(req.clientId); // Lọc tuyệt đối theo clientId
  return res.json({ ok: true, total: leads.length, leads });
};

// POST /api/client/register-client (Khách tự đăng ký doanh nghiệp & mua gói từ Landing Page)
exports.registerClient = (req, res) => {
  const { company_name, email, username, password, plan_id, phone } = req.body;
  if (!company_name || !username || !password || !plan_id) {
    return res.status(400).json({ ok: false, message: 'Vui lòng điền đầy đủ tên doanh nghiệp, username, password và chọn gói' });
  }

  const existing = db.clients.find(c => c.username === username || (email && c.email === email));
  if (existing) {
    return res.status(400).json({ ok: false, message: 'Tên đăng nhập hoặc email này đã tồn tại' });
  }

  const plan = db.getPlanById(plan_id) || db.subscriptionPlans[0];
  const clientId = `HN-${Date.now().toString().slice(-6)}`;
  const planEnd = new Date();
  planEnd.setDate(planEnd.getDate() + (plan.duration_days || 30));

  const newClient = {
    _id: `client_${Date.now()}`,
    clientId,
    company_name,
    email: email || `${username}@tenant.goquestx.com`,
    phone: phone || '',
    username,
    password,
    subscription_plan_id: plan._id,
    subscription_plan_end: planEnd.toISOString(),
    status: 'active',
    widget_config: {
      color: '#2563eb',
      action_color: '#1d4ed8',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
      welcome_message: `Xin chào! Tôi là trợ lý AI của ${company_name}. Tôi có thể giúp gì cho bạn?`,
      require_lead_form: true,
      profanity_words: ['lừa đảo', 'chửi bậy', 'ngu ngốc']
    },
    api_keys: { openai: '', gemini: '' },
    ai_provider: 'openai',
    chatMode: 'bot'
  };

  db.clients.push(newClient);

  // Tạo luôn yêu cầu đăng ký vào clientRegistrations để Super Admin theo dõi
  db.clientRegistrations.push({
    _id: `reg_${Date.now()}`,
    name: company_name,
    email: newClient.email,
    phone: phone || '',
    domain: req.body.domain || 'mysite.com',
    plan_id: plan._id,
    status: 'approved',
    notes: 'Khách tự đăng ký và kích hoạt trực tiếp từ Landing Page',
    createdAt: new Date().toISOString()
  });

  // Tạo hóa đơn VietQR tương ứng
  const invoiceCode = `INV-${Date.now().toString().slice(-5)}`;
  const invoice = {
    _id: `inv_${Date.now()}`,
    invoiceCode,
    clientId,
    planId: plan._id,
    planName: plan.name,
    amount: plan.price,
    paymentMethod: 'vietqr',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.invoices.push(invoice);

  const qrUrl = `https://img.vietqr.io/image/MB-0339888999-compact2.png?amount=${plan.price}&addInfo=${invoiceCode}&accountName=HOMENEST%20SAAS`;

  // Tự động cấp Token đăng nhập luôn
  const token = jwt.sign(
    { id: newClient._id, clientId: newClient.clientId, role: 'client_owner', username: newClient.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    ok: true,
    message: 'Đăng ký doanh nghiệp thành công!',
    token,
    client: {
      clientId: newClient.clientId,
      company_name: newClient.company_name,
      username: newClient.username
    },
    invoice: {
      invoiceCode,
      amount: plan.price,
      qrUrl,
      planName: plan.name
    }
  });
};

// GET /api/client/plans
exports.getPlans = (req, res) => {
  return res.json({ ok: true, plans: db.subscriptionPlans });
};

// POST /api/client/support (Client gửi ticket hỗ trợ)
exports.createSupportTicket = (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ ok: false, message: 'Thiếu tiêu đề hoặc nội dung yêu cầu hỗ trợ' });
  }

  const ticketId = `TCK-${Date.now().toString().slice(-4)}`;
  const ticket = {
    _id: `ticket_${Date.now()}`,
    ticketId,
    clientId: req.clientId,
    subject,
    status: 'open',
    created_at: new Date().toISOString(),
    responses: [
      {
        message,
        admin: false,
        created_at: new Date().toISOString()
      }
    ]
  };

  db.supportTickets.push(ticket);
  return res.status(201).json({ ok: true, message: 'Gửi ticket hỗ trợ thành công', ticket });
};

// GET /api/client/support-tickets
exports.getSupportTickets = (req, res) => {
  const tickets = db.getTicketsByClient(req.clientId);
  return res.json({ ok: true, tickets });
};

// POST /api/client/support-tickets/:ticketId/reply
exports.replySupportTicket = (req, res) => {
  const ticket = db.supportTickets.find(t => (t.ticketId === req.params.ticketId || t._id === req.params.ticketId) && t.clientId === req.clientId);
  if (!ticket) return res.status(404).json({ ok: false, message: 'Không tìm thấy ticket' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ ok: false, message: 'Thiếu nội dung phản hồi' });

  ticket.responses.push({
    message,
    admin: false,
    created_at: new Date().toISOString()
  });

  return res.json({ ok: true, message: 'Phản hồi thành công', ticket });
};

// GET /api/client/dashboard/today
exports.getDashboardToday = (req, res) => {
  const clientChats = db.getChatsByClient(req.clientId);
  const clientLeads = db.getLeadsByClient(req.clientId);
  const clientFiles = db.getFilesByClient(req.clientId);

  return res.json({
    ok: true,
    today: {
      chats_count: clientChats.length,
      leads_count: clientLeads.length,
      files_count: clientFiles.length,
      bot_messages_sent: db.messages.filter(m => m.clientId === req.clientId && m.sender === 'bot').length
    }
  });
};
