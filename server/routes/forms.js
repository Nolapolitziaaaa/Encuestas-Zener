const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const formController = require('../controllers/formController');

// Provider routes (must be before /:id to avoid "my" being captured as :id)
router.get('/my/pending', verifyToken, formController.getMyPending);
router.get('/my/completed', verifyToken, formController.getMyCompleted);
router.get('/assignment/:id', verifyToken, formController.getByAssignment);

// Admin routes
router.get('/', verifyToken, requireAdmin, formController.list);
router.get('/:id', verifyToken, formController.getById);
router.post('/', verifyToken, requireAdmin, [
  body('plantilla_id').isInt().withMessage('ID de plantilla inválido'),
  body('titulo').notEmpty().withMessage('Título requerido'),
  body('proveedor_ids').isArray().withMessage('IDs de usuarios debe ser un array'),
], formController.create);
router.delete('/:id', verifyToken, requireAdmin, formController.remove);

module.exports = router;
