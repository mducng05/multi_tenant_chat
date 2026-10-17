const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { verifyClient } = require('../middleware/auth.middleware');

// Client subscription endpoints
router.post('/api/billing/subscribe/detail', verifyClient, billingController.getSubscribeDetail);
router.post('/api/billing/subscribe', verifyClient, billingController.createSubscription);

// IPN Webhook callback from bank/payment gateway
router.all('/api/billing/vnpay-ipn', billingController.handleIpnWebhook);

module.exports = router;
