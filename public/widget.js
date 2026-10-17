/**
 * Go QuestX Embeddable Chatbot Widget
 * Usage: <script src="http://localhost:5000/widget.js" data-client-id="HN-DEMO-001" data-api-url="http://localhost:5000"></script>
 */
(function() {
  const currentScript = document.currentScript || document.querySelector('script[data-client-id]');
  const clientId = (currentScript && currentScript.getAttribute('data-client-id')) || 'HN-DEMO-001';
  const apiUrl = (currentScript && currentScript.getAttribute('data-api-url')) || window.location.origin;

  let sessionId = localStorage.getItem('gq_session_id') || `sess_${Date.now()}`;
  localStorage.setItem('gq_session_id', sessionId);

  let widgetConfig = {
    color: '#3b82f6',
    action_color: '#2563eb',
    welcome_message: 'Xin chào! Tôi là trợ lý AI thông minh. Tôi có thể giúp gì cho bạn?',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'
  };

  // Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    .gq-widget-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${widgetConfig.color};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-size: 28px;
    }
    .gq-widget-launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 30px rgba(0,0,0,0.35);
    }
    .gq-widget-container {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: gqFadeIn 0.25s ease-out;
    }
    .gq-widget-container.active { display: flex; }
    @keyframes gqFadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .gq-widget-header {
      padding: 16px;
      background: #1e293b;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
    }
    .gq-header-info { display: flex; align-items: center; gap: 10px; }
    .gq-header-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .gq-header-title { font-weight: 600; font-size: 14px; margin: 0; }
    .gq-header-sub { font-size: 11px; color: #10b981; display: flex; align-items: center; gap: 4px; }
    .gq-header-sub::before { content: ""; width: 6px; height: 6px; background: #10b981; border-radius: 50%; display: inline-block; }
    .gq-header-close { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
    .gq-widget-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #090d16;
    }
    .gq-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .gq-msg.bot {
      align-self: flex-start;
      background: #1e293b;
      color: #f1f5f9;
      border-bottom-left-radius: 4px;
      border: 1px solid #334155;
    }
    .gq-msg.user {
      align-self: flex-end;
      background: ${widgetConfig.action_color};
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .gq-msg.staff {
      align-self: flex-start;
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #3b82f6;
      border-bottom-left-radius: 4px;
    }
    .gq-staff-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      background: #3b82f6;
      color: #fff;
      padding: 1px 6px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .gq-product-carousel {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 6px 0;
      margin-top: 6px;
    }
    .gq-prod-card {
      min-width: 170px;
      max-width: 170px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }
    .gq-prod-card img { width: 100%; height: 95px; object-fit: cover; }
    .gq-prod-info { padding: 8px; }
    .gq-prod-title { font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gq-prod-price { color: #f59e0b; font-weight: 700; margin: 4px 0; }
    .gq-prod-btn {
      width: 100%;
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 4px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }
    .gq-widget-footer {
      padding: 12px;
      background: #1e293b;
      border-top: 1px solid #334155;
      display: flex;
      gap: 8px;
    }
    .gq-widget-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid #334155;
      color: #f1f5f9;
      padding: 8px 12px;
      border-radius: 8px;
      outline: none;
      font-size: 13px;
    }
    .gq-widget-input:focus { border-color: ${widgetConfig.color}; }
    .gq-widget-send {
      background: ${widgetConfig.color};
      color: #fff;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
    }
    .gq-quick-chips {
      display: flex;
      gap: 6px;
      padding: 6px 12px;
      background: #131c2e;
      overflow-x: auto;
      border-top: 1px solid #1e293b;
    }
    .gq-chip {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
    }
    .gq-chip:hover { color: #fff; border-color: #3b82f6; }
  `;
  document.head.appendChild(style);

  // Create Elements
  const launcher = document.createElement('div');
  launcher.className = 'gq-widget-launcher';
  launcher.innerHTML = '💬';

  const container = document.createElement('div');
  container.className = 'gq-widget-container';
  container.innerHTML = `
    <div class="gq-widget-header">
      <div class="gq-header-info">
        <img class="gq-header-avatar" src="${widgetConfig.avatar}" alt="Bot">
        <div>
          <div class="gq-header-title">Trợ lý AI Doanh Nghiệp</div>
          <div class="gq-header-sub">Sẵn sàng phản hồi 24/7</div>
        </div>
      </div>
      <button class="gq-header-close">&times;</button>
    </div>
    <div class="gq-widget-messages" id="gq-messages"></div>
    <div class="gq-quick-chips">
      <span class="gq-chip" onclick="window.gqSendPrompt('Tư vấn sản phẩm')">🛍️ Sản phẩm</span>
      <span class="gq-chip" onclick="window.gqSendPrompt('Chính sách bảo hành')">🛡️ Bảo hành</span>
      <span class="gq-chip" onclick="window.gqSendPrompt('Tôi cần gặp nhân viên')">👨‍💼 Nhân viên</span>
    </div>
    <div class="gq-widget-footer">
      <input type="text" class="gq-widget-input" id="gq-input" placeholder="Nhập câu hỏi...">
      <button class="gq-widget-send" id="gq-send">➤</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(container);

  // Toggle Widget
  launcher.addEventListener('click', () => {
    const isActive = container.classList.toggle('active');
    if (isActive && document.getElementById('gq-messages').children.length === 0) {
      appendMessage('bot', widgetConfig.welcome_message);
    }
  });

  container.querySelector('.gq-header-close').addEventListener('click', () => {
    container.classList.remove('active');
  });

  // Fetch Widget Config from Backend
  fetch(`${apiUrl}/public/client/${clientId}`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.widget) {
        widgetConfig = { ...widgetConfig, ...data.widget };
        launcher.style.background = widgetConfig.color;
        const sendBtn = document.getElementById('gq-send');
        if (sendBtn) sendBtn.style.background = widgetConfig.color;
        const avatarImg = container.querySelector('.gq-header-avatar');
        if (avatarImg && widgetConfig.avatar) avatarImg.src = widgetConfig.avatar;
      }
    })
    .catch(err => console.log('Widget config offline, using defaults:', err));

  function appendMessage(sender, text, extra = {}) {
    const list = document.getElementById('gq-messages');
    const msg = document.createElement('div');
    msg.className = `gq-msg ${sender}`;

    if (sender === 'staff') {
      msg.innerHTML = `<span class="gq-staff-badge">👨‍💼 Nhân viên CSKH</span><br>${text}`;
    } else {
      msg.innerHTML = text.replace(/\n/g, '<br>');
    }

    // Render Product Carousel if present
    if (extra.carousel && Array.isArray(extra.carousel) && extra.carousel.length > 0) {
      const carouselDiv = document.createElement('div');
      carouselDiv.className = 'gq-product-carousel';
      extra.carousel.forEach(prod => {
        const pCard = document.createElement('div');
        pCard.className = 'gq-prod-card';
        pCard.innerHTML = `
          <img src="${prod.image || 'https://images.unsplash.com/photo-1558002038-1055907df827?w=300'}" alt="${prod.name}">
          <div class="gq-prod-info">
            <div class="gq-prod-title" title="${prod.name}">${prod.name}</div>
            <div class="gq-prod-price">${Number(prod.price || 0).toLocaleString('vi-VN')} đ</div>
            <button class="gq-prod-btn" onclick="window.gqSelectProduct('${prod.name}')">Chọn mua</button>
          </div>
        `;
        carouselDiv.appendChild(pCard);
      });
      msg.appendChild(carouselDiv);
    }

    list.appendChild(msg);
    list.scrollTop = list.scrollHeight;
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    appendMessage('user', text);

    const input = document.getElementById('gq-input');
    if (input) input.value = '';

    try {
      const res = await fetch(`${apiUrl}/api/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          sessionId,
          message: text
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.status === 'escalated') {
          appendMessage('bot', `⚠️ <b>Hệ thống nhận thấy bạn đang gặp vấn đề cần ưu tiên!</b>\n\nCuộc trò chuyện đã được chuyển khẩn cấp sang Nhân viên Tư Vấn CSKH. Vui lòng giữ máy trong giây lát.`);
        } else {
          appendMessage(data.sender || 'bot', data.reply, { carousel: data.carousel });
        }
      } else {
        appendMessage('bot', data.message || 'Lỗi xử lý yêu cầu.');
      }
    } catch (err) {
      appendMessage('bot', '⚠️ Không thể kết nối đến máy chủ AI.');
    }
  }

  // Handle inputs
  const sendBtn = document.getElementById('gq-send');
  const inputEl = document.getElementById('gq-input');

  sendBtn.addEventListener('click', () => {
    sendMessage(inputEl.value);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage(inputEl.value);
    }
  });

  window.gqSendPrompt = function(promptText) {
    sendMessage(promptText);
  };

  window.gqSelectProduct = function(prodName) {
    sendMessage(`Tôi quan tâm sản phẩm "${prodName}", vui lòng tư vấn thêm!`);
  };

})();
