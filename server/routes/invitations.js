const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const invitationController = require('../controllers/invitationController');

router.get('/', verifyToken, requireAdmin, invitationController.list);
router.post(
  '/',
  verifyToken,
  requireAdmin,
  [
    body('nombre').notEmpty().withMessage('Nombre requerido'),
    body('rut').notEmpty().withMessage('RUT requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('empresa').optional().isLength({ max: 200 }).withMessage('Empresa demasiado larga'),
  ],
  invitationController.create
);
router.post('/bulk', verifyToken, requireAdmin, invitationController.createBulk);
router.delete('/:id', verifyToken, requireAdmin, param('id').isInt(), invitationController.remove);
router.put('/:id', verifyToken, requireAdmin, param('id').isInt(), invitationController.update);

module.exports = router;
