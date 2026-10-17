const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/file.controller');
const { verifyClient } = require('../middleware/auth.middleware');
const { checkFileQuota, checkSubscriptionActive } = require('../middleware/quota.middleware');

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.get('/client-file/files', verifyClient, fileController.getFiles);
router.post('/client-file/upload', verifyClient, checkSubscriptionActive, checkFileQuota, upload.single('file'), fileController.uploadFile);
router.delete('/client-file', verifyClient, fileController.deleteFile);
router.post('/client-file/:id/retrain', verifyClient, fileController.retrainFile);

module.exports = router;
