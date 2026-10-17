const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { verifyClient } = require('../middleware/auth.middleware');
const { checkUserQuota, checkSubscriptionActive } = require('../middleware/quota.middleware');

// Public client/employee login
router.post('/login', clientController.loginClient);

// Protected client dashboard routes
router.get('/client/me', verifyClient, clientController.getMe);
router.put('/client/me', verifyClient, clientController.updateWidgetConfig);

// Employee management (với User Quota guard)
router.get('/client/employees', verifyClient, clientController.getEmployees);
router.post('/client/create-employee', verifyClient, checkSubscriptionActive, checkUserQuota, clientController.createEmployee);

// Leads / Customers
router.get('/client/customer-data', verifyClient, clientController.getLeads);

module.exports = router;
