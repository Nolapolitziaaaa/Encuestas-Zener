const { pool } = require('../config/postgres');

const submit = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { valores } = req.body;

    const assignmentResult = await client.query(
      `SELECT a.*, f.plantilla_id, f.titulo as formulario_titulo
       FROM asignaciones_formulario a
       JOIN formularios f ON a.formulario_id = f.id
       WHERE a.id = $1 AND a.proveedor_id = $2 AND a.estado IN ('pendiente', 'en_progreso', 'completado')`,
      [id, req.user.id]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asignación no encontrada o ya completada' });
    }

    const assignment = assignmentResult.rows[0];

    const fieldsResult = await client.query(
      'SELECT * FROM campos_plantilla WHERE plantilla_id = $1 ORDER BY orden',
      [assignment.plantilla_id]
    );

    const campos = fieldsResult.rows;

    for (const campo of campos) {
      if (campo.requerido) {
        const valor = valores?.find((v) => v.campo_plantilla_id === campo.id);
        const hasValue = valor && (
          (valor.valor_texto && valor.valor_texto.toString().trim()) ||
          (valor.valor_numero !== null && valor.valor_numero !== undefined) ||
          (valor.valor_fecha) ||
          (valor.valor_json && Array.isArray(valor.valor_json) && valor.valor_json.length > 0) ||
          (valor.archivo_url)
        );
        if (!hasValue) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El campo "${campo.etiqueta}" es requerido`,
            campo_id: campo.id,
          });
        }
      }
    }

    // Borrar borradores
    await client.query('DELETE FROM borradores_respuesta WHERE asignacion_id = $1', [id]);

    // Verificar si ya existe una respuesta (rechazada) para esta asignación
    const existingResponse = await client.query(
      `SELECT id FROM respuestas_formulario WHERE asignacion_id = $1 LIMIT 1`,
      [id]
    );

    let respuestaId;
    if (existingResponse.rows.length > 0) {
      // Actualizar respuesta existente
      respuestaId = existingResponse.rows[0].id;
      await client.query(
        `UPDATE respuestas_formulario SET fecha_envio = CURRENT_TIMESTAMP, estado_validacion = 'pendiente', comentario_validacion = NULL WHERE id = $1`,
        [respuestaId]
      );
      // Borrar valores viejos
      await client.query('DELETE FROM valores_respuesta WHERE respuesta_id = $1', [respuestaId]);
    } else {
      // Crear nueva respuesta
      const responseResult = await client.query(
        `INSERT INTO respuestas_formulario (asignacion_id, formulario_id, proveedor_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [id, assignment.formulario_id, req.user.id]
      );
      respuestaId = responseResult.rows[0].id;
    }

    if (Array.isArray(valores)) {
      for (const valor of valores) {
        await client.query(
          `INSERT INTO valores_respuesta
           (respuesta_id, campo_plantilla_id, valor_texto, valor_numero, valor_fecha, valor_json, archivo_url)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
          [
            respuestaId,
            valor.campo_plantilla_id,
            valor.valor_texto || null,
            valor.valor_numero || null,
            valor.valor_fecha || null,
            valor.valor_json ? JSON.stringify(valor.valor_json) : null,
            valor.archivo_url || null,
          ]
        );
      }
    }

    await client.query(
      `UPDATE asignaciones_formulario SET estado = 'completado', fecha_respuesta = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    const pendingCount = await client.query(
      `SELECT COUNT(*) FROM asignaciones_formulario
       WHERE formulario_id = $1 AND estado IN ('pendiente', 'en_progreso')`,
      [assignment.formulario_id]
    );

    if (parseInt(pendingCount.rows[0].count) === 0) {
      await client.query(
        `UPDATE formularios SET estado = 'completado' WHERE id = $1`,
        [assignment.formulario_id]
      );
    }

    await client.query('COMMIT');

    // Crear notificacion para admins (fuera de la transaccion, no bloquea la respuesta)
    const proveedorResult = await pool.query(
      'SELECT nombre, apellido, empresa FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    const proveedor = proveedorResult.rows[0];
    const nombreCompleto = `${proveedor.nombre || ''} ${proveedor.apellido || ''}`.trim();
    await pool.query(
      `INSERT INTO notificaciones (tipo, titulo, mensaje, formulario_id, respuesta_id, proveedor_id, proveedor_nombre, proveedor_empresa)
       VALUES ('respuesta', 'Nueva respuesta recibida', $1, $2, $3, $4, $5, $6)`,
      [
        `${nombreCompleto} respondio el formulario "${assignment.formulario_titulo}"`,
        assignment.formulario_id,
        respuestaId,
        req.user.id,
        nombreCompleto,
        proveedor.empresa || null,
      ]
    ).catch((notifErr) => {
      console.error('Error creando notificacion:', notifErr.message);
    });

    res.json({
      message: 'Respuesta enviada correctamente',
      respuesta_id: respuestaId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error enviando respuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const saveDraft = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { valores } = req.body;

    const assignmentResult = await client.query(
      `SELECT a.*,
              (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion
       FROM asignaciones_formulario a
       WHERE a.id = $1 AND a.proveedor_id = $2
       AND (a.estado IN ('pendiente', 'en_progreso') OR (a.estado = 'completado' AND (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) = 'rechazado'))`,
      [id, req.user.id]
    );

    if (assignmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Asignación no encontrada o ya completada' });
    }

    await client.query(
      `UPDATE asignaciones_formulario SET estado = 'en_progreso' WHERE id = $1 AND estado = 'pendiente'`,
      [id]
    );

    for (const valor of valores) {
      await client.query(
        `INSERT INTO borradores_respuesta
          (asignacion_id, proveedor_id, campo_plantilla_id, valor_texto, valor_numero, valor_fecha, valor_json, archivo_url, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, CURRENT_TIMESTAMP)
         ON CONFLICT (asignacion_id, campo_plantilla_id)
         DO UPDATE SET
           valor_texto = EXCLUDED.valor_texto,
           valor_numero = EXCLUDED.valor_numero,
           valor_fecha = EXCLUDED.valor_fecha,
           valor_json = EXCLUDED.valor_json,
           archivo_url = EXCLUDED.archivo_url,
           updated_at = CURRENT_TIMESTAMP`,
        [
          id, req.user.id, valor.campo_plantilla_id,
          valor.valor_texto || null,
          valor.valor_numero !== null && valor.valor_numero !== undefined ? valor.valor_numero : null,
          valor.valor_fecha || null,
          valor.valor_json ? JSON.stringify(valor.valor_json) : null,
          valor.archivo_url || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Borrador guardado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error guardando borrador:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const loadDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT campo_plantilla_id, valor_texto, valor_numero, valor_fecha, valor_json, archivo_url
       FROM borradores_respuesta
       WHERE asignacion_id = $1 AND proveedor_id = $2`,
      [id, req.user.id]
    );

    const draftValues = {};
    for (const row of result.rows) {
      const campoId = row.campo_plantilla_id;
      if (row.archivo_url) draftValues[campoId] = row.archivo_url;
      else if (row.valor_json) draftValues[campoId] = row.valor_json;
      else if (row.valor_numero !== null && row.valor_numero !== undefined) draftValues[campoId] = row.valor_numero;
      else if (row.valor_fecha) draftValues[campoId] = row.valor_fecha;
      else if (row.valor_texto) draftValues[campoId] = row.valor_texto;
    }

    res.json({ valores: draftValues });
  } catch (err) {
    console.error('Error cargando borrador:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getFormResponses = async (req, res) => {
  try {
    const { id } = req.params;

    const responsesResult = await pool.query(
      `SELECT rf.*, u.nombre, u.apellido, u.rut, u.email, a.fecha_envio as fecha_asignacion
       FROM respuestas_formulario rf
       JOIN usuarios u ON rf.proveedor_id = u.id
       JOIN asignaciones_formulario a ON rf.asignacion_id = a.id
       WHERE rf.formulario_id = $1
       ORDER BY rf.fecha_envio DESC`,
      [id]
    );

    if (responsesResult.rows.length === 0) {
      return res.json({ respuestas: [], campos: [] });
    }

    // Obtener campos de la plantilla
    const formResult = await pool.query(
      `SELECT plantilla_id FROM formularios WHERE id = $1`,
      [id]
    );

    const camposResult = await pool.query(
      `SELECT * FROM campos_plantilla WHERE plantilla_id = $1 ORDER BY orden`,
      [formResult.rows[0].plantilla_id]
    );

    // Obtener valores para cada respuesta
    const respuestasConValores = [];
    for (const resp of responsesResult.rows) {
      const valoresResult = await pool.query(
        `SELECT vr.*, cp.etiqueta, cp.tipo as campo_tipo
         FROM valores_respuesta vr
         JOIN campos_plantilla cp ON vr.campo_plantilla_id = cp.id
         WHERE vr.respuesta_id = $1
         ORDER BY cp.orden`,
        [resp.id]
      );
      respuestasConValores.push({
        ...resp,
        valores: valoresResult.rows,
      });
    }

    res.json({
      respuestas: respuestasConValores,
      campos: camposResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo respuestas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getMyResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const responseResult = await pool.query(
      `SELECT rf.* FROM respuestas_formulario rf
       JOIN asignaciones_formulario a ON rf.asignacion_id = a.id
       WHERE a.id = $1 AND rf.proveedor_id = $2`,
      [id, req.user.id]
    );

    if (responseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    const respuesta = responseResult.rows[0];

    const valoresResult = await pool.query(
      `SELECT vr.*, cp.etiqueta, cp.tipo as campo_tipo
       FROM valores_respuesta vr
       JOIN campos_plantilla cp ON vr.campo_plantilla_id = cp.id
       WHERE vr.respuesta_id = $1
       ORDER BY cp.orden`,
      [respuesta.id]
    );

    res.json({
      ...respuesta,
      valores: valoresResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo mi respuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const validateResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE respuestas_formulario
       SET estado_validacion = 'validado'
       WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    res.json({ message: 'Respuesta validada correctamente' });
  } catch (err) {
    console.error('Error validando respuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const rejectResponse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { comentario } = req.body;

    if (!comentario || !comentario.trim()) {
      return res.status(400).json({ error: 'El comentario de rechazo es requerido' });
    }

    await client.query('BEGIN');

    const responseResult = await client.query(
      `SELECT rf.*, u.nombre, u.apellido, u.email, f.titulo as formulario_titulo,
              a.id as asignacion_id, a.formulario_id
       FROM respuestas_formulario rf
       JOIN usuarios u ON rf.proveedor_id = u.id
       JOIN formularios f ON rf.formulario_id = f.id
       JOIN asignaciones_formulario a ON rf.asignacion_id = a.id
       WHERE rf.id = $1`,
      [id]
    );

    if (responseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    const responseData = responseResult.rows[0];

    await client.query(
      `UPDATE respuestas_formulario
       SET estado_validacion = 'rechazado', comentario_validacion = $1
       WHERE id = $2`,
      [comentario.trim(), id]
    );

    await client.query('COMMIT');

    // Enviar email sin bloquear la respuesta HTTP
    const { sendRejectionEmail } = require('../services/emailService');
    sendRejectionEmail(
      responseData.nombre,
      responseData.apellido,
      responseData.email,
      responseData.formulario_titulo,
      comentario.trim()
    ).catch((emailErr) => {
      console.error('Error enviando email de rechazo:', emailErr.message);
    });

    res.json({ message: 'Respuesta rechazada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rechazando respuesta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

module.exports = { submit, getFormResponses, getMyResponse, saveDraft, loadDraft, validateResponse, rejectResponse };
