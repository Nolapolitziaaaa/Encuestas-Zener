const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const reportController = require('../controllers/reportController');

router.get('/summary', verifyToken, requireAdmin, reportController.summary);
router.get('/users', verifyToken, requireAdmin, reportController.reportByUser);
router.get('/surveys', verifyToken, requireAdmin, reportController.reportSurveys);
router.get('/user/:userId/detail', verifyToken, requireAdmin, reportController.userDetail);
router.get('/form/:id', verifyToken, reportController.formDetail);
router.get('/form/:id/responses', verifyToken, reportController.formResponses);
router.get('/form/:id/users', verifyToken, requireAdmin, reportController.formUserStatus);
router.get('/export/:id', verifyToken, reportController.exportForm);

module.exports = router;
