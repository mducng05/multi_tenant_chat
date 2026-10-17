const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');

// Public widget configuration
router.get('/public/client/:clientId', widgetController.getWidgetConfig);

// Public chat, SSE Stream & Lead capture
router.post('/api/widget/chat', widgetController.chat);
router.post('/api/customer/chat-proxy-stream', widgetController.chatProxyStream);
router.post('/api/customer/lead-capture', widgetController.captureLead);

module.exports = router;
