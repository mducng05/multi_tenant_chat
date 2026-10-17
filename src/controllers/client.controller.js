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
