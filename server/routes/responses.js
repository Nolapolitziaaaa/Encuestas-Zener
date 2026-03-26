const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const responseController = require('../controllers/responseController');

router.post('/:id/submit', verifyToken, responseController.submit);
router.post('/:id/draft', verifyToken, responseController.saveDraft);
router.get('/:id/draft', verifyToken, responseController.loadDraft);
router.get('/form/:id', verifyToken, responseController.getFormResponses);
router.get('/my/:id', verifyToken, responseController.getMyResponse);

module.exports = router;
