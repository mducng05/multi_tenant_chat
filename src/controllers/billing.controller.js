const db = require('../db/database');

// POST /api/billing/subscribe/detail (Tính toán giá tiền & Proration)
exports.getSubscribeDetail = (req, res) => {
  const { planId } = req.body;
  const newPlan = db.getPlanById(planId);

  if (!newPlan) {
    return res.status(404).json({ ok: false, message: 'Gói cước không tồn tại' });
  }

  const client = req.client;
  const currentPlan = db.getPlanById(client.subscription_plan_id);

  // Tính Proration (Bù trừ số ngày chưa dùng nếu nâng cấp)
  const now = new Date();
  const planEnd = new Date(client.subscription_plan_end);
  const remainingDays = Math.max(0, Math.ceil((planEnd - now) / (1000 * 60 * 60 * 24)));

  let discount = 0;
  if (currentPlan && remainingDays > 0) {
    discount = Math.floor((currentPlan.price / 30) * remainingDays);
  }

  const finalAmount = Math.max(0, newPlan.price - discount);

  return res.json({
    ok: true,
    detail: {
      plan_name: newPlan.name,
      base_price: newPlan.price,
      remaining_days: remainingDays,
      proration_discount: discount,
      final_amount: finalAmount
    }
  });
};

// POST /api/billing/subscribe (Tạo hóa đơn & VietQR động)
exports.createSubscription = (req, res) => {
  const { planId, paymentMethod } = req.body;
  const plan = db.getPlanById(planId);

  if (!plan) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy gói cước' });
  }

  const invoiceCode = `INV-${Date.now().toString().slice(-5)}`;
  const amount = plan.price;

  const invoice = {
    _id: `inv_${Date.now()}`,
    invoiceCode,
    clientId: req.clientId,
    planId: plan._id,
    planName: plan.name,
    amount,
    paymentMethod: paymentMethod || 'vietqr',
    status: 'pending', // pending | success | cancelled
    createdAt: new Date().toISOString()
  };

  db.invoices.push(invoice);

  // Sinh liên kết VietQR động chuẩn NAPAS 247
  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<MEMO>
  const bankId = 'MB'; // Ngân hàng Quân Đội
  const accountNo = '0339888999';
  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${invoiceCode}&accountName=HOMENEST%20SAAS`;

  return res.status(201).json({
    ok: true,
    message: 'Tạo hóa đơn thành công',
    invoice: {
      invoiceCode,
      amount,
      planName: plan.name,
      qrUrl,
      paymentInstructions: `Vui lòng chuyển khoản chính xác số tiền ${amount.toLocaleString('vi-VN')} VNĐ với nội dung chuyển khoản là: ${invoiceCode}`
    }
  });
};

// GET hoặc POST /api/billing/vnpay-ipn (Webhook ngân hàng đối soát tự động)
exports.handleIpnWebhook = (req, res) => {
  const invoiceCode = req.query.vnp_TxnRef || req.body.invoiceCode;
  const amount = Number(req.query.vnp_Amount ? req.query.vnp_Amount / 100 : req.body.amount);

  if (!invoiceCode) {
    return res.status(400).json({ RspCode: '01', Message: 'Missing order code' });
  }

  const invoice = db.invoices.find(i => i.invoiceCode === invoiceCode);
  if (!invoice) {
    return res.status(404).json({ RspCode: '01', Message: 'Invoice not found in unmapped queue' });
  }

  if (invoice.status === 'success') {
    return res.json({ RspCode: '02', Message: 'Invoice already processed' });
  }

  // 1. Kiểm tra số tiền khớp 100%
  if (amount && amount !== invoice.amount) {
    return res.status(400).json({ RspCode: '04', Message: 'Amount mismatch. Moved to unmapped review' });
  }

  // 2. Cập nhật hóa đơn thành công
  invoice.status = 'success';
  invoice.paidAt = new Date().toISOString();

  // 3. Gia hạn và kích hoạt tài nguyên cho Client
  const client = db.findClientById(invoice.clientId);
  if (client) {
    client.status = 'active';
    client.subscription_plan_id = invoice.planId;

    const currentEnd = new Date(client.subscription_plan_end);
    const newEnd = currentEnd > new Date() ? currentEnd : new Date();
    newEnd.setDate(newEnd.getDate() + 30);
    client.subscription_plan_end = newEnd.toISOString();
  }

  return res.json({
    RspCode: '00',
    Message: 'Confirm Success',
    invoiceCode,
    newStatus: 'success',
    newPlanEnd: client ? client.subscription_plan_end : null
  });
};
