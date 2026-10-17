const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

// Public admin auth
router.post('/auth/login', adminController.loginAdmin);

// Protected admin endpoints
router.get('/clients', verifyAdmin, adminController.getClients);
router.post('/clients', verifyAdmin, adminController.createClient);
router.post('/clients/toggle-status', verifyAdmin, adminController.toggleClientStatus);
router.get('/plans', verifyAdmin, adminController.getPlans);

module.exports = router;
