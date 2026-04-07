const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.me);
router.get('/verify-invite/:token', authController.verifyInvite);
router.put('/change-password', verifyToken, authController.changePassword);
router.post('/admin-invite/:userId', verifyToken, requireAdmin, authController.sendAdminInvite);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/verify/:token', authController.verifyResetToken);
router.post('/reset-password/set', authController.setNewPassword);
router.post('/reset-password/:userId', verifyToken, requireAdmin, authController.resetPassword);

module.exports = router;
