const express = require('express');
const botController = require('../controllers/bot.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { widgetAuthMiddleware } = require('../middlewares/widgetAuth.middleware');

const router = express.Router();

// Public widget endpoint
router.get('/public/config', widgetAuthMiddleware, botController.getPublicWidgetConfig);

// Protected Admin Dashboard endpoints
router.get('/', authMiddleware, botController.getBotSettings);
router.put('/', authMiddleware, botController.updateBotSettings);
router.post('/regenerate-key', authMiddleware, botController.regenerateBotKey);

module.exports = router;
