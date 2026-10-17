require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/docs/swaggerSpec');

const adminRoutes = require('./src/routes/admin.routes');
const clientRoutes = require('./src/routes/client.routes');
const fileRoutes = require('./src/routes/file.routes');
const chatRoutes = require('./src/routes/chat.routes');
const widgetRoutes = require('./src/routes/widget.routes');
const billingRoutes = require('./src/routes/billing.routes');
const productRoutes = require('./src/routes/product.routes');

// =========================================================================
// 1. MAIN SAAS APP (Port 5000: APIs + Super Admin & Client Dashboards)
// =========================================================================
const app = express();
const PORT = process.env.PORT || 5000;
const CUSTOMER_PORT = process.env.CUSTOMER_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static interactive frontend demo & assets
app.use(express.static(path.join(__dirname, 'public')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Core API Routes
app.use('/admin-api', adminRoutes);
app.use('/api', clientRoutes);
app.use('/api', fileRoutes);
app.use('/api', chatRoutes);
app.use('/api', productRoutes);
app.use(billingRoutes);
app.use(widgetRoutes);

// Direct Route Aliases for Dashboards
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/client', (req, res) => res.sendFile(path.join(__dirname, 'public', 'client.html')));
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/store', (req, res) => res.sendFile(path.join(__dirname, 'public', 'store.html')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Go QuestX SaaS Multi-Tenant Backend',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ ok: false, message: 'Dung lượng file vượt quá giới hạn 5MB cho phép' });
  }
  res.status(500).json({ ok: false, message: 'Đã xảy ra lỗi trên máy chủ nội bộ', error: err.message });
});

// Start Main Server
const mainServer = app.listen(PORT, () => {
  console.log(`=================================================================`);
  console.log(`🚀 [GO QUESTX] SAAS MULTI-TENANT BACKEND ĐANG CHẠY TẠI:`);
  console.log(`   👉 Gateway Trung Tâm:         http://localhost:${PORT}`);
  console.log(`   👑 Super Admin Dashboard:     http://localhost:${PORT}/admin.html`);
  console.log(`   🏢 Client/Employee Dashboard: http://localhost:${PORT}/client.html`);
  console.log(`   📖 Swagger API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`=================================================================`);
});

// =========================================================================
// 2. STANDALONE CUSTOMER WEBSITE (Port 3000: Landing Page & Store Demo)
// =========================================================================
const customerApp = express();
customerApp.use(cors());
customerApp.use(express.static(path.join(__dirname, 'public')));

// Default to Public Landing Page with Pricing & Registration
customerApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
customerApp.get('/store', (req, res) => res.sendFile(path.join(__dirname, 'public', 'store.html')));
customerApp.get('/store.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'store.html')));
customerApp.get('/landing.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));

customerApp.listen(CUSTOMER_PORT, () => {
  console.log(`🌐 [CUSTOMER PORTAL] WEBSITE ĐĂNG KÝ GÓI & DEMO STORE (Port ${CUSTOMER_PORT}):`);
  console.log(`   👉 Trang Chủ Đăng Ký Gói:     http://localhost:${CUSTOMER_PORT}`);
  console.log(`   🛍️ Website Bán Hàng Nhúng AI: http://localhost:${CUSTOMER_PORT}/store.html`);
  console.log(`=================================================================`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Cảnh báo] Port ${CUSTOMER_PORT} đang bận. Website khách hàng có thể truy cập qua: http://localhost:${PORT}/landing.html`);
  } else {
    console.error('Lỗi khởi động Customer Server:', err);
  }
});
