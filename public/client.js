// Client & Employee Tenant Dashboard Engine - Go QuestX
let clientToken = localStorage.getItem('gq_client_token') || '';
let currentClientId = 'HN-DEMO-001';
let currentRole = 'client_owner';
let activeSessionId = null;
let currentConversations = [];
let currentTickets = [];
let activeClientTicketId = null;
let currentInvoiceCode = '';
let currentInvoiceAmount = 1490000;

// Modal helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// Navigation Tabs
function switchTab(tabId) {
  document.querySelectorAll('.client-nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const btn = document.querySelector(`.client-nav-item[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');

  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');

  if (tabId === 'cl-overview') loadClientMe();
  if (tabId === 'cl-rag') { loadFilesList(); loadKnowledgeGaps(); }
  if (tabId === 'cl-cskh') loadConversations();
  if (tabId === 'cl-employees') loadEmployees();
  if (tabId === 'cl-leads') loadLeadsList();
  if (tabId === 'cl-products') loadProductsList();
  if (tabId === 'cl-widget') loadWidgetSettings();
  if (tabId === 'cl-support') loadClientSupportTickets();
}

document.querySelectorAll('.client-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// Authentication
async function ensureClientAuth() {
  if (clientToken) {
    try {
      const res = await fetch('/api/client/me', {
        headers: { 'Authorization': `Bearer ${clientToken}` }
      });
      if (res.ok) {
        const d = await res.json();
        currentClientId = d.client.clientId;
        return true;
      }
    } catch (e) {}
  }

  // Auto-login with default demo client account
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client_demo', password: 'ClientPass123' })
    });
    const data = await res.json();
    if (data.ok) {
      clientToken = data.token;
      currentClientId = data.clientId;
      currentRole = data.role;
      localStorage.setItem('gq_client_token', clientToken);
      document.getElementById('current-user-role').innerText = data.role === 'client_owner' ? 'Client Owner' : 'Nhân viên';
      return true;
    }
  } catch (err) {
    console.error('Lỗi đăng nhập client:', err);
  }
  return false;
}

function openLoginModal() {
  openModal('modal-login');
}

async function submitClientLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.ok) {
      clientToken = data.token;
      currentClientId = data.clientId;
      currentRole = data.role;
      localStorage.setItem('gq_client_token', clientToken);
      closeModal('modal-login');
      alert(`Đăng nhập thành công! Vai trò: ${data.role}`);
      await loadClientMe();
    } else {
      alert(data.message || 'Sai thông tin đăng nhập');
    }
  } catch (e) {
    alert('Lỗi kết nối máy chủ');
  }
}

// -------------------------------------------------------------
// 1. TỔNG QUAN & QUOTA
// -------------------------------------------------------------
async function loadClientMe() {
  if (!clientToken) return;

  try {
    const res = await fetch('/api/client/me', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const c = data.client;
    const sub = c.subscription;

    // Header & Titles
    document.getElementById('top-company-name').innerText = c.company_name;
    document.getElementById('top-tenant-badge').innerText = c.clientId;
    document.getElementById('header-client-id').innerText = c.clientId;
    document.getElementById('plan-badge-display').innerText = sub.plan_name;
    document.getElementById('status-badge-display').innerText = c.status === 'active' ? '● Active' : '🔒 Locked';
    document.getElementById('status-badge-display').className = `badge ${c.status === 'active' ? 'success' : 'danger'}`;

    // Quotas
    document.getElementById('stat-users').innerText = `${sub.current_users} / ${sub.max_users}`;
    document.getElementById('progress-users').style.width = `${Math.min(100, (sub.current_users / (sub.max_users || 1)) * 100)}%`;

    document.getElementById('stat-files').innerText = `${sub.current_files} / ${sub.max_files}`;
    document.getElementById('progress-files').style.width = `${Math.min(100, (sub.current_files / (sub.max_files || 1)) * 100)}%`;

    document.getElementById('stat-leads').innerText = `${data.stats.total_leads} Leads`;
    document.getElementById('stat-days').innerText = `${sub.days_remaining} ngày`;
    document.getElementById('stat-end-date').innerText = new Date(sub.plan_end).toLocaleDateString('vi-VN');

    // Profile card
    document.getElementById('info-company').innerText = c.company_name;
    document.getElementById('info-email').innerText = c.email;
    document.getElementById('info-chat-mode').innerText = c.chatMode === 'human' ? '👨‍💼 Nhân viên tiếp quản' : '🤖 Bot Tự Động';
    document.getElementById('info-limit-users').innerText = `${sub.max_users} tài khoản`;
    document.getElementById('info-limit-files').innerText = `${sub.max_files} tài liệu RAG`;

    // Embed Snippet
    const embedCode = `<!-- Nhúng Go QuestX Chatbot AI vào Website của bạn -->
<script 
  src="${window.location.origin}/widget.js" 
  data-client-id="${c.clientId}" 
  data-api-url="${window.location.origin}">
</script>`;
    document.getElementById('embed-code-snippet').value = embedCode;

  } catch (err) {
    console.error('Lỗi tải client me:', err);
  }
}

function copyEmbedSnippet() {
  const el = document.getElementById('embed-code-snippet');
  el.select();
  navigator.clipboard.writeText(el.value);
  alert('Đã sao chép mã nhúng script vào Clipboard! Bạn có thể dán vào bất kỳ website nào.');
}

// -------------------------------------------------------------
// 2. HUẤN LUYỆN AI (RAG PIPELINE)
// -------------------------------------------------------------
async function loadFilesList() {
  try {
    const res = await fetch('/api/client-file/files', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const container = document.getElementById('files-list');
    if (data.files.length === 0) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align:center; color: var(--text-muted);">Chưa có tài liệu nào trong Vector Database.</div>`;
      return;
    }

    container.innerHTML = data.files.map(f => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div>
          <b style="color: #f1f5f9;">📄 ${f.name}</b>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Dung lượng: ${(f.size / 1024).toFixed(1)} KB • Băm thành: <b style="color: #60a5fa;">${f.chunksCount || 3} chunks</b> • Trạng thái: <span class="badge success">${f.status}</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteKnowledgeFile('${f._id}')">Xóa</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải danh sách file:', err);
  }
}

async function uploadKnowledgeFile() {
  const fileName = document.getElementById('rag-file-name').value.trim();
  const fileContent = document.getElementById('rag-file-content').value.trim();

  if (!fileName || !fileContent) {
    alert('Vui lòng nhập tên tài liệu và nội dung cần băm Vector');
    return;
  }

  // Tạo blob giả lập upload file .txt
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', blob, fileName);

  try {
    const res = await fetch('/api/client-file/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` },
      body: formData
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Nạp tài liệu thành công! AI đã băm thành ${data.chunksCount} Vector Chunks.`);
      document.getElementById('rag-file-name').value = '';
      document.getElementById('rag-file-content').value = '';
      await loadFilesList();
      await loadClientMe();
    } else {
      alert(data.message || 'Lỗi nạp tài liệu');
    }
  } catch (err) {
    alert('Lỗi kết nối upload');
  }
}

async function deleteKnowledgeFile(fileId) {
  if (!confirm('Bạn có chắc muốn xóa tài liệu này khỏi cơ sở dữ liệu Vector?')) return;

  try {
    const res = await fetch('/api/client-file', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ fileId })
    });
    const data = await res.json();
    if (data.ok) {
      await loadFilesList();
      await loadClientMe();
    }
  } catch (err) {
    alert('Lỗi xóa file');
  }
}

async function loadKnowledgeGaps() {
  try {
    const res = await fetch('/api/client/knowledge-gaps', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const box = document.getElementById('knowledge-gaps-list');
    if (data.gaps.length === 0) {
      box.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); font-size: 0.88rem; text-align:center;">Chưa phát hiện câu hỏi nào thiếu kiến thức.</div>`;
      return;
    }

    box.innerHTML = data.gaps.map(g => `
      <div style="padding: 0.85rem 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.88rem;">
        <div style="color: #fbbf24; font-weight: 600;">❓ "${g.question}"</div>
        <div style="color: var(--text-muted); font-size: 0.78rem; margin-top: 2px;">
          Tần suất: ${g.frequency} lần • Cần bổ sung tài liệu liên quan
        </div>
      </div>
    `).join('');
  } catch (e) {}
}

// -------------------------------------------------------------
// 3. CSKH LIVECHAT & TIẾP QUẢN (OPTIMISTIC LOCKING)
// -------------------------------------------------------------
async function loadConversations() {
  try {
    const res = await fetch('/api/client/conversations', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    currentConversations = data.conversations || [];
    const container = document.getElementById('cskh-sessions-container');

    let hasEscalated = false;
    if (currentConversations.length === 0) {
      container.innerHTML = `<div style="padding: 1.5rem; text-align:center; color: var(--text-muted); font-size: 0.85rem;">Chưa có phiên chat nào từ khách hàng.</div>`;
      return;
    }

    container.innerHTML = currentConversations.map(chat => {
      const isEscalated = chat.status === 'escalated';
      if (isEscalated) hasEscalated = true;
      const isActive = chat.sessionId === activeSessionId;

      return `
        <div class="cskh-session-item ${isActive ? 'active' : ''} ${isEscalated ? 'escalated' : ''}" onclick="selectConversation('${chat.sessionId}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size: 0.88rem; color: #fff;">${chat.customerName || 'Khách Vãng Lai'}</b>
            <span class="badge ${isEscalated ? 'danger' : (chat.status === 'active' ? 'success' : 'info')}" style="font-size: 10px;">
              ${chat.status}
            </span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
            Mã: ${chat.sessionId} • ${chat.phone || 'Chưa có SĐT'}
          </div>
          <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${chat.lastMessage || 'Bắt đầu trò chuyện'}
          </div>
        </div>
      `;
    }).join('');

    const badgeEsc = document.getElementById('badge-escalated-chats');
    if (hasEscalated) {
      badgeEsc.style.display = 'inline-block';
    } else {
      badgeEsc.style.display = 'none';
    }

    if (!activeSessionId && currentConversations.length > 0) {
      selectConversation(currentConversations[0].sessionId);
    } else if (activeSessionId) {
      selectConversation(activeSessionId, false);
    }
  } catch (err) {
    console.error('Lỗi tải cuộc trò chuyện:', err);
  }
}

function selectConversation(sessionId, rerenderList = true) {
  activeSessionId = sessionId;
  const chat = currentConversations.find(c => c.sessionId === sessionId);
  if (!chat) return;

  document.getElementById('active-chat-title').innerText = `${chat.customerName || 'Khách Hàng'} (${chat.sessionId})`;
  document.getElementById('active-chat-sub').innerText = `Trạng thái: ${chat.status} • Xử lý: ${chat.lockedBy ? '👨‍💼 ' + chat.lockedBy : '🤖 Bot Tự Động'}`;

  // Escalation Banner
  const alertBanner = document.getElementById('cskh-escalation-alert');
  if (chat.status === 'escalated') {
    alertBanner.classList.add('active');
  } else {
    alertBanner.classList.remove('active');
  }

  // Render Messages
  const box = document.getElementById('cskh-messages-box');
  const msgs = chat.messages || [];
  if (msgs.length === 0) {
    box.innerHTML = `<div style="text-align:center; color: var(--text-muted); margin-top: 2rem;">Chưa có tin nhắn trong phiên này.</div>`;
  } else {
    box.innerHTML = msgs.map(m => `
      <div class="gq-msg ${m.sender}" style="max-width: 80%;">
        <div style="font-size: 10px; opacity: 0.7; margin-bottom: 2px;">
          ${m.sender === 'user' ? 'Khách hàng' : (m.sender === 'staff' ? '👨‍💼 Nhân viên CSKH' : '🤖 Trợ lý Bot AI')} • ${new Date(m.createdAt).toLocaleTimeString('vi-VN')}
        </div>
        <div>${m.text}</div>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  }

  if (rerenderList) {
    document.querySelectorAll('.cskh-session-item').forEach(item => {
      item.classList.toggle('active', item.innerHTML.includes(sessionId));
    });
  }
}

async function takeOverCurrentSession() {
  if (!activeSessionId) return;

  try {
    const res = await fetch('/api/client/chat/take-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ sessionId: activeSessionId })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Đã tiếp quản thành công! Bot AI hiện đã tạm dừng để bạn trực tiếp trao đổi với khách.');
      await loadConversations();
    } else {
      alert(data.message || 'Lỗi tiếp quản phiên');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

async function resolveCurrentSession() {
  if (!activeSessionId) return;

  try {
    const res = await fetch('/api/client/chat/resolve-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ sessionId: activeSessionId })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Đã đánh dấu hoàn tất hội thoại. Trợ lý AI sẽ tiếp tục hỗ trợ tự động.');
      await loadConversations();
    }
  } catch (err) {
    alert('Lỗi hoàn tất');
  }
}

async function aiPolishDraft() {
  const input = document.getElementById('cskh-reply-input');
  const draft = input.value.trim();
  if (!draft) {
    alert('Vui lòng gõ vài ý phác thảo để AI chuốt lời chuyên nghiệp hơn');
    return;
  }

  try {
    const res = await fetch('/api/client/chat/ai-polish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ draft })
    });
    const data = await res.json();
    if (data.ok) {
      input.value = data.polished;
    }
  } catch (err) {
    alert('Lỗi gọi AI Polish');
  }
}

async function sendStaffReply() {
  if (!activeSessionId) return;
  const input = document.getElementById('cskh-reply-input');
  const message = input.value.trim();
  if (!message) return;

  try {
    const res = await fetch('/api/client/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        sessionId: activeSessionId,
        message
      })
    });
    const data = await res.json();
    if (data.ok) {
      input.value = '';
      await loadConversations();
    } else {
      alert(data.message || 'Lỗi gửi tin nhắn');
    }
  } catch (err) {
    alert('Lỗi kết nối');
  }
}

// -------------------------------------------------------------
// 4. QUẢN LÝ NHÂN SỰ (USER QUOTA)
// -------------------------------------------------------------
async function loadEmployees() {
  try {
    const res = await fetch('/api/client/employees', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const tbody = document.getElementById('employees-table-body');
    if (data.employees.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Chưa có nhân viên nào. Hãy thêm tài khoản nhân viên mới!</td></tr>`;
      return;
    }

    tbody.innerHTML = data.employees.map(e => `
      <tr>
        <td><span class="code-tag">${e._id}</span></td>
        <td><b>${e.fullName}</b></td>
        <td><code>${e.username}</code></td>
        <td><span class="badge ${e.role === 'manager' ? 'warning' : 'info'}">${e.role}</span></td>
        <td><code>${e.clientId}</code></td>
        <td>${new Date(e.createdAt || Date.now()).toLocaleDateString('vi-VN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải nhân viên:', err);
  }
}

function openCreateEmployeeModal() {
  openModal('modal-create-employee');
}

async function submitCreateEmployee() {
  const fullName = document.getElementById('new-emp-fullname').value.trim();
  const username = document.getElementById('new-emp-username').value.trim();
  const password = document.getElementById('new-emp-password').value.trim();
  const role = document.getElementById('new-emp-role').value;

  if (!fullName || !username || !password) {
    alert('Vui lòng nhập đầy đủ thông tin nhân viên');
    return;
  }

  try {
    const res = await fetch('/api/client/create-employee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ fullName, username, password, role })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Tạo tài khoản nhân viên thành công!');
      closeModal('modal-create-employee');
      await loadEmployees();
      await loadClientMe();
    } else {
      alert(`⚠️ ${data.message || 'Lỗi tạo nhân viên'} (Kiểm tra giới hạn User Quota của Gói)`);
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

// -------------------------------------------------------------
// 5. KHÁCH TIỀM NĂNG (LEADS CRM)
// -------------------------------------------------------------
async function loadLeadsList() {
  try {
    const res = await fetch('/api/client/customer-data', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const tbody = document.getElementById('leads-table-body');
    if (data.leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Chưa có Leads nào được thu thập.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.leads.map(l => `
      <tr>
        <td><b>${l.name || 'Khách Chưa Để Tên'}</b></td>
        <td style="color: #60a5fa; font-weight: 600;">${l.phone || '--'}</td>
        <td>${l.email || '--'}</td>
        <td style="color: var(--text-muted);">${l.notes || l.requirement || 'Quan tâm tư vấn'}</td>
        <td><span class="code-tag">${l.sessionId || '--'}</span></td>
        <td>${new Date(l.createdAt || Date.now()).toLocaleDateString('vi-VN')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải leads:', err);
  }
}

// -------------------------------------------------------------
// 6. SẢN PHẨM & CONVERSATIONAL COMMERCE
// -------------------------------------------------------------
async function loadProductsList() {
  try {
    const res = await fetch('/api/client/products', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    const tbody = document.getElementById('products-table-body');
    if (data.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Chưa có sản phẩm trong catalog.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.products.map(p => `
      <tr>
        <td><img src="${p.image || 'https://images.unsplash.com/photo-1558002038-1055907df827?w=100'}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px;" alt=""></td>
        <td>
          <b>${p.name}</b><br>
          <small style="color: var(--text-muted);">${p.description || ''}</small>
        </td>
        <td style="color: #f59e0b; font-weight: 700;">${Number(p.price).toLocaleString('vi-VN')} đ</td>
        <td><span class="badge info">${p.category || 'General'}</span></td>
        <td><span class="badge success">Active</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="alert('Sản phẩm đã sẵn sàng gợi ý tự động qua Chatbot!')">Xem Carousel</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải sản phẩm:', err);
  }
}

function openCreateProductModal() {
  openModal('modal-create-product');
}

async function submitCreateProduct() {
  const name = document.getElementById('prod-name').value.trim();
  const price = Number(document.getElementById('prod-price').value);
  const category = document.getElementById('prod-category').value.trim();
  const image = document.getElementById('prod-image').value.trim();
  const description = document.getElementById('prod-description').value.trim();

  if (!name || isNaN(price)) {
    alert('Vui lòng nhập tên và giá sản phẩm');
    return;
  }

  try {
    const res = await fetch('/api/client/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ name, price, category, image, description })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Thêm sản phẩm thành công!');
      closeModal('modal-create-product');
      await loadProductsList();
    }
  } catch (err) {
    alert('Lỗi tạo sản phẩm');
  }
}

async function triggerWebCrawler() {
  const targetUrl = prompt('Nhập URL website/catalog cần cào sản phẩm:', 'https://store.homenest.vn/products');
  if (!targetUrl) return;

  try {
    const res = await fetch('/api/client/products/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ targetUrl })
    });
    const data = await res.json();
    if (res.status === 202) {
      alert(`Đã kích hoạt tiến trình cào dữ liệu chạy ngầm (HTTP 202 Accepted)!\nMã tác vụ: ${data.jobId}\nDữ liệu sẽ tự động bóc tách vào Catalog.`);
    }
  } catch (err) {
    alert('Lỗi kích hoạt crawler');
  }
}

// -------------------------------------------------------------
// 7. CẤU HÌNH WIDGET
// -------------------------------------------------------------
async function loadWidgetSettings() {
  try {
    const res = await fetch(`/public/client/${currentClientId}`);
    const data = await res.json();
    if (!data.ok || !data.widget) return;

    const w = data.widget;
    document.getElementById('cfg-color').value = w.color || '#2563eb';
    document.getElementById('cfg-color-text').value = w.color || '#2563eb';
    document.getElementById('cfg-action-color').value = w.action_color || '#1d4ed8';
    document.getElementById('cfg-action-color-text').value = w.action_color || '#1d4ed8';
    document.getElementById('cfg-welcome').value = w.welcome_message || '';
    document.getElementById('cfg-require-lead').checked = w.require_lead_form !== false;
    document.getElementById('cfg-profanity').value = (w.profanity_words || []).join(', ');
  } catch (err) {
    console.error('Lỗi tải widget settings:', err);
  }
}

document.getElementById('cfg-color').addEventListener('input', (e) => {
  document.getElementById('cfg-color-text').value = e.target.value;
});
document.getElementById('cfg-action-color').addEventListener('input', (e) => {
  document.getElementById('cfg-action-color-text').value = e.target.value;
});

async function saveWidgetConfig() {
  const color = document.getElementById('cfg-color-text').value;
  const action_color = document.getElementById('cfg-action-color-text').value;
  const welcome_message = document.getElementById('cfg-welcome').value;
  const require_lead_form = document.getElementById('cfg-require-lead').checked;
  const profanityRaw = document.getElementById('cfg-profanity').value;
  const profanity_words = profanityRaw.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/client/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ color, action_color, welcome_message, require_lead_form, profanity_words })
    });
    const data = await res.json();
    if (data.ok) {
      alert('Đã cập nhật cấu hình Chatbot Widget thành công!');
    }
  } catch (err) {
    alert('Lỗi cập nhật cấu hình');
  }
}

// -------------------------------------------------------------
// 8. SUPPORT TICKETS (CLIENT GỬI CHO ADMIN)
// -------------------------------------------------------------
async function loadClientSupportTickets() {
  try {
    const res = await fetch('/api/client/support-tickets', {
      headers: { 'Authorization': `Bearer ${clientToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    currentTickets = data.tickets || [];
    const tbody = document.getElementById('client-tickets-table-body');
    if (currentTickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Bạn chưa gửi ticket hỗ trợ nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentTickets.map(t => `
      <tr>
        <td><span class="code-tag">${t.ticketId}</span></td>
        <td><b>${t.subject}</b></td>
        <td>${new Date(t.created_at).toLocaleDateString('vi-VN')}</td>
        <td><span class="badge ${t.status === 'open' ? 'danger' : 'success'}">${t.status}</span></td>
        <td>${t.responses ? t.responses.length : 0} phản hồi</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openClientTicketDetailModal('${t.ticketId}')">Xem Trao Đổi</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải tickets client:', err);
  }
}

function openCreateTicketModal() {
  document.getElementById('ticket-subject').value = '';
  document.getElementById('ticket-message').value = '';
  openModal('modal-create-ticket');
}

async function submitCreateTicket() {
  const subject = document.getElementById('ticket-subject').value.trim();
  const message = document.getElementById('ticket-message').value.trim();
  if (!subject || !message) {
    alert('Vui lòng điền đủ tiêu đề và nội dung cần hỗ trợ');
    return;
  }

  try {
    const res = await fetch('/api/client/support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ subject, message })
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Đã gửi ticket #${data.ticket.ticketId} thành công đến Super Admin!`);
      closeModal('modal-create-ticket');
      await loadClientSupportTickets();
    }
  } catch (err) {
    alert('Lỗi gửi ticket');
  }
}

function openClientTicketDetailModal(ticketId) {
  const t = currentTickets.find(item => item.ticketId === ticketId);
  if (!t) return;

  activeClientTicketId = t.ticketId;
  document.getElementById('cl-ticket-detail-title').innerText = `🎫 Ticket #${t.ticketId}`;
  document.getElementById('cl-ticket-detail-status').innerText = t.status.toUpperCase();
  document.getElementById('cl-ticket-detail-status').className = `badge ${t.status === 'open' ? 'danger' : 'success'}`;
  document.getElementById('cl-ticket-detail-subject').innerText = t.subject;

  const box = document.getElementById('cl-ticket-messages-box');
  box.innerHTML = (t.responses || []).map(r => `
    <div class="ticket-msg ${r.admin ? 'admin' : 'client'}">
      <div style="font-size: 11px; opacity: 0.75; margin-bottom: 2px;">
        ${r.admin ? '👑 Super Admin Hỗ Trợ' : '🏢 Bạn (Doanh Nghiệp)'} • ${new Date(r.created_at).toLocaleTimeString('vi-VN')}
      </div>
      <div>${r.message}</div>
    </div>
  `).join('');

  document.getElementById('cl-ticket-reply-text').value = '';
  openModal('modal-client-ticket-detail');
}

async function submitClientTicketReply() {
  if (!activeClientTicketId) return;
  const message = document.getElementById('cl-ticket-reply-text').value.trim();
  if (!message) return;

  try {
    const res = await fetch(`/api/client/support-tickets/${activeClientTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('cl-ticket-reply-text').value = '';
      const idx = currentTickets.findIndex(t => t.ticketId === activeClientTicketId);
      if (idx !== -1) currentTickets[idx] = data.ticket;
      openClientTicketDetailModal(activeClientTicketId);
      await loadClientSupportTickets();
    }
  } catch (err) {
    alert('Lỗi gửi phản hồi');
  }
}

// -------------------------------------------------------------
// 9. VIETQR RENEWAL & BILLING
// -------------------------------------------------------------
function openRenewalModal() {
  currentInvoiceCode = `INV-${Date.now().toString().slice(-5)}`;
  currentInvoiceAmount = 1490000;
  const qrUrl = `https://img.vietqr.io/image/MB-0339888999-compact2.png?amount=${currentInvoiceAmount}&addInfo=${currentInvoiceCode}&accountName=HOMENEST%20SAAS`;

  document.getElementById('vietqr-image').src = qrUrl;
  document.getElementById('vietqr-amount').innerText = `${currentInvoiceAmount.toLocaleString('vi-VN')} đ`;
  document.getElementById('vietqr-memo').innerText = currentInvoiceCode;
  openModal('modal-renewal');
}

async function simulateIpnSuccess() {
  try {
    const res = await fetch('/api/billing/vnpay-ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vnp_ResponseCode: '00',
        vnp_TxnRef: currentInvoiceCode,
        vnp_Amount: currentInvoiceAmount * 100
      })
    });
    const data = await res.json();
    if (data.RspCode === '00') {
      alert('🎉 Hệ thống đã nhận Webhook IPN từ ngân hàng thành công! Gói cước của bạn đã được gia hạn thêm 30 ngày.');
      closeModal('modal-renewal');
      await loadClientMe();
    }
  } catch (err) {
    alert('Lỗi kích hoạt webhook');
  }
}

// Global Startup
window.addEventListener('DOMContentLoaded', async () => {
  const authed = await ensureClientAuth();
  if (authed) {
    await loadClientMe();
  }
});
