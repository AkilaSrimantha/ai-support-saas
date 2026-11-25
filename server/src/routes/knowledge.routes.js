const express = require('express');
const knowledgeController = require('../controllers/knowledge.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', knowledgeController.listSources);
router.post('/scrape', knowledgeController.scrapeUrl);
router.post('/faq', knowledgeController.addFaq);
router.post('/:id/rescrape', knowledgeController.rescrapeSource);
router.delete('/:id', knowledgeController.deleteSource);

module.exports = router;
