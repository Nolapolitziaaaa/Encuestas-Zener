const { pool } = require('../config/postgres');

const list = async (req, res) => {
  try {
    const { activa, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*,
        u.nombre as creador_nombre,
        (SELECT COUNT(*) FROM campos_plantilla WHERE plantilla_id = p.id) as total_campos,
        (SELECT COUNT(*) FROM formularios WHERE plantilla_id = p.id) as total_formularios
      FROM plantillas p
      LEFT JOIN usuarios u ON p.creado_por = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (activa !== undefined) {
      paramCount++;
      query += ` AND p.activa = $${paramCount}`;
      params.push(activa === 'true');
    }

    query += ` ORDER BY p.fecha_creacion DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM plantillas');

    res.json({
      templates: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    console.error('Error listando plantillas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const templateResult = await pool.query(
      `SELECT p.*, u.nombre as creador_nombre, u.apellido as creador_apellido
       FROM plantillas p
       LEFT JOIN usuarios u ON p.creado_por = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const fieldsResult = await pool.query(
      'SELECT * FROM campos_plantilla WHERE plantilla_id = $1 ORDER BY orden',
      [id]
    );

    res.json({
      ...templateResult.rows[0],
      campos: fieldsResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo plantilla:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const create = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { nombre, descripcion, campos } = req.body;

    if (!nombre) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const templateResult = await client.query(
      `INSERT INTO plantillas (nombre, descripcion, creado_por)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, descripcion || null, req.user.id]
    );

    const templateId = templateResult.rows[0].id;

    if (Array.isArray(campos) && campos.length > 0) {
      for (let i = 0; i < campos.length; i++) {
        const campo = campos[i];
        if (!campo.etiqueta || !campo.tipo) continue;

        await client.query(
          `INSERT INTO campos_plantilla (plantilla_id, etiqueta, tipo, requerido, opciones, orden, placeholder)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            templateId,
            campo.etiqueta,
            campo.tipo,
            campo.requerido || false,
            JSON.stringify(campo.opciones || []),
            campo.orden !== undefined ? campo.orden : i,
            campo.placeholder || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Retornar con campos
    const fieldsResult = await pool.query(
      'SELECT * FROM campos_plantilla WHERE plantilla_id = $1 ORDER BY orden',
      [templateId]
    );

    res.status(201).json({
      ...templateResult.rows[0],
      campos: fieldsResult.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando plantilla:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const update = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { nombre, descripcion, activa, campos } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (nombre !== undefined) {
      paramCount++;
      updates.push(`nombre = $${paramCount}`);
      params.push(nombre);
    }
    if (descripcion !== undefined) {
      paramCount++;
      updates.push(`descripcion = $${paramCount}`);
      params.push(descripcion);
    }
    if (activa !== undefined) {
      paramCount++;
      updates.push(`activa = $${paramCount}`);
      params.push(activa);
    }

    if (updates.length > 0) {
      paramCount++;
      params.push(id);
      await client.query(
        `UPDATE plantillas SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );
    }

    // Actualizar campos si se envían
    if (Array.isArray(campos)) {
      await client.query('DELETE FROM campos_plantilla WHERE plantilla_id = $1', [id]);

      for (let i = 0; i < campos.length; i++) {
        const campo = campos[i];
        if (!campo.etiqueta || !campo.tipo) continue;

        await client.query(
          `INSERT INTO campos_plantilla (plantilla_id, etiqueta, tipo, requerido, opciones, orden, placeholder)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            campo.etiqueta,
            campo.tipo,
            campo.requerido || false,
            JSON.stringify(campo.opciones || []),
            campo.orden !== undefined ? campo.orden : i,
            campo.placeholder || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    const templateResult = await pool.query('SELECT * FROM plantillas WHERE id = $1', [id]);
    const fieldsResult = await pool.query(
      'SELECT * FROM campos_plantilla WHERE plantilla_id = $1 ORDER BY orden',
      [id]
    );

    res.json({
      ...templateResult.rows[0],
      campos: fieldsResult.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error actualizando plantilla:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay formularios activos con esta plantilla
    const formResult = await pool.query(
      'SELECT COUNT(*) FROM formularios WHERE plantilla_id = $1 AND estado = $2',
      [id, 'pendiente']
    );

    if (parseInt(formResult.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar la plantilla porque tiene formularios pendientes',
      });
    }

    const result = await pool.query('DELETE FROM plantillas WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({ message: 'Plantilla eliminada' });
  } catch (err) {
    console.error('Error eliminando plantilla:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { list, getById, create, update, remove };
