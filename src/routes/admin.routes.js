const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public admin auth
router.post('/auth/login', adminController.loginAdmin);

// Protected admin endpoints
router.get('/dashboard', verifyAdmin, adminController.getDashboardStats);
router.get('/clients', verifyAdmin, adminController.getClients);
router.post('/clients', verifyAdmin, adminController.createClient);
router.post('/clients/toggle-status', verifyAdmin, adminController.toggleClientStatus);

// Plans
router.get('/plans', verifyAdmin, adminController.getPlans);
router.post('/plans', verifyAdmin, adminController.createPlan);
router.put('/plans/:id', verifyAdmin, adminController.updatePlan);
router.delete('/plans/:id', verifyAdmin, adminController.deletePlan);

// Client Registrations
router.get('/client-registrations', verifyAdmin, adminController.getClientRegistrations);
router.post('/client-registrations/:id/approve', verifyAdmin, adminController.approveRegistration);
router.post('/client-registrations/:id/reject', verifyAdmin, adminController.rejectRegistration);

// Support Tickets
router.get('/support-tickets', verifyAdmin, adminController.getSupportTickets);
router.post('/support-tickets/:ticketId/reply', verifyAdmin, adminController.replySupportTicket);
router.post('/support-tickets/:ticketId/close', verifyAdmin, adminController.closeSupportTicket);
router.post('/support-tickets/:ticketId/open', verifyAdmin, adminController.openSupportTicket);

module.exports = router;
