const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const notificationController = require('../controllers/notificationController');

router.get('/', verifyToken, requireAdmin, notificationController.list);
router.get('/unread', verifyToken, requireAdmin, notificationController.unreadCount);
router.put('/read-all', verifyToken, requireAdmin, notificationController.markAllRead);
router.put('/:id/read', verifyToken, requireAdmin, notificationController.markRead);

module.exports = router;
