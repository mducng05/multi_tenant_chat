// Public Landing Page Engine - Go QuestX
const API_BASE = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;

let registeredToken = '';
let registeredClientId = '';

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function openRegistrationModal(planId) {
  const select = document.getElementById('reg-plan-select');
  if (select && planId) {
    select.value = planId;
  }
  openModal('modal-register');
}

async function loadPlans() {
  try {
    const res = await fetch(`${API_BASE}/api/client/plans`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.plans) && data.plans.length > 0) {
      const select = document.getElementById('reg-plan-select');
      select.innerHTML = data.plans.map(p => `
        <option value="${p._id}">${p.name} - ${Number(p.price).toLocaleString('vi-VN')} đ (${p.duration_days} ngày)</option>
      `).join('');
    }
  } catch (err) {
    console.log('Sử dụng gói cước mặc định:', err);
  }
}

async function submitClientRegistration() {
  const company_name = document.getElementById('reg-company').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const domain = document.getElementById('reg-domain').value.trim();
  const plan_id = document.getElementById('reg-plan-select').value;

  if (!company_name || !username || !password || !plan_id) {
    alert('Vui lòng điền đầy đủ Tên doanh nghiệp, Username, Password và chọn Gói dịch vụ');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/client/register-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name,
        email,
        username,
        password,
        phone,
        domain,
        plan_id
      })
    });

    const data = await res.json();
    if (data.ok) {
      registeredToken = data.token;
      registeredClientId = data.client.clientId;

      // Close registration form modal
      closeModal('modal-register');

      // Populate VietQR Payment Modal
      document.getElementById('pay-client-id').innerText = data.client.clientId;
      document.getElementById('pay-plan-name').innerText = data.invoice.planName;
      document.getElementById('pay-amount').innerText = `${Number(data.invoice.amount).toLocaleString('vi-VN')} đ`;
      document.getElementById('pay-memo').innerText = data.invoice.invoiceCode;
      document.getElementById('pay-qr-image').src = data.invoice.qrUrl;

      // Open Success Payment Modal
      openModal('modal-payment-success');
    } else {
      alert(data.message || 'Lỗi đăng ký gói dịch vụ');
    }
  } catch (err) {
    alert('Không thể kết nối đến máy chủ đăng ký: ' + err.message);
  }
}

function enterClientDashboard() {
  if (registeredToken) {
    localStorage.setItem('gq_client_token', registeredToken);
  }
  window.location.href = `${API_BASE}/client.html`;
}

window.addEventListener('DOMContentLoaded', () => {
  loadPlans();
});
