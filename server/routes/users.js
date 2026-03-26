const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const { pool } = require('../config/postgres');

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rol, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, rut, nombre, apellido, email, rol, activo, fecha_registro, ultimo_acceso
      FROM usuarios WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (rol) {
      paramCount++;
      query += ` AND rol = $${paramCount}`;
      params.push(rol);
    }

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR apellido ILIKE $${paramCount} OR rut ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY fecha_registro DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM usuarios');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id/toggle-active', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE usuarios SET activo = NOT activo WHERE id = $1 RETURNING id, activo',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error toggling usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
