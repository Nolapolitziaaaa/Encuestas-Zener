const { pool } = require('../config/postgres');
const { sendFormNotification } = require('../services/emailService');

const list = async (req, res) => {
  try {
    const { estado, plantilla_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT f.*,
        p.nombre as plantilla_nombre,
        u.nombre as creador_nombre,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as total_completados
      FROM formularios f
      JOIN plantillas p ON f.plantilla_id = p.id
      LEFT JOIN usuarios u ON f.creado_por = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (estado) {
      paramCount++;
      query += ` AND f.estado = $${paramCount}`;
      params.push(estado);
    }

    if (plantilla_id) {
      paramCount++;
      query += ` AND f.plantilla_id = $${paramCount}`;
      params.push(plantilla_id);
    }

    query += ` ORDER BY f.fecha_creacion DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM formularios');

    res.json({
      forms: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    console.error('Error listando formularios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const formResult = await pool.query(
      `SELECT f.*, p.nombre as plantilla_nombre, p.descripcion as plantilla_descripcion,
              u.nombre as creador_nombre
       FROM formularios f
       JOIN plantillas p ON f.plantilla_id = p.id
       LEFT JOIN usuarios u ON f.creado_por = u.id
       WHERE f.id = $1`,
      [id]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    // Obtener campos de la plantilla
    const fieldsResult = await pool.query(
      `SELECT cp.* FROM campos_plantilla cp
       JOIN plantillas p ON cp.plantilla_id = p.id
       JOIN formularios f ON f.plantilla_id = p.id
       WHERE f.id = $1
       ORDER BY cp.orden`,
      [id]
    );

    // Obtener asignaciones con info del usuario
    const assignmentsResult = await pool.query(
      `SELECT a.*, u.nombre, u.apellido, u.rut, u.email
       FROM asignaciones_formulario a
       JOIN usuarios u ON a.proveedor_id = u.id
       WHERE a.formulario_id = $1
       ORDER BY a.fecha_envio DESC`,
      [id]
    );

    res.json({
      ...formResult.rows[0],
      campos: fieldsResult.rows,
      asignaciones: assignmentsResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const create = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { plantilla_id, proveedor_ids, fecha_limite } = req.body;

    if (!plantilla_id || !Array.isArray(proveedor_ids) || proveedor_ids.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Plantilla y usuarios son requeridos' });
    }

    // Verificar plantilla existe y está activa
    const templateResult = await client.query(
      'SELECT * FROM plantillas WHERE id = $1 AND activa = true',
      [plantilla_id]
    );

    if (templateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plantilla no encontrada o inactiva' });
    }

    const plantilla = templateResult.rows[0];

    // Crear formulario con nombre y descripción de la plantilla
    const formResult = await client.query(
      `INSERT INTO formularios (plantilla_id, titulo, descripcion, creado_por, fecha_limite)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [plantilla_id, plantilla.nombre, plantilla.descripcion || null, req.user.id, fecha_limite || null]
    );

    const formId = formResult.rows[0].id;

    // Crear asignaciones
    let created = 0;
    for (const proveedor_id of proveedor_ids) {
      try {
        await client.query(
          `INSERT INTO asignaciones_formulario (formulario_id, proveedor_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [formId, proveedor_id]
        );
        created++;

        // Notificar por email
        const userResult = await client.query('SELECT nombre, apellido, email FROM usuarios WHERE id = $1', [proveedor_id]);
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          try {
            await sendFormNotification(`${user.nombre} ${user.apellido}`, user.email, plantilla.nombre, fecha_limite);
          } catch (emailErr) {
            console.error(`Error enviando notificación a ${user.email}:`, emailErr.message);
          }
        }
      } catch (err) {
        console.error(`Error asignando usuario ${proveedor_id}:`, err.message);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...formResult.rows[0],
      asignaciones_creadas: created,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const getMyPending = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id as asignacion_id, a.estado as asignacion_estado, a.fecha_envio,
              f.id as formulario_id, f.titulo, f.descripcion, f.fecha_limite as formulario_fecha_limite,
              p.nombre as plantilla_nombre,
              (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id) as total_campos,
              (SELECT COUNT(*) FROM borradores_respuesta br
               WHERE br.asignacion_id = a.id
               AND (br.valor_texto IS NOT NULL AND br.valor_texto != ''
                    OR br.valor_numero IS NOT NULL
                    OR br.valor_fecha IS NOT NULL
                    OR br.valor_json IS NOT NULL
                    OR br.archivo_url IS NOT NULL)) as campos_respondidos
       FROM asignaciones_formulario a
       JOIN formularios f ON a.formulario_id = f.id
       JOIN plantillas p ON f.plantilla_id = p.id
       WHERE a.proveedor_id = $1 AND a.estado IN ('pendiente', 'en_progreso')
       ORDER BY a.fecha_envio DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo formularios pendientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getMyCompleted = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id as asignacion_id, a.fecha_respuesta,
              f.id as formulario_id, f.titulo, f.descripcion,
              p.nombre as plantilla_nombre,
              (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion,
              (SELECT rf.comentario_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as comentario_validacion
       FROM asignaciones_formulario a
       JOIN formularios f ON a.formulario_id = f.id
       JOIN plantillas p ON f.plantilla_id = p.id
       WHERE a.proveedor_id = $1 AND a.estado = 'completado'
       ORDER BY a.fecha_respuesta DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo formularios completados:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM formularios WHERE id = $1 AND estado = $2 RETURNING id',
      [id, 'pendiente']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado o no se puede eliminar' });
    }

    res.json({ message: 'Formulario eliminado' });
  } catch (err) {
    console.error('Error eliminando formulario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getByAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.id as asignacion_id, a.estado as asignacion_estado,
              f.id as formulario_id, f.titulo, f.descripcion, f.estado, f.fecha_limite as formulario_fecha_limite,
              p.nombre as plantilla_nombre, p.descripcion as plantilla_descripcion,
              (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion,
              (SELECT rf.comentario_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as comentario_validacion
       FROM asignaciones_formulario a
       JOIN formularios f ON a.formulario_id = f.id
       JOIN plantillas p ON f.plantilla_id = p.id
       WHERE a.id = $1 AND a.proveedor_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    const form = result.rows[0];
    const isRejected = form.asignacion_estado === 'completado' && form.estado_validacion === 'rechazado';

    if (form.asignacion_estado !== 'pendiente' && form.asignacion_estado !== 'en_progreso' && !isRejected) {
      return res.status(400).json({ error: 'Esta asignación ya no está disponible' });
    }

    const camposResult = await pool.query(
      `SELECT cp.* FROM campos_plantilla cp
       JOIN formularios f ON f.plantilla_id = cp.plantilla_id
       WHERE f.id = $1 ORDER BY cp.orden`,
      [form.formulario_id]
    );

    // Si fue rechazado, cargar los valores previos de la respuesta
    let valoresPrevios = null;
    if (isRejected) {
      const respResult = await pool.query(
        `SELECT rf.id as respuesta_id FROM respuestas_formulario rf WHERE rf.asignacion_id = $1 ORDER BY rf.id DESC LIMIT 1`,
        [id]
      );
      if (respResult.rows.length > 0) {
        const valoresResult = await pool.query(
          `SELECT campo_plantilla_id, valor_texto, valor_numero, valor_fecha, valor_json, archivo_url
           FROM valores_respuesta WHERE respuesta_id = $1`,
          [respResult.rows[0].respuesta_id]
        );
        valoresPrevios = {};
        for (const v of valoresResult.rows) {
          const cid = v.campo_plantilla_id;
          if (v.archivo_url) valoresPrevios[cid] = v.archivo_url;
          else if (v.valor_json) valoresPrevios[cid] = v.valor_json;
          else if (v.valor_numero !== null && v.valor_numero !== undefined) valoresPrevios[cid] = v.valor_numero;
          else if (v.valor_fecha) valoresPrevios[cid] = v.valor_fecha;
          else if (v.valor_texto) valoresPrevios[cid] = v.valor_texto;
        }
      }
    }

    res.json({
      ...form,
      campos: camposResult.rows,
      rechazado: isRejected,
      valores_previos: valoresPrevios,
    });
  } catch (err) {
    console.error('Error obteniendo formulario por asignación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { list, getById, create, getMyPending, getMyCompleted, remove, getByAssignment };
