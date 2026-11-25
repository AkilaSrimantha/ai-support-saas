const express = require('express');
const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', ticketController.listTickets);
router.post('/', ticketController.createTicket);
router.patch('/:id', ticketController.updateTicketStatus);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
