const db = require('../db/database');

// GET /public/client/:clientId
exports.getWidgetConfig = (req, res) => {
  const { clientId } = req.params;
  const client = db.findClientById(clientId);

  if (!client) {
    return res.status(404).json({ ok: false, message: 'Client ID không tồn tại' });
  }

  const isExpired = new Date() > new Date(client.subscription_plan_end);
  const isSuspended = client.status === 'suspended' || client.status === 'inactive';

  return res.json({
    ok: true,
    clientId: client.clientId,
    company_name: client.company_name,
    widget: client.widget_config,
    isActive: !isSuspended && !isExpired,
    status: isSuspended ? 'suspended' : (isExpired ? 'expired' : 'active')
  });
};

// POST /api/widget/chat (Hỗ trợ luồng chat với Profanity Filter, RAG Isolation và Slot-Filling)
exports.chat = (req, res) => {
  const { clientId, sessionId, message, customerName } = req.body;

  if (!clientId || !message) {
    return res.status(400).json({ ok: false, message: 'Thiếu clientId hoặc nội dung tin nhắn' });
  }

  const client = db.findClientById(clientId);
  if (!client) {
    return res.status(404).json({ ok: false, message: 'Không tìm thấy thông tin doanh nghiệp' });
  }

  // 1. Kiểm tra trạng thái hoạt động & Hạn dùng (AC 2.3)
  if (client.status === 'suspended') {
    return res.json({
      ok: true,
      reply: 'Hiện tại hệ thống hỗ trợ tự động của doanh nghiệp đang tạm ngưng. Vui lòng quay lại sau.'
    });
  }

  // 2. Tìm hoặc khởi tạo phiên chat (Chat Session)
  const currentSessionId = sessionId || `sess_${Date.now()}`;
  let chat = db.chats.find(c => c.sessionId === currentSessionId && c.clientId === clientId);
  if (!chat) {
    chat = {
      _id: `chat_${Date.now()}`,
      clientId,
      sessionId: currentSessionId,
      customerId: `cust_${currentSessionId}`,
      customerName: customerName || 'Khách truy cập Web',
      chatMode: 'bot', // bot | human_handling
      status: 'active',
      lastMessage: message,
      updatedAt: new Date().toISOString()
    };
    db.chats.push(chat);
  }

  // Lưu tin nhắn của User vào DB
  db.messages.push({
    _id: `msg_${Date.now()}`,
    clientId,
    sessionId: currentSessionId,
    sender: 'user',
    content: message,
    createdAt: new Date().toISOString()
  });

  // 3. Quy tắc BOT SILENCE: Nếu đang có nhân viên tiếp quản (Human_Handling)
  if (chat.chatMode === 'human_handling') {
    return res.json({
      ok: true,
      sessionId: currentSessionId,
      chatMode: 'human_handling',
      reply: 'Chuyên viên tư vấn đang tiếp nhận cuộc trò chuyện này. Bạn vui lòng đợi trong giây lát, chuyên viên sẽ phản hồi trực tiếp ngay.'
    });
  }

  // 4. KIỂM TRA PROFANITY FILTER (Từ ngữ nhạy cảm / Chửi bậy - AC 4.3)
  const lowerMsg = message.toLowerCase();
  const forbiddenWords = client.widget_config.profanity_words || [];
  const foundBadWord = forbiddenWords.find(word => lowerMsg.includes(word.toLowerCase()));

  if (foundBadWord) {
    const politeWarning = 'Hệ thống nhận thấy tin nhắn chứa từ ngữ chưa phù hợp. Vui lòng sử dụng ngôn từ lịch sự để được trợ lý hỗ trợ tốt nhất.';
    db.messages.push({
      _id: `msg_bot_${Date.now()}`,
      clientId,
      sessionId: currentSessionId,
      sender: 'bot',
      content: politeWarning,
      createdAt: new Date().toISOString()
    });
    return res.json({ ok: true, sessionId: currentSessionId, reply: politeWarning });
  }

  // 4.5. CẢNH BÁO CẢM XÚC TIÊU CỰC & CHUYỂN GIAO KHẨN CẤP (Sentiment Escalation - PRD BA-07)
  const negativeKeywords = ['tệ quá', 'thất vọng', 'bực mình', 'làm ăn vớ vẩn', 'gặp người thật', 'báo công an', 'quá kém', 'tệ hại'];
  const isNegative = negativeKeywords.some(k => lowerMsg.includes(k));

  if (isNegative) {
    chat.status = 'escalated'; // Bật cảnh báo nháy đỏ
    chat.sentiment = 'negative';
    chat.sentimentScore = -0.85;
    chat.updatedAt = new Date().toISOString();

    const escalateReply = '🚨 Dạ em rất tiếc vì trải nghiệm chưa trọn vẹn của mình! Em đã gắn thẻ [CẢNH BÁO KHẨN CẤP] và chuyển ngay cuộc trò chuyện đến Trưởng ca CSKH để hỗ trợ trực tiếp cho Anh/Chị ạ.';
    db.messages.push({
      _id: `msg_bot_${Date.now()}`,
      clientId,
      sessionId: currentSessionId,
      sender: 'bot',
      content: escalateReply,
      createdAt: new Date().toISOString()
    });
    chat.lastMessage = escalateReply;

    return res.json({
      ok: true,
      sessionId: currentSessionId,
      reply: escalateReply,
      sentiment: 'negative',
      isEscalated: true
    });
  }

  // 4.6. THƯƠNG MẠI HỘI THOẠI: GỢI Ý CAROUSEL SẢN PHẨM (Conversational Commerce - PRD BA-06)
  const productKeywords = ['xem nhà', 'danh sách', 'mẫu nhà', 'gợi ý căn', 'sản phẩm', 'xem căn hộ', 'dự án có những căn nào', 'danh sách các căn', 'các căn hộ'];
  const asksForProducts = productKeywords.some(k => lowerMsg.includes(k));

  if (asksForProducts) {
    const activeProducts = db.getProductsByClient(clientId);
    const replyText = `Dạ em xin gửi Anh/Chị danh sách các căn hộ nổi bật nhất đang mở bán tại ${client.company_name} ạ:`;

    db.messages.push({
      _id: `msg_bot_${Date.now()}`,
      clientId,
      sessionId: currentSessionId,
      sender: 'bot',
      content: replyText,
      products: activeProducts,
      createdAt: new Date().toISOString()
    });

    chat.lastMessage = replyText;
    chat.updatedAt = new Date().toISOString();

    return res.json({
      ok: true,
      sessionId: currentSessionId,
      reply: replyText,
      products: activeProducts,
      hasCarousel: true
    });
  }

  // 5. KỸ THUẬT SLOT-FILLING: Khách muốn mua / tư vấn mà chưa để lại SĐT (PRD BA-03)
  const intentKeywords = ['mua', 'đặt cọc', 'bảng giá', 'tư vấn', 'liên hệ', 'alo', 'chính sách'];
  const hasIntent = intentKeywords.some(k => lowerMsg.includes(k));
  const hasPhone = /(03|05|07|08|09)\d{8}/.test(message);

  // Nếu người dùng vừa gửi số điện thoại -> Tự động Lead Capture!
  if (hasPhone) {
    const matchedPhone = message.match(/(03|05|07|08|09)\d{8}/)[0];
    const existingLead = db.customers.find(c => c.phone === matchedPhone && c.clientId === clientId);
    if (!existingLead) {
      db.customers.push({
        _id: `cust_${Date.now()}`,
        clientId,
        sessionId: currentSessionId,
        name: customerName || 'Khách tiềm năng',
        phone: matchedPhone,
        createdAt: new Date().toISOString()
      });
    }

    const leadThankYou = `Dạ cảm ơn Anh/Chị! Em đã ghi nhận số điện thoại (${matchedPhone}). Chuyên viên tư vấn sẽ liên hệ lại qua Zalo/Điện thoại trong ít phút để gửi đầy đủ hồ sơ cho mình ạ!`;
    db.messages.push({
      _id: `msg_bot_${Date.now()}`,
      clientId,
      sessionId: currentSessionId,
      sender: 'bot',
      content: leadThankYou,
      createdAt: new Date().toISOString()
    });
    return res.json({ ok: true, sessionId: currentSessionId, reply: leadThankYou, leadCaptured: true });
  }

  // 6. RAG RETRIEVAL: Tìm kiếm Vector Chunks trong kho tri thức của riêng Client (AC 4.2 Data Isolation)
  const clientChunks = db.knowledgeChunks.filter(c => c.clientId === clientId);
  let bestMatch = null;
  let maxScore = 0;

  for (const chunk of clientChunks) {
    let score = 0;
    for (const kw of chunk.keywords) {
      if (lowerMsg.includes(kw.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = chunk;
    }
  }

  let finalReply = '';

  if (bestMatch && maxScore > 0) {
    // Trả lời dựa trên tài liệu RAG thực tế của Client
    finalReply = `Theo tài liệu chính thức của ${client.company_name}: "${bestMatch.content}"`;

    if (hasIntent && !hasPhone) {
      finalReply += '\n\n💡 Anh/Chị có thể để lại Số điện thoại hoặc Zalo để em gửi thêm tài liệu chi tiết và bảng tính chiết khấu không ạ?';
    }
  } else {
    // Không tìm thấy tri thức (Fallback) -> Lưu vào `unansweredFaqs` cho tính năng AI Auto-learning (PRD BA-01)
    db.unansweredFaqs.push({
      _id: `faq_${Date.now()}`,
      clientId,
      question: message,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    finalReply = `Dạ hiện tại thông tin "${message}" em chưa có trong cẩm nang tài liệu nội bộ. Em đã ghi nhận câu hỏi để cập nhật kiến thức. Anh/Chị có thể bấm nút "Gặp tư vấn viên" hoặc để lại số điện thoại để nhân viên hỗ trợ trực tiếp ạ!`;
  }

  // Lưu tin nhắn Bot vào DB
  db.messages.push({
    _id: `msg_bot_${Date.now()}`,
    clientId,
    sessionId: currentSessionId,
    sender: 'bot',
    content: finalReply,
    createdAt: new Date().toISOString()
  });

  chat.lastMessage = finalReply;
  chat.updatedAt = new Date().toISOString();

  return res.json({
    ok: true,
    sessionId: currentSessionId,
    reply: finalReply,
    isRagFound: !!bestMatch
  });
};

// POST /api/customer/chat-proxy-stream (Proxy gửi hội thoại dạng Stream SSE - OAS 3.0)
exports.chatProxyStream = (req, res) => {
  const { clientId, message } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 1. Gửi sự kiện reasoning chứa confidence score (theo tài liệu OAS 3.0)
  const reasoningEvent = {
    event: 'reasoning',
    confidence: 0.94,
    model: 'gpt-4o-mini-rag',
    timestamp: new Date().toISOString()
  };
  res.write(`event: reasoning\ndata: ${JSON.stringify(reasoningEvent)}\n\n`);

  // 2. Stream từng token trả lời
  const sampleResponse = `Dạ chào Anh/Chị! Căn hộ 2 phòng ngủ tại dự án HomeNest Riverside hiện có giá từ 2.8 tỷ đồng với view sông cực thoáng mát.`;
  const tokens = sampleResponse.split(' ');
  let i = 0;

  const interval = setInterval(() => {
    if (i < tokens.length) {
      res.write(`data: ${JSON.stringify({ token: tokens[i] + ' ' })}\n\n`);
      i++;
    } else {
      res.write(`data: [DONE]\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 100);
};

// POST /api/customer/lead-capture (Chủ động gửi form)
exports.captureLead = (req, res) => {
  const { clientId, name, phone, email, context_product_id, sessionId } = req.body;

  if (!clientId || !phone) {
    return res.status(400).json({ ok: false, message: 'Thiếu clientId hoặc số điện thoại' });
  }

  // Regex kiểm tra số điện thoại Việt Nam
  const phoneRegex = /(03|05|07|08|09)\d{8}$/;
  if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
    return res.status(400).json({ ok: false, message: 'Số điện thoại không đúng định dạng 10 số của Việt Nam' });
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  // Chống trùng lặp Lead trong ngày (Deduplication)
  const existing = db.customers.find(c => c.phone === cleanPhone && c.clientId === clientId);
  if (existing) {
    return res.json({ ok: true, message: 'Thông tin của bạn đã được ghi nhận trước đó', lead: existing });
  }

  const newLead = {
    _id: `cust_${Date.now()}`,
    clientId,
    sessionId: sessionId || `sess_${Date.now()}`,
    name: name || 'Khách hàng',
    phone: cleanPhone,
    email: email || '',
    context_product_id: context_product_id || '',
    createdAt: new Date().toISOString()
  };

  db.customers.push(newLead);

  return res.status(201).json({
    ok: true,
    message: 'Lưu thông tin khách hàng tiềm năng thành công',
    lead: newLead
  });
};
