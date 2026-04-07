const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const templateController = require('../controllers/templateController');

router.get('/', verifyToken, templateController.list);
router.get('/:id', verifyToken, templateController.getById);
router.post('/', verifyToken, requireAdmin, [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
], templateController.create);
router.post('/:id/duplicate', verifyToken, requireAdmin, templateController.duplicate);
router.put('/:id', verifyToken, requireAdmin, [
  param('id').isInt().withMessage('ID inválido'),
], templateController.update);
router.delete('/:id', verifyToken, requireAdmin, [
  param('id').isInt().withMessage('ID inválido'),
], templateController.remove);

module.exports = router;
