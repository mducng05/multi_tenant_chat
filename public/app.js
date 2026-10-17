// Go QuestX SaaS - Frontend Demo Engine

let clientToken = '';
let adminToken = '';
let currentClientId = 'HN-DEMO-001';
let currentSessionId = 'sess_demo_01';
let currentInvoiceCode = '';
let currentInvoiceAmount = 0;

// Logging helper for Tab 4 (API Logs Console)
function logAPI(type, method, endpoint, status, data) {
  const container = document.getElementById('logs-container');
  if (!container) return;

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<b>[${time}] ${method} ${endpoint}</b> &rarr; <span class="badge ${type}">${status}</span><br><code>${JSON.stringify(data, null, 2)}</code>`;
  container.prepend(entry);
}

// Tab navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const target = tab.getAttribute('data-tab');
    document.getElementById(target).classList.add('active');
  });
});

// Helper for Fill Chat scenario button
window.fillChat = function(text) {
  const input = document.getElementById('widget-input');
  input.value = text;
  document.getElementById('btn-widget-send').click();
};

// Initialize App
async function initApp() {
  try {
    // 1. Auto-login demo Client
    const clientRes = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'client_demo', password: 'ClientPass123' })
    });
    const clientData = await clientRes.json();
    if (clientData.ok) {
      clientToken = clientData.token;
      logAPI('success', 'POST', '/api/login', 200, { role: clientData.role, clientId: clientData.clientId });
      await loadClientDashboard();
    }

    // 2. Auto-login Super Admin
    const adminRes = await fetch('/admin-api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_homenest', password: 'SecurePass123' })
    });
    const adminData = await adminRes.json();
    if (adminData.ok) {
      adminToken = adminData.token;
      logAPI('success', 'POST', '/admin-api/auth/login', 200, { admin: adminData.admin.name });
      await loadAdminClients();
    }

    // 3. Load Widget Config
    await loadWidgetConfig();
  } catch (err) {
    console.error('Lỗi khởi tạo:', err);
    logAPI('error', 'INIT', 'App Startup', 500, { error: err.message });
  }
}

// ---------------------------------------------------------------------
// 1. CLIENT DASHBOARD LOGIC
// ---------------------------------------------------------------------
async function loadClientDashboard() {
  if (!clientToken) return;

  const res = await fetch('/api/client/me', {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const data = await res.json();
  if (!data.ok) return;

  logAPI('info', 'GET', '/api/client/me', 200, data.client.subscription);

  // Update metrics UI
  const sub = data.client.subscription;
  document.getElementById('stat-users').innerText = `${sub.current_users} / ${sub.max_users}`;
  document.getElementById('progress-users').style.width = `${Math.min(100, (sub.current_users / sub.max_users) * 100)}%`;

  document.getElementById('stat-files').innerText = `${sub.current_files} / ${sub.max_files}`;
  document.getElementById('progress-files').style.width = `${Math.min(100, (sub.current_files / sub.max_files) * 100)}%`;

  document.getElementById('stat-leads').innerText = `${data.stats.total_leads} Leads`;
  document.getElementById('stat-days').innerText = `${sub.days_remaining} ngày`;
  document.getElementById('stat-end-date').innerText = new Date(sub.plan_end).toLocaleDateString('vi-VN');

  document.getElementById('client-badge-id').innerText = data.client.clientId;
  document.getElementById('client-name-display').innerText = data.client.company_name;
  document.getElementById('client-plan-badge').innerText = sub.plan_name;

  // Load Files
  await loadFilesList();
  // Load Leads
  await loadLeadsList();
  // Load Knowledge Gaps (PRD BA-01)
  await loadKnowledgeGaps();
}

async function loadFilesList() {
  const res = await fetch('/api/client-file/files', {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const data = await res.json();
  const listEl = document.getElementById('files-list');
  listEl.innerHTML = '';

  if (data.files) {
    data.files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div>
          <b>📄 ${f.file_name}</b><br>
          <small class="hint">${(f.file_size / 1024).toFixed(1)} KB | ${f.vector_count} chunks vector</small>
        </div>
        <div>
          <span class="badge ${f.status === 'ready' ? 'success' : 'warning'}">${f.status.toUpperCase()}</span>
          <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; margin-left: 0.5rem;" onclick="deleteFile('${f._id}')">🗑️</button>
        </div>
      `;
      listEl.appendChild(row);
    });
  }
}

async function loadLeadsList() {
  const res = await fetch('/api/client/customer-data', {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const data = await res.json();
  const listEl = document.getElementById('leads-list');
  listEl.innerHTML = '';

  if (data.leads && data.leads.length > 0) {
    data.leads.forEach(l => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div>
          <b>👤 ${l.name}</b> &bull; <span class="code-tag">${l.phone}</span><br>
          <small class="hint">Thu thập lúc: ${new Date(l.createdAt).toLocaleTimeString('vi-VN')}</small>
        </div>
        <span class="badge success">Đã xác thực SĐT</span>
      `;
      listEl.appendChild(row);
    });
  } else {
    listEl.innerHTML = '<p class="hint">Chưa có Lead nào. Hãy thử chat SĐT trên Chatbot Widget!</p>';
  }
}

// Upload file RAG
document.getElementById('btn-upload-file').addEventListener('click', async () => {
  const fileName = document.getElementById('rag-file-name').value || `Quy_Dinh_${Date.now()}.pdf`;
  const content = document.getElementById('rag-file-content').value;

  if (!content) {
    alert('Vui lòng nhập nội dung văn bản để AI học!');
    return;
  }

  const res = await fetch('/api/client-file/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileName, content })
  });

  const data = await res.json();
  logAPI(data.ok ? 'success' : 'error', 'POST', '/api/client-file/upload', res.status, data);

  if (data.ok) {
    alert('Đã gửi tài liệu! AI đang băm nhỏ Chunking và lưu vào VectorDB...');
    document.getElementById('rag-file-name').value = '';
    document.getElementById('rag-file-content').value = '';
    await loadClientDashboard();

    // Auto reload after 1.5s when background ingestion finishes
    setTimeout(async () => {
      await loadClientDashboard();
    }, 1500);
  } else {
    alert(data.message);
  }
});

// Delete file RAG
window.deleteFile = async function(fileId) {
  if (!confirm('Bạn có chắc muốn xóa vĩnh viễn file này? Hệ thống sẽ dọn dẹp cả Vector trên ChromaDB!')) return;

  const res = await fetch('/api/client-file', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fileId })
  });
  const data = await res.json();
  logAPI(data.ok ? 'success' : 'error', 'DELETE', '/api/client-file', res.status, data);
  alert(data.message);
  await loadClientDashboard();
};

// Human Handoff: Take Session (Optimistic Lock)
document.getElementById('btn-take-session').addEventListener('click', async () => {
  const res = await fetch('/api/client/chat/take-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ customerId: 'cust_01' })
  });

  const data = await res.json();
  logAPI(res.status === 200 ? 'success' : 'warn', 'POST', '/api/client/chat/take-session', res.status, data);

  if (res.status === 200) {
    document.getElementById('handoff-status').innerHTML = 'Trạng thái: <b style="color: #f59e0b;">Nhân viên CSKH đang trực tiếp xử lý (Bot Silence)</b>';
    alert(data.message);
  } else if (res.status === 409) {
    alert(`[HTTP 409 Conflict] ${data.message}`);
  }
});

// Human Handoff: Resolve Session
document.getElementById('btn-resolve-session').addEventListener('click', async () => {
  const res = await fetch('/api/client/chat/resolve-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ customerId: 'cust_01' })
  });

  const data = await res.json();
  logAPI('info', 'POST', '/api/client/chat/resolve-session', res.status, data);
  document.getElementById('handoff-status').innerHTML = 'Trạng thái: <b>Bot AI đang tự động trả lời</b>';
  alert(data.message);
});

// Staff Reply to chat
document.getElementById('btn-staff-send').addEventListener('click', async () => {
  const input = document.getElementById('staff-reply-input');
  const message = input.value.trim();
  if (!message) return;

  const res = await fetch('/api/client/reply', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ customerId: 'cust_01', message })
  });

  const data = await res.json();
  logAPI('success', 'POST', '/api/client/reply', 200, data);

  // Append staff message to widget chat
  appendChatMessage('staff', `[Nhân viên tư vấn]: ${message}`);
  input.value = '';
});

// AI Writing Assistant (PRD BA-12)
let currentPolishedText = '';
document.getElementById('btn-ai-polish').addEventListener('click', async () => {
  const input = document.getElementById('staff-reply-input');
  const draftText = input.value.trim();
  if (!draftText) {
    alert('Vui lòng gõ một câu nháp ngắn trước (VD: mai anh qua xem nha, hoặc thử gõ từ cấm "cam kết lời 100%").');
    return;
  }

  const res = await fetch('/api/client/chat/ai-polish', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ draftText, textVersion: Date.now() })
  });

  const data = await res.json();
  logAPI(res.status === 200 ? 'success' : 'error', 'POST', '/api/client/chat/ai-polish', res.status, data);

  if (res.status === 422) {
    // HARD BLOCK VIOLATION
    alert(`⛔ ${data.message}`);
    document.getElementById('btn-staff-send').disabled = true;
    document.getElementById('btn-staff-send').innerText = '⛔ Bị Khóa';
    return;
  }

  // Khôi phục nút gửi nếu không vi phạm
  document.getElementById('btn-staff-send').disabled = false;
  document.getElementById('btn-staff-send').innerText = 'Gửi';

  if (data.ok) {
    currentPolishedText = data.suggestedText;
    document.getElementById('ai-polish-preview').style.display = 'block';
    document.getElementById('polish-suggested-text').innerText = data.suggestedText;
    document.getElementById('polish-tone-badge').innerText = data.tone;
  }
});

document.getElementById('btn-apply-polish').addEventListener('click', () => {
  if (currentPolishedText) {
    document.getElementById('staff-reply-input').value = currentPolishedText;
    document.getElementById('ai-polish-preview').style.display = 'none';
  }
});

// Knowledge Gaps Loader (PRD BA-01)
async function loadKnowledgeGaps() {
  const res = await fetch('/api/client/knowledge-gaps', {
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  const data = await res.json();
  const listEl = document.getElementById('knowledge-gaps-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (data.gaps && data.gaps.length > 0) {
    data.gaps.forEach(g => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div style="flex: 1;">
          <b>❓ ${g.cluster_title}</b> (${g.question_count} lượt hỏi)<br>
          <small class="hint">Câu hỏi mẫu: "${g.sample_questions.join('", "')}"</small>
        </div>
        <div style="margin-left: 1rem;">
          <span class="badge ${g.status === 'resolved' ? 'success' : 'warning'}">${g.status.toUpperCase()}</span>
          ${g.status === 'new' ? `<button class="btn btn-sm btn-primary" style="margin-left: 0.5rem;" onclick="resolveGap('${g._id}')">⚡ Huấn luyện ngay</button>` : ''}
        </div>
      `;
      listEl.appendChild(row);
    });
  } else {
    listEl.innerHTML = '<p class="hint">Hiện tại chưa có lỗ hổng kiến thức nào.</p>';
  }
}

window.resolveGap = async function(gapId) {
  const res = await fetch(`/api/client/knowledge-gaps/${gapId}/resolve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const data = await res.json();
  logAPI('success', 'POST', `/api/client/knowledge-gaps/${gapId}/resolve`, res.status, data);
  alert(data.message);
  await loadKnowledgeGaps();
  await loadFilesList();
  await loadClientDashboard();
};

// ---------------------------------------------------------------------
// 2. BILLING & VIETQR PAYMENT
// ---------------------------------------------------------------------
document.getElementById('btn-create-invoice').addEventListener('click', async () => {
  const planId = document.getElementById('select-plan-upgrade').value;

  const res = await fetch('/api/billing/subscribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ planId, paymentMethod: 'vietqr' })
  });

  const data = await res.json();
  logAPI('success', 'POST', '/api/billing/subscribe', 201, data);

  if (data.ok) {
    currentInvoiceCode = data.invoice.invoiceCode;
    currentInvoiceAmount = data.invoice.amount;

    document.getElementById('qr-result-box').style.display = 'flex';
    document.getElementById('vietqr-img').src = data.invoice.qrUrl;
    document.getElementById('qr-memo').innerText = `Mã đơn hàng: ${data.invoice.invoiceCode}`;
    document.getElementById('qr-amount').innerText = `Số tiền: ${data.invoice.amount.toLocaleString('vi-VN')} VNĐ`;
  }
});

// Simulate Bank IPN Webhook
document.getElementById('btn-sim-ipn').addEventListener('click', async () => {
  if (!currentInvoiceCode) {
    alert('Vui lòng tạo hóa đơn trước!');
    return;
  }

  const res = await fetch('/api/billing/vnpay-ipn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceCode: currentInvoiceCode,
      amount: currentInvoiceAmount
    })
  });

  const data = await res.json();
  logAPI(data.RspCode === '00' ? 'success' : 'error', 'POST', '/api/billing/vnpay-ipn', res.status, data);

  if (data.RspCode === '00') {
    alert(`🎉 IPN Webhook Đối Soát Thành Công 100%!\nHóa đơn ${currentInvoiceCode} đã được gạch nợ.\nGói cước đã được tự động gia hạn đến: ${new Date(data.newPlanEnd).toLocaleDateString('vi-VN')}`);
    await loadClientDashboard();
  } else {
    alert(`Lỗi IPN: ${data.Message}`);
  }
});

// ---------------------------------------------------------------------
// 3. CHATBOT WIDGET LOGIC
// ---------------------------------------------------------------------
async function loadWidgetConfig() {
  const res = await fetch(`/public/client/${currentClientId}`);
  const data = await res.json();
  if (data.ok) {
    document.getElementById('widget-title').innerText = data.company_name;
    document.getElementById('widget-welcome').innerText = data.widget.welcome_message;
    if (data.widget.avatar) {
      document.getElementById('widget-avatar').src = data.widget.avatar;
    }
  }
}

function appendChatMessage(sender, text) {
  const box = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = `msg ${sender}`;
  msgEl.innerHTML = `<div class="bubble">${text}</div>`;
  box.appendChild(msgEl);
  box.scrollTop = box.scrollHeight;
}

document.getElementById('btn-widget-send').addEventListener('click', sendWidgetMessage);
document.getElementById('widget-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendWidgetMessage();
});

async function sendWidgetMessage() {
  const input = document.getElementById('widget-input');
  const message = input.value.trim();
  if (!message) return;

  // Append user message
  appendChatMessage('user', message);
  input.value = '';

  try {
    const res = await fetch('/api/widget/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: currentClientId,
        sessionId: currentSessionId,
        message: message,
        customerName: 'Khách Demo'
      })
    });

    const data = await res.json();
    logAPI('info', 'POST', '/api/widget/chat', res.status, {
      message,
      reply: data.reply,
      isRagFound: data.isRagFound,
      leadCaptured: data.leadCaptured
    });

    if (data.ok) {
      // 1. Kiểm tra nếu có thẻ Carousel sản phẩm
      if (data.hasCarousel && data.products) {
        appendProductCarousel(data.reply, data.products);
      } else {
        appendChatMessage('bot', data.reply);
      }

      // 2. Kiểm tra nếu có Cảnh báo Cảm xúc tiêu cực (Sentiment Escalation)
      if (data.isEscalated) {
        const consoleCard = document.getElementById('card-livechat-console');
        if (consoleCard) {
          consoleCard.classList.add('escalated');
          document.getElementById('sentiment-badge').className = 'badge danger';
          document.getElementById('sentiment-badge').innerText = '🚨 KHẨN CẤP: Khách Thất Vọng';
          document.getElementById('handoff-status').innerHTML = '🚨 CẢNH BÁO: <b style="color: #ef4444;">Khách hàng có cảm xúc tiêu cực, hệ thống đã ngắt bot và chuyển giao khẩn cấp!</b>';
        }
      }

      // 3. If a lead was captured automatically via phone detection, reload leads in dashboard!
      if (data.leadCaptured) {
        await loadLeadsList();
        await loadClientDashboard();
      }
    }
  } catch (err) {
    console.error(err);
    appendChatMessage('bot', 'Đã xảy ra lỗi khi kết nối tới máy chủ AI.');
  }
}

// Hàm render Carousel sản phẩm trong Chat Widget
function appendProductCarousel(text, products) {
  const box = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = 'msg bot';

  let carouselHtml = `
    <div class="bubble">
      <div>${text}</div>
      <div class="product-carousel">
  `;

  products.forEach(p => {
    carouselHtml += `
      <div class="product-card">
        <img src="${p.image_url}" alt="${p.name}">
        <div class="p-info">
          <div class="p-title">${p.name}</div>
          <div class="p-price">${(p.price / 1000000000).toFixed(1)} Tỷ VNĐ</div>
          <div class="p-attr">${p.attributes ? Object.values(p.attributes).join(' • ') : ''}</div>
          <button class="btn btn-primary btn-card" onclick="selectProductBuy('${p.name}', ${p.price})">Đặt Cọc Ngay</button>
        </div>
      </div>
    `;
  });

  carouselHtml += `
      </div>
    </div>
  `;

  msgEl.innerHTML = carouselHtml;
  box.appendChild(msgEl);
  box.scrollTop = box.scrollHeight;
}

window.selectProductBuy = function(productName, price) {
  fillChat(`Tôi muốn đặt cọc căn: ${productName}`);
};

// ---------------------------------------------------------------------
// 4. SUPER ADMIN PORTAL LOGIC
// ---------------------------------------------------------------------
async function loadAdminClients() {
  if (!adminToken) return;

  const res = await fetch('/admin-api/clients', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const data = await res.json();
  const listEl = document.getElementById('admin-clients-list');
  listEl.innerHTML = '';

  if (data.clients) {
    data.clients.forEach(c => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div>
          <b>🏢 ${c.company_name}</b> (<span class="code-tag">${c.clientId}</span>)<br>
          <small class="hint">Gói: ${c.plan_name} | Users: ${c.stats.users}/${c.plan_max_users} | Files: ${c.stats.files}/${c.plan_max_files}</small>
        </div>
        <div>
          <span class="badge ${c.status === 'active' ? 'success' : 'danger'}">${c.status.toUpperCase()}</span>
          <button class="btn btn-outline" style="padding: 0.2rem 0.5rem; margin-left: 0.5rem;" onclick="toggleClientStatus('${c.clientId}')">
            ${c.status === 'active' ? 'Khóa' : 'Mở'}
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });
  }
}

window.toggleClientStatus = async function(clientId) {
  const res = await fetch('/admin-api/clients/toggle-status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clientId })
  });

  const data = await res.json();
  logAPI('warn', 'POST', '/admin-api/clients/toggle-status', res.status, data);
  alert(data.message);
  await loadAdminClients();
  await loadClientDashboard();
};

document.getElementById('form-create-client').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('adm-client-name').value;
  const email = document.getElementById('adm-client-email').value;
  const username = document.getElementById('adm-client-user').value;
  const password = document.getElementById('adm-client-pass').value;
  const subscription_plan = document.getElementById('adm-client-plan').value;

  const res = await fetch('/admin-api/clients', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, username, password, subscription_plan })
  });

  const data = await res.json();
  logAPI(data.ok ? 'success' : 'error', 'POST', '/admin-api/clients', res.status, data);

  if (data.ok) {
    alert(`🎉 Cấp phát Client thành công!\nClientId: ${data.clientId}\nTên đăng nhập: ${username}`);
    document.getElementById('form-create-client').reset();
    await loadAdminClients();
  } else {
    alert(`Lỗi: ${data.message}`);
  }
});

document.getElementById('btn-admin-refresh').addEventListener('click', loadAdminClients);
document.getElementById('btn-clear-logs').addEventListener('click', () => {
  document.getElementById('logs-container').innerHTML = '';
});

// Run start
initApp();
