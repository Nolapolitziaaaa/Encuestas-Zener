const express = require('express');
const { param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const { pool } = require('../config/postgres');
const ExcelJS = require('exceljs');

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rol, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, rut, nombre, apellido, email, rol, activo, fecha_registro, ultimo_acceso, empresa, respondedor
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

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, empresa } = req.body;

    const result = await pool.query(
      `UPDATE usuarios SET nombre = $1, apellido = $2, email = $3, empresa = $4
       WHERE id = $5 RETURNING id, rut, nombre, apellido, email, rol, activo, fecha_registro, ultimo_acceso, empresa`,
      [nombre, apellido || '', email, empresa || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nombre, apellido, rut, email, empresa, rol, activo, ultimo_acceso
       FROM usuarios ORDER BY fecha_registro DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Usuarios');

    sheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Empresa', key: 'empresa', width: 25 },
      { header: 'Rol', key: 'rol', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Último acceso', key: 'ultimo_acceso', width: 18 },
    ];

    // Estilo de encabezados
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    for (const row of result.rows) {
      sheet.addRow({
        nombre: `${row.nombre} ${row.apellido || ''}`.trim(),
        rut: row.rut,
        email: row.email,
        empresa: row.empresa || '',
        rol: row.rol,
        estado: row.activo ? 'Activo' : 'Inactivo',
        ultimo_acceso: row.ultimo_acceso
          ? new Date(row.ultimo_acceso).toLocaleDateString('es-CL')
          : 'Nunca',
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=usuarios.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exportando usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
