const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { verifyClient } = require('../middleware/auth.middleware');
const { checkUserQuota, checkSubscriptionActive } = require('../middleware/quota.middleware');

// Public routes (Auth & Landing)
router.post('/login', clientController.loginClient);
router.post('/client/register-client', clientController.registerClient);
router.get('/client/plans', clientController.getPlans);

// Protected client dashboard routes
router.get('/client/me', verifyClient, clientController.getMe);
router.put('/client/me', verifyClient, clientController.updateWidgetConfig);
router.get('/client/dashboard/today', verifyClient, clientController.getDashboardToday);

// Employee management (with User Quota guard)
router.get('/client/employees', verifyClient, clientController.getEmployees);
router.post('/client/create-employee', verifyClient, checkSubscriptionActive, checkUserQuota, clientController.createEmployee);

// Leads / Customers
router.get('/client/customer-data', verifyClient, clientController.getLeads);

// Support tickets (Client to Super Admin)
router.post('/client/support', verifyClient, clientController.createSupportTicket);
router.get('/client/support-tickets', verifyClient, clientController.getSupportTickets);
router.post('/client/support-tickets/:ticketId/reply', verifyClient, clientController.replySupportTicket);

module.exports = router;
