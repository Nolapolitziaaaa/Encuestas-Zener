const { pool } = require('../config/postgres');
const ExcelJS = require('exceljs');

const summary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'usuario') as total_proveedores,
        (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') as total_admins,
        (SELECT COUNT(*) FROM plantillas WHERE activa = true) as plantillas_activas,
        (SELECT COUNT(*) FROM formularios) as total_formularios,
        (SELECT COUNT(*) FROM formularios WHERE estado = 'pendiente') as formularios_pendientes,
        (SELECT COUNT(*) FROM formularios WHERE estado = 'completado') as formularios_completados,
        (SELECT COUNT(*) FROM formularios WHERE estado = 'vencido') as formularios_vencidos,
        (SELECT COUNT(*) FROM asignaciones_formulario) as total_asignaciones,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE estado = 'completado') as asignaciones_completadas,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE estado = 'pendiente') as asignaciones_pendientes,
        (SELECT COUNT(*) FROM invitaciones WHERE estado = 'pendiente') as invitaciones_pendientes,
        (SELECT COUNT(*) FROM invitaciones WHERE estado = 'registrada') as invitaciones_registradas
    `);

    // Formularios por plantilla
    const byTemplate = await pool.query(`
      SELECT p.nombre, COUNT(f.id) as total,
        COUNT(CASE WHEN f.estado = 'completado' THEN 1 END) as completados,
        COUNT(CASE WHEN f.estado = 'pendiente' THEN 1 END) as pendientes
      FROM plantillas p
      LEFT JOIN formularios f ON f.plantilla_id = p.id
      GROUP BY p.id, p.nombre
      ORDER BY total DESC
    `);

    // Formularios por usuarios (porcentaje de respuesta por formulario)
    const byUser = await pool.query(`
      SELECT f.id as formulario_id, f.titulo,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as completados
      FROM formularios f
      WHERE (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) > 0
      ORDER BY f.fecha_creacion DESC
    `);

    // Últimos formularios
    const recent = await pool.query(`
      SELECT f.titulo, f.estado, f.fecha_creacion,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as completados
      FROM formularios f
      ORDER BY f.fecha_creacion DESC LIMIT 10
    `);

    res.json({
      ...result.rows[0],
      por_plantilla: byTemplate.rows,
      por_usuario: byUser.rows,
      recientes: recent.rows,
    });
  } catch (err) {
    console.error('Error obteniendo resumen:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const formDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Info del formulario
    const formResult = await pool.query(`
      SELECT f.*, p.nombre as plantilla_nombre
      FROM formularios f
      JOIN plantillas p ON f.plantilla_id = p.id
      WHERE f.id = $1
    `, [id]);

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    // Campos de la plantilla
    const camposResult = await pool.query(`
      SELECT cp.* FROM campos_plantilla cp
      JOIN formularios f ON f.plantilla_id = cp.plantilla_id
      WHERE f.id = $1 ORDER BY cp.orden
    `, [id]);

    // Estadísticas de respuestas por campo
    const statsByField = [];
    for (const campo of camposResult.rows) {
      if (campo.tipo === 'seleccion_unica' || campo.tipo === 'seleccion_multiple') {
        const distResult = await pool.query(`
          SELECT vr.valor_texto, COUNT(*) as total
          FROM valores_respuesta vr
          JOIN respuestas_formulario rf ON vr.respuesta_id = rf.id
          WHERE vr.campo_plantilla_id = $1 AND rf.formulario_id = $2
          GROUP BY vr.valor_texto
          ORDER BY total DESC
        `, [campo.id, id]);

        statsByField.push({
          campo_id: campo.id,
          etiqueta: campo.etiqueta,
          tipo: campo.tipo,
          distribucion: distResult.rows,
        });
      }
    }

    // Tasa de completitud
    const completitud = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as vencidos,
        ROUND(
          COUNT(CASE WHEN estado = 'completado' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1
        ) as porcentaje_completado
      FROM asignaciones_formulario
      WHERE formulario_id = $1
    `, [id]);

    res.json({
      formulario: formResult.rows[0],
      campos: camposResult.rows,
      estadisticas_campo: statsByField,
      completitud: completitud.rows[0],
    });
  } catch (err) {
    console.error('Error obteniendo detalle:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const exportForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'xlsx' } = req.query;

    // Obtener formulario y campos
    const formResult = await pool.query(`
      SELECT f.*, p.nombre as plantilla_nombre
      FROM formularios f
      JOIN plantillas p ON f.plantilla_id = p.id
      WHERE f.id = $1
    `, [id]);

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    const camposResult = await pool.query(`
      SELECT cp.* FROM campos_plantilla cp
      JOIN formularios f ON f.plantilla_id = cp.plantilla_id
      WHERE f.id = $1 ORDER BY cp.orden
    `, [id]);

    const respuestasResult = await pool.query(`
      SELECT rf.id as respuesta_id, u.nombre, u.apellido, u.rut, u.email, rf.fecha_envio
      FROM respuestas_formulario rf
      JOIN usuarios u ON rf.proveedor_id = u.id
      WHERE rf.formulario_id = $1
      ORDER BY rf.fecha_envio
    `, [id]);

    if (format === 'csv') {
      // Exportar CSV
      const headers = ['Usuario', 'RUT', 'Email', 'Fecha Respuesta', ...camposResult.rows.map((c) => c.etiqueta)];
      const rows = [headers.join(',')];

      for (const resp of respuestasResult.rows) {
        const valoresResult = await pool.query(
          'SELECT * FROM valores_respuesta WHERE respuesta_id = $1',
          [resp.respuesta_id]
        );

        const valoresMap = {};
        for (const v of valoresResult.rows) {
          valoresMap[v.campo_plantilla_id] =
            v.valor_texto || v.valor_numero?.toString() || v.valor_fecha?.toString() ||
            (v.valor_json ? JSON.stringify(v.valor_json) : v.archivo_url || '');
        }

        const row = [
          `"${resp.nombre} ${resp.apellido}"`,
          resp.rut,
          resp.email,
          new Date(resp.fecha_envio).toLocaleDateString('es-CL'),
          ...camposResult.rows.map((c) => `"${(valoresMap[c.id] || '').replace(/"/g, '""')}"`),
        ];
        rows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${formResult.rows[0].titulo}.csv"`);
      res.send('\ufeff' + rows.join('\n'));
    } else {
      // Exportar Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(formResult.rows[0].titulo);

      // Header
      worksheet.addRow(['Usuario', 'RUT', 'Email', 'Fecha Respuesta', ...camposResult.rows.map((c) => c.etiqueta)]);
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Data
      for (const resp of respuestasResult.rows) {
        const valoresResult = await pool.query(
          'SELECT * FROM valores_respuesta WHERE respuesta_id = $1',
          [resp.respuesta_id]
        );

        const valoresMap = {};
        for (const v of valoresResult.rows) {
          valoresMap[v.campo_plantilla_id] =
            v.valor_texto || v.valor_numero?.toString() || v.valor_fecha?.toString() ||
            (v.valor_json ? JSON.stringify(v.valor_json) : v.archivo_url || '');
        }

        worksheet.addRow([
          `${resp.nombre} ${resp.apellido}`,
          resp.rut,
          resp.email,
          new Date(resp.fecha_envio).toLocaleDateString('es-CL'),
          ...camposResult.rows.map((c) => valoresMap[c.id] || ''),
        ]);
      }

      // Auto column width
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${formResult.rows[0].titulo}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    console.error('Error exportando:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const formResponses = async (req, res) => {
  try {
    const { id } = req.params;

    const respuestasResult = await pool.query(`
      SELECT rf.id as respuesta_id, rf.fecha_envio,
             u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email
      FROM respuestas_formulario rf
      JOIN usuarios u ON rf.proveedor_id = u.id
      WHERE rf.formulario_id = $1
      ORDER BY rf.fecha_envio DESC
    `, [id]);

    const camposResult = await pool.query(`
      SELECT cp.* FROM campos_plantilla cp
      JOIN formularios f ON f.plantilla_id = cp.plantilla_id
      WHERE f.id = $1 ORDER BY cp.orden
    `, [id]);

    const respuestas = [];
    for (const resp of respuestasResult.rows) {
      const valoresResult = await pool.query(
        'SELECT * FROM valores_respuesta WHERE respuesta_id = $1',
        [resp.respuesta_id]
      );

      const valores = {};
      for (const v of valoresResult.rows) {
        let display = '';
        if (v.archivo_url) {
          display = v.archivo_url;
        } else if (v.valor_texto) {
          display = v.valor_texto;
        } else if (v.valor_numero !== null && v.valor_numero !== undefined) {
          display = v.valor_numero.toString();
        } else if (v.valor_fecha) {
          display = v.valor_fecha;
        } else if (v.valor_json) {
          display = v.valor_json;
        }

        valores[v.campo_plantilla_id] = {
          raw: v,
          display,
          is_file: !!v.archivo_url,
        };
      }

      respuestas.push({
        ...resp,
        valores,
      });
    }

    res.json({
      respuestas,
      campos: camposResult.rows,
    });
  } catch (err) {
    console.error('Error obteniendo respuestas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const reportByUser = async (req, res) => {
  try {
    const { form_id, search } = req.query;

    let query = `
      SELECT u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email,
        COUNT(DISTINCT a.id) as total_asignaciones,
        COUNT(DISTINCT CASE WHEN a.estado = 'completado' THEN a.id END) as completados,
        COUNT(DISTINCT CASE WHEN a.estado IN ('pendiente', 'en_progreso') THEN a.id END) as pendientes,
        COUNT(DISTINCT CASE WHEN a.estado = 'vencido' THEN a.id END) as vencidos,
        ROUND(
          COUNT(DISTINCT CASE WHEN a.estado = 'completado' THEN a.id END)::numeric /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100, 1
        ) as porcentaje_completado
      FROM usuarios u
      LEFT JOIN asignaciones_formulario a ON a.proveedor_id = u.id
      WHERE u.rol = 'usuario'
    `;
    const params = [];
    let paramCount = 0;

    if (form_id) {
      paramCount++;
      query += ` AND a.formulario_id = $${paramCount}`;
      params.push(parseInt(form_id));
    }

    if (search) {
      paramCount++;
      query += ` AND (u.nombre ILIKE $${paramCount} OR u.apellido ILIKE $${paramCount} OR u.rut ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY u.id, u.nombre, u.apellido, u.rut, u.email ORDER BY u.nombre, u.apellido`;

    const result = await pool.query(query, params);
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error('Error en reporte por usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const reportSurveys = async (req, res) => {
  try {
    const { estado, plantilla_id, search } = req.query;

    let query = `
      SELECT f.id, f.titulo, f.estado, f.fecha_creacion, f.fecha_limite,
        p.nombre as plantilla_nombre,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as completados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado IN ('pendiente', 'en_progreso')) as en_progreso,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'vencido') as vencidos,
        ROUND(
          (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado')::numeric /
          NULLIF((SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id), 0) * 100, 1
        ) as porcentaje_completado
      FROM formularios f
      JOIN plantillas p ON f.plantilla_id = p.id
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
      params.push(parseInt(plantilla_id));
    }

    if (search) {
      paramCount++;
      query += ` AND f.titulo ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY f.fecha_creacion DESC`;

    const result = await pool.query(query, params);
    res.json({ formularios: result.rows });
  } catch (err) {
    console.error('Error en reporte encuestas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const userDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT a.id as asignacion_id, a.estado, a.fecha_envio, a.fecha_respuesta,
             f.id as formulario_id, f.titulo as formulario_titulo,
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
      WHERE a.proveedor_id = $1
      ORDER BY a.fecha_envio DESC
    `, [userId]);

    res.json({ asignaciones: result.rows });
  } catch (err) {
    console.error('Error detalle usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const formUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT a.id as asignacion_id, a.estado, a.fecha_respuesta, a.fecha_envio,
             u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email
      FROM asignaciones_formulario a
      JOIN usuarios u ON a.proveedor_id = u.id
      WHERE a.formulario_id = $1
      ORDER BY
        CASE WHEN a.estado = 'completado' THEN 1
             WHEN a.estado IN ('pendiente', 'en_progreso') THEN 2
             ELSE 3 END,
        u.apellido, u.nombre
    `, [id]);

    const total = result.rows.length;
    const completados = result.rows.filter(r => r.estado === 'completado').length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    res.json({
      formulario_id: parseInt(id),
      total_asignados: total,
      completados,
      pendientes: total - completados,
      porcentaje,
      usuarios: result.rows.map(r => ({
        ...r,
        respondido: r.estado === 'completado',
      })),
    });
  } catch (err) {
    console.error('Error en formUserStatus:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { summary, formDetail, exportForm, formResponses, reportByUser, reportSurveys, userDetail, formUserStatus };
