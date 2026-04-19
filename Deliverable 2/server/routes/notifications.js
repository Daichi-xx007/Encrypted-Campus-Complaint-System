// ============================================================
// Notification Routes
// ============================================================

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const notificationService = require('../services/notification');

function createNotificationRouter(dbHelper) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
      const notifications = notificationService.getAll(req.session.userId, parseInt(limit), offset);
      const unreadCount = notificationService.getUnreadCount(req.session.userId);
      res.json({ notifications, unreadCount });
    } catch (err) {
      console.error('[NOTIF] List error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
  });

  router.get('/unread-count', (req, res) => {
    try {
      const count = notificationService.getUnreadCount(req.session.userId);
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get unread count.' });
    }
  });

  router.put('/:id/read', (req, res) => {
    try {
      notificationService.markRead(parseInt(req.params.id), req.session.userId);
      res.json({ message: 'Notification marked as read.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark notification.' });
    }
  });

  router.put('/read-all', (req, res) => {
    try {
      notificationService.markAllRead(req.session.userId);
      res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark notifications.' });
    }
  });

  return router;
}

module.exports = createNotificationRouter;
