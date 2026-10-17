const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'questx_super_secret_jwt_key_2026';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'homenest_admin_token_key';

/**
 * Middleware xác thực Super Admin
 */
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Chưa xác thực hoặc không có quyền Admin' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ ok: false, message: 'Quyền truy cập bị từ chối' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token Admin không hợp lệ hoặc đã hết hạn' });
  }
}

/**
 * Middleware xác thực Client / Nhân viên
 * Tự động trích xuất req.clientId để đảm bảo Data Isolation
 */
function verifyClient(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Chưa đăng nhập. Vui lòng cung cấp JWT token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = db.findClientById(decoded.clientId);

    if (!client) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy doanh nghiệp (Client) tương ứng' });
    }

    // Gắn thông tin tenant vào context request
    req.clientId = client.clientId;
    req.client = client;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token không hợp lệ hoặc phiên đăng nhập đã hết hạn' });
  }
}

module.exports = {
  verifyAdmin,
  verifyClient,
  JWT_SECRET,
  ADMIN_SECRET
};
