require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const adminRoutes = require('./src/routes/admin.routes');
const clientRoutes = require('./src/routes/client.routes');
const fileRoutes = require('./src/routes/file.routes');
const chatRoutes = require('./src/routes/chat.routes');
const widgetRoutes = require('./src/routes/widget.routes');
const billingRoutes = require('./src/routes/billing.routes');
const productRoutes = require('./src/routes/product.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static interactive frontend demo
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/admin-api', adminRoutes);
app.use('/api', clientRoutes);
app.use('/api', fileRoutes);
app.use('/api', chatRoutes);
app.use('/api', productRoutes);
app.use(billingRoutes);
app.use(widgetRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Go QuestX SaaS Backend Demo',
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

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Go QuestX SaaS Backend Demo đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👉 Bảng điều khiển Demo UI: http://localhost:${PORT}/index.html`);
  console.log(`=======================================================`);
});
