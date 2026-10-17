// Super Admin Dashboard Engine - Go QuestX
let adminToken = localStorage.getItem('gq_admin_token') || '';
let currentTickets = [];
let activeTicketId = null;
let currentPlans = [];

// Helper: Logging to Admin Console
function logAPI(type, method, endpoint, status, data) {
  const container = document.getElementById('logs-container');
  if (!container) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<b>[${time}] ${method} ${endpoint}</b> &rarr; <span class="badge ${type}">${status}</span><br><pre style="margin:4px 0 0;font-size:11px;color:#94a3b8;white-space:pre-wrap;">${JSON.stringify(data, null, 2)}</pre>`;
  container.prepend(entry);
}

// Navigation Tabs
function switchTab(tabId) {
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

  const btn = document.querySelector(`.admin-nav-item[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');

  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add('active');

  if (tabId === 'adm-overview') loadDashboardStats();
  if (tabId === 'adm-tenants') loadAdminClients();
  if (tabId === 'adm-plans') loadAdminPlans();
  if (tabId === 'adm-registrations') loadClientRegistrations();
  if (tabId === 'adm-tickets') loadSupportTickets();
}

document.querySelectorAll('.admin-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// Modal helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// Authentication
async function ensureAdminAuth() {
  if (adminToken) {
    try {
      const res = await fetch('/admin-api/dashboard', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  // Auto-login with default super admin seed credentials
  try {
    const res = await fetch('/admin-api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_homenest', password: 'SecurePass123' })
    });
    const data = await res.json();
    if (data.ok) {
      adminToken = data.token;
      localStorage.setItem('gq_admin_token', adminToken);
      document.getElementById('admin-name').innerText = data.admin.name || 'Super Admin';
      if (data.admin.avatar) document.getElementById('admin-avatar').src = data.admin.avatar;
      logAPI('success', 'POST', '/admin-api/auth/login', 200, { admin: data.admin.name, role: data.admin.role });
      return true;
    }
  } catch (err) {
    console.error('Super Admin Login Failed:', err);
    logAPI('error', 'AUTH', 'Login Super Admin', 500, { error: err.message });
  }
  return false;
}

// -------------------------------------------------------------
// 1. DASHBOARD OVERVIEW (KPI METRICS)
// -------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch('/admin-api/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    logAPI('info', 'GET', '/admin-api/dashboard', 200, data.stats);

    const s = data.stats;
    document.getElementById('stat-total-clients').innerText = s.total_clients || 0;
    document.getElementById('stat-active-clients').innerText = `${s.active_clients || 0} / ${s.total_clients || 0}`;
    document.getElementById('stat-total-revenue').innerText = `${Number(s.total_revenue || s.total_mrr_revenue || 0).toLocaleString('vi-VN')} đ`;
    document.getElementById('stat-pending-regs').innerText = s.pending_registrations || 0;
    document.getElementById('stat-open-tickets').innerText = s.open_tickets || 0;

    // Badges in sidebar
    const badgeReg = document.getElementById('badge-pending-reg');
    if (s.pending_registrations > 0) {
      badgeReg.innerText = s.pending_registrations;
      badgeReg.style.display = 'inline-block';
    } else {
      badgeReg.style.display = 'none';
    }

    const badgeTick = document.getElementById('badge-open-tickets');
    if (s.open_tickets > 0) {
      badgeTick.innerText = s.open_tickets;
      badgeTick.style.display = 'inline-block';
    } else {
      badgeTick.style.display = 'none';
    }

    // Mini recent clients preview
    const recentClientsBox = document.getElementById('overview-recent-clients');
    if (s.recent_clients && s.recent_clients.length > 0) {
      recentClientsBox.innerHTML = s.recent_clients.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div>
            <b>${c.company_name}</b> <span class="code-tag">${c.clientId}</span>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${c.plan_name} • ${c.email}</div>
          </div>
          <span class="badge ${c.status === 'active' ? 'success' : 'danger'}">${c.status}</span>
        </div>
      `).join('');
    } else {
      recentClientsBox.innerHTML = `<div style="padding: 1.5rem; text-align:center; color: var(--text-muted);">Chưa có doanh nghiệp nào.</div>`;
    }

    // Mini recent tickets preview
    const recentTicketsBox = document.getElementById('overview-recent-tickets');
    if (s.recent_tickets && s.recent_tickets.length > 0) {
      recentTicketsBox.innerHTML = s.recent_tickets.map(t => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div>
            <b>${t.subject}</b> <span class="code-tag">${t.ticketId}</span>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Tenant: ${t.clientId} • ${new Date(t.created_at).toLocaleDateString('vi-VN')}</div>
          </div>
          <span class="badge ${t.status === 'open' ? 'danger' : 'success'}">${t.status}</span>
        </div>
      `).join('');
    } else {
      recentTicketsBox.innerHTML = `<div style="padding: 1.5rem; text-align:center; color: var(--text-muted);">Không có ticket nào cần xử lý.</div>`;
    }

  } catch (err) {
    console.error('Lỗi tải KPI:', err);
  }
}

// -------------------------------------------------------------
// 2. TENANTS (CLIENTS) MANAGEMENT
// -------------------------------------------------------------
async function loadAdminClients() {
  try {
    const res = await fetch('/admin-api/clients', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    logAPI('info', 'GET', '/admin-api/clients', 200, { total: data.clients.length });

    const tbody = document.getElementById('clients-table-body');
    if (data.clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Chưa có doanh nghiệp nào trong hệ thống.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.clients.map(c => `
      <tr>
        <td><span class="code-tag">${c.clientId}</span></td>
        <td>
          <b>${c.company_name}</b><br>
          <small style="color: var(--text-muted);">${c.email}</small>
        </td>
        <td><code>${c.username}</code></td>
        <td>
          <span class="badge plan">${c.plan_name}</span><br>
          <small style="color: var(--text-muted);">Hết hạn: ${new Date(c.subscription_plan_end).toLocaleDateString('vi-VN')}</small>
        </td>
        <td>${c.stats.users} / ${c.plan_max_users}</td>
        <td>${c.stats.files} / ${c.plan_max_files}</td>
        <td>
          <span class="badge ${c.status === 'active' ? 'success' : 'danger'}">
            ${c.status === 'active' ? '● Hoạt động' : '🔒 Đã Khóa'}
          </span>
        </td>
        <td>
          <button class="btn ${c.status === 'active' ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleClientStatus('${c._id}')">
            ${c.status === 'active' ? 'Khóa Tenant' : 'Mở Khóa'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải danh sách clients:', err);
  }
}

async function toggleClientStatus(clientId) {
  try {
    const res = await fetch('/admin-api/clients/toggle-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ clientId })
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', 'POST', '/admin-api/clients/toggle-status', 200, data);
      await loadAdminClients();
      await loadDashboardStats();
    } else {
      alert(data.message || 'Lỗi cập nhật trạng thái');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

async function openCreateClientModal() {
  await populatePlanSelect();
  openModal('modal-create-client');
}

async function populatePlanSelect() {
  if (currentPlans.length === 0) {
    const res = await fetch('/admin-api/plans', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.ok) currentPlans = data.plans;
  }

  const select = document.getElementById('new-client-plan');
  select.innerHTML = currentPlans.map(p => `
    <option value="${p._id}">${p.name} - ${Number(p.price).toLocaleString('vi-VN')} đ (Max ${p.max_users} Users, ${p.max_files} Files)</option>
  `).join('');
}

async function submitCreateClient() {
  const name = document.getElementById('new-client-name').value.trim();
  const email = document.getElementById('new-client-email').value.trim();
  const username = document.getElementById('new-client-username').value.trim();
  const password = document.getElementById('new-client-password').value.trim();
  const subscription_plan = document.getElementById('new-client-plan').value;

  if (!name || !username || !password || !subscription_plan) {
    alert('Vui lòng điền đủ Tên công ty, Username, Password và chọn Gói');
    return;
  }

  try {
    const res = await fetch('/admin-api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name, email, username, password, subscription_plan })
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', 'POST', '/admin-api/clients', 201, data.client);
      closeModal('modal-create-client');
      alert(`Khởi tạo doanh nghiệp thành công! Mã Tenant: ${data.client.clientId}`);
      await loadAdminClients();
      await loadDashboardStats();
    } else {
      alert(data.message || 'Lỗi tạo doanh nghiệp');
    }
  } catch (err) {
    alert('Lỗi kết nối');
  }
}

// -------------------------------------------------------------
// 3. PLANS MANAGEMENT (CRUD)
// -------------------------------------------------------------
async function loadAdminPlans() {
  try {
    const res = await fetch('/admin-api/plans', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    currentPlans = data.plans;
    logAPI('info', 'GET', '/admin-api/plans', 200, { total: currentPlans.length });

    const tbody = document.getElementById('plans-table-body');
    tbody.innerHTML = currentPlans.map(p => `
      <tr>
        <td><span class="code-tag">${p._id}</span></td>
        <td><b>${p.name}</b></td>
        <td style="color: #f59e0b; font-weight: 700;">${Number(p.price).toLocaleString('vi-VN')} đ</td>
        <td>${p.duration_days} ngày</td>
        <td>${p.max_users} NV</td>
        <td>${p.max_files} files</td>
        <td style="max-width: 250px; color: var(--text-muted);">${p.description || '--'}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditPlanModal('${p._id}')">Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="deletePlan('${p._id}')">Xóa</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải gói cước:', err);
  }
}

function openCreatePlanModal() {
  document.getElementById('modal-plan-title').innerText = '💳 Tạo Gói Cước Mới';
  document.getElementById('plan-edit-id').value = '';
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-price').value = '';
  document.getElementById('plan-duration').value = '30';
  document.getElementById('plan-users').value = '10';
  document.getElementById('plan-files').value = '25';
  document.getElementById('plan-desc').value = '';
  openModal('modal-plan');
}

function openEditPlanModal(planId) {
  const plan = currentPlans.find(p => p._id === planId);
  if (!plan) return;

  document.getElementById('modal-plan-title').innerText = '💳 Sửa Gói Cước: ' + plan.name;
  document.getElementById('plan-edit-id').value = plan._id;
  document.getElementById('plan-name').value = plan.name;
  document.getElementById('plan-price').value = plan.price;
  document.getElementById('plan-duration').value = plan.duration_days;
  document.getElementById('plan-users').value = plan.max_users;
  document.getElementById('plan-files').value = plan.max_files;
  document.getElementById('plan-desc').value = plan.description || '';
  openModal('modal-plan');
}

async function submitPlan() {
  const editId = document.getElementById('plan-edit-id').value;
  const name = document.getElementById('plan-name').value.trim();
  const price = Number(document.getElementById('plan-price').value);
  const duration_days = Number(document.getElementById('plan-duration').value);
  const max_users = Number(document.getElementById('plan-users').value);
  const max_files = Number(document.getElementById('plan-files').value);
  const description = document.getElementById('plan-desc').value.trim();

  if (!name || isNaN(price)) {
    alert('Vui lòng nhập tên gói và giá tiền hợp lệ');
    return;
  }

  const payload = { name, price, duration_days, max_users, max_files, description };
  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `/admin-api/plans/${editId}` : '/admin-api/plans';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', method, url, 200, data);
      closeModal('modal-plan');
      await loadAdminPlans();
    } else {
      alert(data.message || 'Lỗi lưu gói cước');
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

async function deletePlan(planId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa gói cước ${planId}?`)) return;

  try {
    const res = await fetch(`/admin-api/plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', 'DELETE', `/admin-api/plans/${planId}`, 200, data);
      await loadAdminPlans();
    } else {
      alert(data.message || 'Lỗi xóa gói cước');
    }
  } catch (err) {
    alert('Lỗi kết nối');
  }
}

// -------------------------------------------------------------
// 4. CLIENT REGISTRATIONS APPROVAL
// -------------------------------------------------------------
async function loadClientRegistrations() {
  try {
    const res = await fetch('/admin-api/client-registrations', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    logAPI('info', 'GET', '/admin-api/client-registrations', 200, { total: data.registrations.length });

    const tbody = document.getElementById('registrations-table-body');
    if (data.registrations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">Không có hồ sơ đăng ký nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.registrations.map(r => `
      <tr>
        <td><b>${r.name}</b></td>
        <td>${r.email}</td>
        <td>${r.phone || '--'}</td>
        <td><code>${r.domain || '--'}</code></td>
        <td><span class="badge plan">${r.plan_id}</span></td>
        <td>
          <span class="badge ${r.status === 'approved' ? 'success' : (r.status === 'rejected' ? 'danger' : 'warning')}">
            ${r.status}
          </span>
        </td>
        <td>${new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
        <td>
          ${r.status === 'pending' ? `
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-primary btn-sm" onclick="approveRegistration('${r._id}')">Duyệt</button>
              <button class="btn btn-danger btn-sm" onclick="rejectRegistration('${r._id}')">Từ chối</button>
            </div>
          ` : `<span style="color: var(--text-muted); font-size: 0.85rem;">Đã hoàn tất</span>`}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải registrations:', err);
  }
}

async function approveRegistration(id) {
  try {
    const res = await fetch(`/admin-api/client-registrations/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ notes: 'Đã duyệt kích hoạt gói doanh nghiệp bởi Super Admin' })
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', 'POST', `/admin-api/client-registrations/${id}/approve`, 200, data);
      alert('Đã phê duyệt hồ sơ thành công!');
      await loadClientRegistrations();
      await loadDashboardStats();
    }
  } catch (err) {
    alert('Lỗi phê duyệt');
  }
}

async function rejectRegistration(id) {
  const reason = prompt('Nhập lý do từ chối hồ sơ:', 'Thông tin đăng ký chưa hợp lệ');
  if (!reason) return;

  try {
    const res = await fetch(`/admin-api/client-registrations/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('warning', 'POST', `/admin-api/client-registrations/${id}/reject`, 200, data);
      await loadClientRegistrations();
      await loadDashboardStats();
    }
  } catch (err) {
    alert('Lỗi kết nối');
  }
}

// -------------------------------------------------------------
// 5. SUPPORT TICKETS HUB
// -------------------------------------------------------------
async function loadSupportTickets() {
  try {
    const res = await fetch('/admin-api/support-tickets', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.ok) return;

    currentTickets = data.tickets;
    logAPI('info', 'GET', '/admin-api/support-tickets', 200, { total: currentTickets.length });

    const tbody = document.getElementById('tickets-table-body');
    if (currentTickets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Không có ticket hỗ trợ nào.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentTickets.map(t => `
      <tr>
        <td><span class="code-tag">${t.ticketId}</span></td>
        <td><code>${t.clientId}</code></td>
        <td><b>${t.subject}</b></td>
        <td>${new Date(t.created_at).toLocaleDateString('vi-VN')}</td>
        <td><span class="badge ${t.status === 'open' ? 'danger' : 'success'}">${t.status}</span></td>
        <td>${t.responses ? t.responses.length : 0} tin</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openTicketDetailModal('${t.ticketId}')">Xem & Phản Hồi</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải tickets:', err);
  }
}

function openTicketDetailModal(ticketId) {
  const t = currentTickets.find(item => item.ticketId === ticketId);
  if (!t) return;

  activeTicketId = t.ticketId;
  document.getElementById('ticket-modal-title').innerText = `🎫 Ticket #${t.ticketId} (Tenant: ${t.clientId})`;
  document.getElementById('ticket-modal-status').className = `badge ${t.status === 'open' ? 'danger' : 'success'}`;
  document.getElementById('ticket-modal-status').innerText = t.status.toUpperCase();
  document.getElementById('ticket-modal-subject').innerText = t.subject;

  const btnToggle = document.getElementById('btn-toggle-ticket-status');
  btnToggle.innerText = t.status === 'open' ? 'Đóng Ticket' : 'Mở Lại Ticket';

  renderTicketMessages(t.responses || []);
  document.getElementById('ticket-reply-text').value = '';
  openModal('modal-ticket');
}

function renderTicketMessages(responses) {
  const box = document.getElementById('ticket-responses-box');
  if (!responses || responses.length === 0) {
    box.innerHTML = `<div style="text-align:center; color: var(--text-muted);">Chưa có tin nhắn trong hội thoại này.</div>`;
    return;
  }

  box.innerHTML = responses.map(r => `
    <div class="ticket-msg ${r.admin ? 'admin' : 'client'}">
      <div style="font-size: 11px; opacity: 0.75; margin-bottom: 2px;">
        ${r.admin ? '👑 Super Admin' : '🏢 Client Tenant'} • ${new Date(r.created_at).toLocaleTimeString('vi-VN')}
      </div>
      <div>${r.message}</div>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

async function submitTicketReply() {
  if (!activeTicketId) return;
  const message = document.getElementById('ticket-reply-text').value.trim();
  if (!message) {
    alert('Vui lòng nhập nội dung phản hồi');
    return;
  }

  try {
    const res = await fetch(`/admin-api/support-tickets/${activeTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('success', 'POST', `/admin-api/support-tickets/${activeTicketId}/reply`, 200, data);
      document.getElementById('ticket-reply-text').value = '';
      // Update local ticket
      const idx = currentTickets.findIndex(t => t.ticketId === activeTicketId);
      if (idx !== -1) currentTickets[idx] = data.ticket;
      renderTicketMessages(data.ticket.responses);
      await loadSupportTickets();
      await loadDashboardStats();
    }
  } catch (err) {
    alert('Lỗi gửi phản hồi');
  }
}

async function toggleCurrentTicketStatus() {
  if (!activeTicketId) return;
  const t = currentTickets.find(item => item.ticketId === activeTicketId);
  if (!t) return;

  const endpoint = t.status === 'open' ? 'close' : 'open';
  try {
    const res = await fetch(`/admin-api/support-tickets/${activeTicketId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (data.ok) {
      logAPI('info', 'POST', `/admin-api/support-tickets/${activeTicketId}/${endpoint}`, 200, data);
      const idx = currentTickets.findIndex(item => item.ticketId === activeTicketId);
      if (idx !== -1) currentTickets[idx] = data.ticket;
      openTicketDetailModal(activeTicketId);
      await loadSupportTickets();
      await loadDashboardStats();
    }
  } catch (err) {
    alert('Lỗi thao tác trạng thái ticket');
  }
}

// Global Startup
window.addEventListener('DOMContentLoaded', async () => {
  const authed = await ensureAdminAuth();
  if (authed) {
    await loadDashboardStats();
    await loadAdminClients();
  }
});
