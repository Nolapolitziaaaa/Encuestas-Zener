const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const responseController = require('../controllers/responseController');

router.post('/:id/submit', verifyToken, responseController.submit);
router.post('/:id/draft', verifyToken, responseController.saveDraft);
router.get('/:id/draft', verifyToken, responseController.loadDraft);
router.get('/form/:id', verifyToken, responseController.getFormResponses);
router.get('/my/:id', verifyToken, responseController.getMyResponse);
router.put('/:id/validate', verifyToken, requireAdmin, responseController.validateResponse);
router.put('/:id/reject', verifyToken, requireAdmin, responseController.rejectResponse);

module.exports = router;
