const db = require('../db/database');

// GET /api/client/conversations
exports.getConversations = (req, res) => {
  const chats = db.getChatsByClient(req.clientId);
  return res.json({ ok: true, conversations: chats });
};

// POST /api/client/chat/take-session (Human Handoff SLA với Optimistic Lock - HTTP 409)
exports.takeSession = (req, res) => {
  const { customerId } = req.body;
  if (!customerId) {
    return res.status(400).json({ ok: false, message: 'Thiếu customerId' });
  }

  const chat = db.chats.find(c => c.customerId === customerId && c.clientId === req.clientId);
  if (!chat) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy phiên chat' });
  }

  // OPTIMISTIC LOCK: Nếu phiên chat đã bị nhân viên khác nhận trước đó
  if (chat.chatMode === 'human_handling' && chat.handledBy && chat.handledBy !== req.user.username) {
    return res.status(409).json({
      ok: false,
      code: 'SESSION_ALREADY_TAKEN',
      message: `Phiên chat này đã được tiếp nhận bởi nhân viên ${chat.handledBy}. Bạn không thể nhận đè.`
    });
  }

  // Nhận ca thành công
  chat.chatMode = 'human_handling';
  chat.handledBy = req.user.username;
  chat.updatedAt = new Date().toISOString();

  return res.json({
    ok: true,
    message: 'Nhận ca chat thành công. Bot AI đã được ngắt tự động (Bot Silence) để bạn xử lý.',
    chat
  });
};

// POST /api/client/chat/resolve-session (Kết thúc ca chat, trả quyền lại cho Bot AI)
exports.resolveSession = (req, res) => {
  const { customerId } = req.body;
  const chat = db.chats.find(c => c.customerId === customerId && c.clientId === req.clientId);

  if (!chat) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy phiên chat' });
  }

  chat.chatMode = 'bot';
  chat.handledBy = null;
  chat.updatedAt = new Date().toISOString();

  return res.json({
    ok: true,
    message: 'Đã hoàn tất hỗ trợ. Quyền trả lời tự động đã được chuyển lại cho Bot AI.',
    chat
  });
};

// POST /api/client/reply (Nhân viên phản hồi tin nhắn của khách)
exports.staffReply = (req, res) => {
  const { customerId, message } = req.body;
  if (!customerId || !message) {
    return res.status(400).json({ ok: false, message: 'Thiếu thông tin customerId hoặc nội dung tin nhắn' });
  }

  const chat = db.chats.find(c => c.customerId === customerId && c.clientId === req.clientId);
  if (!chat) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy cuộc trò chuyện' });
  }

  const replyMsg = {
    _id: `msg_${Date.now()}`,
    clientId: req.clientId,
    sessionId: chat.sessionId,
    sender: 'staff',
    senderName: req.user.fullName || req.user.username,
    content: message,
    createdAt: new Date().toISOString()
  };

  db.messages.push(replyMsg);
  chat.lastMessage = `[Nhân viên]: ${message}`;
  chat.updatedAt = new Date().toISOString();

  return res.json({ ok: true, message: 'Đã gửi phản hồi thành công tới khách hàng', reply: replyMsg });
};

// POST /api/client/chat/ai-polish (Trợ lý soạn tin AI Writing Assistant - PRD BA-12)
exports.aiPolishDraft = (req, res) => {
  const { draftText, textVersion } = req.body;
  if (!draftText) {
    return res.status(400).json({ ok: false, message: 'Thiếu nội dung tin nhắn nháp' });
  }

  const lower = draftText.toLowerCase();

  // 1. KIỂM SOÁT GỬI (Send Rule / Hard Block trên từ khóa nghiêm trọng CRITICAL)
  const criticalForbidden = ['cam kết lời 100%', 'chắc chắn x2 tài sản', 'không bao giờ lỗ', 'ngu xuẩn'];
  const hasCritical = criticalForbidden.find(term => lower.includes(term));
  if (hasCritical) {
    return res.status(422).json({
      ok: false,
      code: 'CRITICAL_HARD_BLOCK',
      message: `[CẢNH BÁO VI PHẠM] Phát hiện từ cấm nguy cơ pháp lý: "${hasCritical}". Nút Gửi bị khóa cứng cho đến khi bạn sửa lại.`,
      isBlocked: true
    });
  }

  // 2. Trau chuốt chính tả & Nâng tầm văn phong (Tone improvement)
  let polished = draftText.trim();
  // Giả lập AI Writing Assistant chỉnh sửa
  if (!polished.startsWith('Dạ') && !polished.startsWith('Xin chào')) {
    polished = `Dạ chào Anh/Chị! ${polished.charAt(0).toUpperCase() + polished.slice(1)}`;
  }
  if (!polished.endsWith('ạ.') && !polished.endsWith('ạ!') && !polished.endsWith('ạ?')) {
    polished = `${polished} ạ.`;
  }
  polished += ' Anh/Chị cần em hỗ trợ thêm thông tin gì nữa không ạ?';

  return res.json({
    ok: true,
    textVersion: textVersion || 1,
    originalText: draftText,
    suggestedText: polished,
    tone: 'Lịch sự, Chuyên nghiệp & Thân thiện',
    spellingErrorsFound: 0,
    isBlocked: false
  });
};

// GET /api/client/knowledge-gaps (Lấy danh sách lỗ hổng kiến thức - PRD BA-01)
exports.getKnowledgeGaps = (req, res) => {
  const gaps = db.getGapsByClient(req.clientId);
  return res.json({ ok: true, gaps });
};

// POST /api/client/knowledge-gaps/:id/resolve (Doanh nghiệp nạp kiến thức đóng lỗ hổng)
exports.resolveKnowledgeGap = (req, res) => {
  const gapId = req.params.id;
  const { answer } = req.body;

  const gap = db.knowledgeGaps.find(g => g._id === gapId && g.clientId === req.clientId);
  if (!gap) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy cụm câu hỏi' });
  }

  const finalAnswer = answer || gap.suggested_answer || 'Nội dung giải đáp đã được cập nhật.';

  // 1. Tạo ngay 1 chunk RAG mới trong kho tri thức
  const newChunkId = `chunk_gap_${Date.now()}`;
  db.knowledgeChunks.push({
    _id: newChunkId,
    clientId: req.clientId,
    fileId: 'gap_auto_trained',
    content: finalAnswer,
    keywords: ['ngân hàng', 'bảo lãnh', 'tiến độ', 'móng', 'mb', 'xây dựng']
  });

  // 2. Đổi trạng thái sang Resolved
  gap.status = 'resolved';
  gap.resolvedAt = new Date().toISOString();

  return res.json({
    ok: true,
    message: 'Đã nạp kiến thức mới vào kho tri thức RAG thành công! Chatbot giờ đây đã có thể trả lời chủ đề này.',
    gap
  });
};
