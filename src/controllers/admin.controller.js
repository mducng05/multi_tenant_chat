const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { ADMIN_SECRET } = require('../middleware/auth.middleware');

// POST /admin-api/auth/login
exports.loginAdmin = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }

  const admin = db.admins.find(a => a.username === username && a.password === password);
  if (!admin) {
    return res.status(401).json({ ok: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  }

  const token = jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role },
    ADMIN_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    ok: true,
    token,
    admin: {
      username: admin.username,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar
    }
  });
};

// GET /admin-api/clients
exports.getClients = (req, res) => {
  const clientsWithStats = db.clients.map(c => {
    const plan = db.getPlanById(c.subscription_plan_id);
    const usersCount = db.getUsersByClient(c.clientId).length;
    const filesCount = db.getFilesByClient(c.clientId).length;
    const leadsCount = db.getLeadsByClient(c.clientId).length;

    return {
      ...c,
      plan_name: plan ? plan.name : 'Unknown',
      plan_max_users: plan ? plan.max_users : 0,
      plan_max_files: plan ? plan.max_files : 0,
      stats: {
        users: usersCount,
        files: filesCount,
        leads: leadsCount
      }
    };
  });

  return res.json({ ok: true, clients: clientsWithStats });
};

// POST /admin-api/clients
exports.createClient = (req, res) => {
  const { name, email, username, password, subscription_plan } = req.body;

  if (!name || !username || !password || !subscription_plan) {
    return res.status(400).json({ ok: false, message: 'Vui lòng điền đầy đủ các trường bắt buộc' });
  }

  const existingClient = db.clients.find(c => c.username === username || (email && c.email === email));
  if (existingClient) {
    return res.status(400).json({ ok: false, message: 'Tên đăng nhập hoặc email đã tồn tại trên hệ thống' });
  }

  const plan = db.getPlanById(subscription_plan);
  if (!plan) {
    return res.status(400).json({ ok: false, message: 'Gói dịch vụ được chọn không hợp lệ' });
  }

  const clientId = `HN-${Date.now().toString().slice(-6)}`;
  const planEnd = new Date();
  planEnd.setDate(planEnd.getDate() + (plan.duration_days || 30));

  const newClient = {
    _id: `client_${Date.now()}`,
    clientId,
    company_name: name,
    email: email || `${username}@tenant.goquestx.com`,
    username,
    password,
    subscription_plan_id: subscription_plan,
    subscription_plan_end: planEnd.toISOString(),
    status: 'active',
    widget_config: {
      color: '#2563eb',
      action_color: '#1d4ed8',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
      welcome_message: `Xin chào! Tôi là trợ lý AI của ${name}. Tôi có thể giúp gì cho bạn?`,
      require_lead_form: true,
      profanity_words: ['lừa đảo', 'chửi bậy', 'ngu ngốc']
    },
    api_keys: { openai: '', gemini: '' },
    ai_provider: 'openai',
    chatMode: 'bot'
  };

  db.clients.push(newClient);

  return res.status(201).json({
    ok: true,
    message: 'Tạo tài khoản Client thành công',
    clientId,
    client: newClient
  });
};

// POST /admin-api/clients/toggle-status
exports.toggleClientStatus = (req, res) => {
  const { clientId, status } = req.body;
  const client = db.findClientById(clientId);
  if (!client) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy Client' });
  }

  client.status = status || (client.status === 'active' ? 'suspended' : 'active');
  return res.json({ ok: true, message: `Đã đổi trạng thái sang ${client.status}`, client });
};

// GET /admin-api/plans
exports.getPlans = (req, res) => {
  return res.json({ ok: true, plans: db.subscriptionPlans });
};

// POST /admin-api/plans
exports.createPlan = (req, res) => {
  const { name, price, max_users, max_files, message_limit, storage_limit, duration_days } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ ok: false, message: 'Thiếu tên hoặc giá gói cước' });
  }

  const newPlan = {
    _id: `plan_${Date.now()}`,
    name,
    price: Number(price),
    max_users: Number(max_users || 5),
    max_files: Number(max_files || 10),
    message_limit: Number(message_limit || 5000),
    storage_limit: Number(storage_limit || 100),
    duration_days: Number(duration_days || 30),
    description: req.body.description || 'Gói cước tiêu chuẩn'
  };

  db.subscriptionPlans.push(newPlan);
  return res.status(201).json({ ok: true, message: 'Tạo gói cước thành công', plan: newPlan });
};

// PUT /admin-api/plans/:id
exports.updatePlan = (req, res) => {
  const plan = db.getPlanById(req.params.id);
  if (!plan) return res.status(404).json({ ok: false, message: 'Không tìm thấy gói cước' });

  const { name, price, max_users, max_files, message_limit, storage_limit } = req.body;
  if (name) plan.name = name;
  if (price !== undefined) plan.price = Number(price);
  if (max_users) plan.max_users = Number(max_users);
  if (max_files) plan.max_files = Number(max_files);
  if (message_limit) plan.message_limit = Number(message_limit);
  if (storage_limit) plan.storage_limit = Number(storage_limit);

  return res.json({ ok: true, message: 'Cập nhật gói cước thành công', plan });
};

// DELETE /admin-api/plans/:id
exports.deletePlan = (req, res) => {
  const idx = db.subscriptionPlans.findIndex(p => p._id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, message: 'Không tìm thấy gói cước' });
  db.subscriptionPlans.splice(idx, 1);
  return res.json({ ok: true, message: 'Xóa gói cước thành công' });
};

// GET /admin-api/dashboard
exports.getDashboardStats = (req, res) => {
  const totalClients = db.clients.length;
  const activeClients = db.clients.filter(c => c.status === 'active').length;
  const totalUsers = db.users.length;
  const totalFiles = db.knowledgeFiles.length;
  const totalLeads = db.customers.length;
  const totalTickets = db.supportTickets.length;
  const openTickets = db.supportTickets.filter(t => t.status === 'open').length;
  const pendingRegistrations = db.clientRegistrations.filter(r => r.status === 'pending').length;

  // Tính tổng doanh thu từ hóa đơn thành công
  const totalRevenue = db.invoices
    .filter(i => i.status === 'success')
    .reduce((sum, i) => sum + i.amount, 0);

  return res.json({
    ok: true,
    stats: {
      total_clients: totalClients,
      active_clients: activeClients,
      total_users: totalUsers,
      total_files: totalFiles,
      total_leads: totalLeads,
      total_revenue: totalRevenue,
      total_mrr_revenue: totalRevenue,
      open_tickets: openTickets,
      total_tickets: totalTickets,
      pending_registrations: pendingRegistrations
    }
  });
};

// GET /admin-api/client-registrations
exports.getClientRegistrations = (req, res) => {
  const { status, search } = req.query;
  let list = db.clientRegistrations;

  if (status && status !== 'all') {
    list = list.filter(r => r.status === status);
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(r => (r.name && r.name.toLowerCase().includes(s)) || (r.email && r.email.toLowerCase().includes(s)));
  }

  return res.json({ ok: true, registrations: list });
};

// POST /admin-api/client-registrations/:id/approve
exports.approveRegistration = (req, res) => {
  const reg = db.clientRegistrations.find(r => r._id === req.params.id);
  if (!reg) return res.status(404).json({ ok: false, message: 'Không tìm thấy đơn đăng ký' });

  reg.status = 'approved';
  reg.notes = req.body.notes || 'Đã duyệt bởi Admin';

  // Tự động tạo bản ghi Client tương ứng
  const plan = db.getPlanById(reg.plan_id) || db.subscriptionPlans[0];
  const clientId = `HN-${Date.now().toString().slice(-6)}`;
  const planEnd = new Date();
  planEnd.setDate(planEnd.getDate() + (plan.duration_days || 30));

  const username = reg.email ? reg.email.split('@')[0] : `client_${Date.now().toString().slice(-4)}`;
  const newClient = {
    _id: `client_${Date.now()}`,
    clientId,
    company_name: reg.name,
    email: reg.email,
    username,
    password: 'ClientPass123',
    subscription_plan_id: plan._id,
    subscription_plan_end: planEnd.toISOString(),
    status: 'active',
    widget_config: {
      color: '#2563eb',
      action_color: '#1d4ed8',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
      welcome_message: `Xin chào! Tôi là trợ lý AI của ${reg.name}. Tôi có thể giúp gì cho bạn?`,
      require_lead_form: true,
      profanity_words: ['lừa đảo', 'chửi bậy', 'ngu ngốc']
    },
    api_keys: { openai: '', gemini: '' },
    ai_provider: 'openai',
    chatMode: 'bot'
  };

  db.clients.push(newClient);

  return res.json({
    ok: true,
    message: 'Phê duyệt thành công và đã cấp tài khoản Client mới',
    registration: reg,
    client: newClient
  });
};

// POST /admin-api/client-registrations/:id/reject
exports.rejectRegistration = (req, res) => {
  const reg = db.clientRegistrations.find(r => r._id === req.params.id);
  if (!reg) return res.status(404).json({ ok: false, message: 'Không tìm thấy đơn đăng ký' });

  reg.status = 'rejected';
  reg.notes = req.body.notes || 'Từ chối duyệt';
  return res.json({ ok: true, message: 'Đã từ chối đơn đăng ký', registration: reg });
};

// GET /admin-api/support-tickets
exports.getSupportTickets = (req, res) => {
  return res.json({ ok: true, tickets: db.supportTickets });
};

// POST /admin-api/support-tickets/:ticketId/reply
exports.replySupportTicket = (req, res) => {
  const ticket = db.supportTickets.find(t => t.ticketId === req.params.ticketId || t._id === req.params.ticketId);
  if (!ticket) return res.status(404).json({ ok: false, message: 'Không tìm thấy ticket' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ ok: false, message: 'Thiếu nội dung phản hồi' });

  ticket.responses.push({
    message,
    admin: true,
    created_at: new Date().toISOString()
  });

  return res.json({ ok: true, message: 'Phản hồi ticket thành công', ticket });
};

// POST /admin-api/support-tickets/:ticketId/close
exports.closeSupportTicket = (req, res) => {
  const ticket = db.supportTickets.find(t => t.ticketId === req.params.ticketId || t._id === req.params.ticketId);
  if (!ticket) return res.status(404).json({ ok: false, message: 'Không tìm thấy ticket' });

  ticket.status = 'closed';
  return res.json({ ok: true, message: 'Đóng ticket thành công', ticket });
};

// POST /admin-api/support-tickets/:ticketId/open
exports.openSupportTicket = (req, res) => {
  const ticket = db.supportTickets.find(t => t.ticketId === req.params.ticketId || t._id === req.params.ticketId);
  if (!ticket) return res.status(404).json({ ok: false, message: 'Không tìm thấy ticket' });

  ticket.status = 'open';
  return res.json({ ok: true, message: 'Mở lại ticket thành công', ticket });
};
