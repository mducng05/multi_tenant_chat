const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyClient } = require('../middleware/auth.middleware');

router.get('/client/conversations', verifyClient, chatController.getConversations);
router.post('/client/chat/take-session', verifyClient, chatController.takeSession);
router.post('/client/chat/resolve-session', verifyClient, chatController.resolveSession);
router.post('/client/reply', verifyClient, chatController.staffReply);

// AI Writing Assistant & Knowledge Gaps (PRD BA-01 & BA-12)
router.post('/client/chat/ai-polish', verifyClient, chatController.aiPolishDraft);
router.get('/client/knowledge-gaps', verifyClient, chatController.getKnowledgeGaps);
router.post('/client/knowledge-gaps/:id/resolve', verifyClient, chatController.resolveKnowledgeGap);

module.exports = router;
