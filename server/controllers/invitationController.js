const { pool } = require('../config/postgres');
const { sendInvitationEmail } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');

const list = async (req, res) => {
  try {
    const { estado, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, u.nombre as invitador_nombre, u.apellido as invitador_apellido
      FROM invitaciones i
      LEFT JOIN usuarios u ON i.invitado_por = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (estado) {
      paramCount++;
      query += ` AND i.estado = $${paramCount}`;
      params.push(estado);
    }

    if (search) {
      paramCount++;
      query += ` AND (i.nombre ILIKE $${paramCount} OR i.apellido ILIKE $${paramCount} OR i.rut ILIKE $${paramCount} OR i.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY i.fecha_invitacion DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM invitaciones');

    res.json({
      invitations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    console.error('Error listando invitaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, apellido, rut, email, rol, empresa } = req.body;
    const userRol = rol === 'admin' ? 'admin' : 'usuario';

    if (!nombre || !rut || !email) {
      return res.status(400).json({ error: 'Nombre, RUT y email son requeridos' });
    }

    const existing = await pool.query(
      'SELECT id, estado FROM invitaciones WHERE email = $1 AND estado = $2',
      [email, 'pendiente']
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una invitación pendiente para este email' });
    }

    const token = uuidv4();
    const result = await pool.query(
      `INSERT INTO invitaciones (nombre, apellido, rut, email, token, invitado_por, rol, empresa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, apellido || '', rut, email, token, req.user.id, userRol, empresa || '']
    );

    // Enviar email sin bloquear la respuesta HTTP
    sendInvitationEmail(`${nombre} ${apellido || ''}`.trim(), email, token, userRol).catch((emailErr) => {
      console.error('Error enviando email:', emailErr.message);
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando invitación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createBulk = async (req, res) => {
  try {
    const { invitations } = req.body;

    if (!Array.isArray(invitations) || invitations.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de invitaciones' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const inv of invitations) {
      if (!inv.nombre || !inv.rut || !inv.email || !inv.empresa) {
        results.errors.push({ email: inv.email, error: 'Campos incompletos (nombre, RUT, email, empresa son requeridos)' });
        results.skipped++;
        continue;
      }

      const existing = await pool.query(
        'SELECT id FROM invitaciones WHERE email = $1 AND estado = $2',
        [inv.email, 'pendiente']
      );

      if (existing.rows.length > 0) {
        results.skipped++;
        continue;
      }

      const userRol = 'usuario';
      const token = uuidv4();
      await pool.query(
        `INSERT INTO invitaciones (nombre, apellido, rut, email, token, invitado_por, rol, empresa)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [inv.nombre, inv.apellido || '', inv.rut, inv.email, token, req.user.id, userRol, inv.empresa || '']
      );

      results.created++;

      // Enviar email sin bloquear
      const invNombre = `${inv.nombre} ${inv.apellido || ''}`.trim();
      sendInvitationEmail(invNombre, inv.email, token, userRol).catch((emailErr) => {
        console.error(`Error enviando email a ${inv.email}:`, emailErr.message);
      });
    }

    res.status(201).json(results);
  } catch (err) {
    console.error('Error creando invitaciones bulk:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM invitaciones WHERE id = $1 AND estado = $2 RETURNING id',
      [id, 'pendiente']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitación no encontrada o ya utilizada' });
    }

    res.json({ message: 'Invitación eliminada' });
  } catch (err) {
    console.error('Error eliminando invitación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, empresa } = req.body;

    const result = await pool.query(
      `UPDATE invitaciones SET nombre = $1, apellido = $2, email = $3, empresa = $4
       WHERE id = $5 RETURNING *`,
      [nombre, apellido || '', email, empresa || '', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando invitación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { list, create, createBulk, remove, update };
