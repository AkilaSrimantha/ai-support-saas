const express = require('express');
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/analytics/overview', chatController.getOverviewAnalytics);
router.get('/', chatController.listChats);
router.get('/:id/messages', chatController.getChatMessages);
router.post('/:id/messages', chatController.sendAgentMessage);
router.post('/:id/handoff', chatController.handoffToHuman);
router.post('/:id/return-to-ai', chatController.returnToAi);
router.post('/:id/resolve', chatController.resolveChat);

module.exports = router;
