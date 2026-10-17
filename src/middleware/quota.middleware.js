const db = require('../db/database');

/**
 * Middleware kiểm tra giới hạn số lượng User (Nhân viên) theo Gói cước (AC 2.1)
 */
function checkUserQuota(req, res, next) {
  const client = req.client;
  const plan = db.getPlanById(client.subscription_plan_id);

  if (!plan) {
    return res.status(400).json({ ok: false, message: 'Gói cước của doanh nghiệp không tồn tại' });
  }

  const currentUsers = db.getUsersByClient(client.clientId);
  if (currentUsers.length >= plan.max_users) {
    return res.status(403).json({
      ok: false,
      code: 'QUOTA_EXCEEDED_MAX_USERS',
      message: `Bạn đã đạt giới hạn số lượng người dùng của gói cước hiện tại (${currentUsers.length}/${plan.max_users} users). Vui lòng nâng cấp gói để thêm nhân viên.`
    });
  }

  next();
}

/**
 * Middleware kiểm tra giới hạn số lượng File tài liệu theo Gói cước (AC 2.2)
 */
function checkFileQuota(req, res, next) {
  const client = req.client;
  const plan = db.getPlanById(client.subscription_plan_id);

  if (!plan) {
    return res.status(400).json({ ok: false, message: 'Gói cước của doanh nghiệp không tồn tại' });
  }

  const currentFiles = db.getFilesByClient(client.clientId);
  if (currentFiles.length >= plan.max_files) {
    return res.status(403).json({
      ok: false,
      code: 'QUOTA_EXCEEDED_MAX_FILES',
      message: `Bạn đã đạt giới hạn số lượng tài liệu huấn luyện của gói cước hiện tại (${currentFiles.length}/${plan.max_files} files). Vui lòng nâng cấp gói để tải thêm.`
    });
  }

  next();
}

/**
 * Middleware kiểm tra trạng thái hoạt động và hạn sử dụng gói cước (AC 2.3 & Subscription Lifecycle)
 */
function checkSubscriptionActive(req, res, next) {
  const client = req.client;
  const now = new Date();
  const planEnd = new Date(client.subscription_plan_end);

  if (client.status === 'suspended' || client.status === 'inactive') {
    return res.status(403).json({
      ok: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Tài khoản doanh nghiệp đang bị tạm khóa. Vui lòng liên hệ quản trị viên.'
    });
  }

  if (now > planEnd) {
    // Kiểm tra chính sách Grace Period (3 ngày ân hạn theo PRD BA-09)
    const diffDays = Math.floor((now - planEnd) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) {
      req.isGracePeriod = true;
      // Trong grace period vẫn cho phép đọc và chat ngoài widget
      return next();
    } else {
      client.status = 'downgraded';
      return res.status(403).json({
        ok: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Gói cước đã hết hạn sử dụng. Vui lòng thanh toán gia hạn để tiếp tục sử dụng dịch vụ.'
      });
    }
  }

  next();
}

module.exports = {
  checkUserQuota,
  checkFileQuota,
  checkSubscriptionActive
};
