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
