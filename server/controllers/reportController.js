const { pool } = require('../config/postgres');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const crypto = require('crypto');

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
        (SELECT COUNT(*) FROM invitaciones WHERE estado = 'registrada') as invitaciones_registradas,
        (SELECT COUNT(*) FROM respuestas_formulario WHERE estado_validacion = 'validado') as respuestas_validadas,
        (SELECT COUNT(*) FROM respuestas_formulario WHERE estado_validacion = 'pendiente') as respuestas_pendientes_validacion,
        (SELECT COUNT(*) FROM respuestas_formulario WHERE estado_validacion = 'rechazado') as respuestas_rechazadas
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
      SELECT DISTINCT ON (rf.proveedor_id)
             rf.id as respuesta_id, rf.fecha_envio,
             rf.estado_validacion, rf.comentario_validacion,
             u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email, u.empresa
      FROM respuestas_formulario rf
      JOIN usuarios u ON rf.proveedor_id = u.id
      WHERE rf.formulario_id = $1
      ORDER BY rf.proveedor_id, rf.id DESC
    `, [id]);

    const camposResult = await pool.query(`
      SELECT cp.* FROM campos_plantilla cp
      JOIN formularios f ON f.plantilla_id = cp.plantilla_id
      WHERE f.id = $1 ORDER BY cp.orden
    `, [id]);

    const respuestas = [];
    for (const resp of respuestasResult.rows) {
      const valoresResult = await pool.query(
        `SELECT vr.*, cp.etiqueta, cp.tipo as campo_tipo
         FROM valores_respuesta vr
         JOIN campos_plantilla cp ON vr.campo_plantilla_id = cp.id
         WHERE vr.respuesta_id = $1
         ORDER BY cp.orden`,
        [resp.respuesta_id]
      );

      respuestas.push({
        ...resp,
        valores: valoresResult.rows,
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
    const { form_id, search, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email, u.empresa,
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
      query += ` AND (u.nombre ILIKE $${paramCount} OR u.apellido ILIKE $${paramCount} OR u.rut ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.empresa ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (fecha_desde) {
      paramCount++;
      query += ` AND a.fecha_envio >= $${paramCount}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      query += ` AND a.fecha_envio <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    query += ` GROUP BY u.id, u.nombre, u.apellido, u.rut, u.email, u.empresa ORDER BY u.nombre, u.apellido`;

    const result = await pool.query(query, params);
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error('Error en reporte por usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const reportSurveys = async (req, res) => {
  try {
    const { estado, plantilla_id, search, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT f.id, f.titulo, f.estado, f.fecha_creacion, f.fecha_limite,
        p.nombre as plantilla_nombre,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as completados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado IN ('pendiente', 'en_progreso')) as en_progreso,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'vencido') as vencidos,
        (SELECT COUNT(*) FROM asignaciones_formulario af
          JOIN respuestas_formulario rf ON rf.asignacion_id = af.id AND rf.estado_validacion = 'validado'
          WHERE af.formulario_id = f.id AND af.estado = 'completado') as aprobados,
        ROUND(
          (SELECT COUNT(*) FROM asignaciones_formulario af
            JOIN respuestas_formulario rf ON rf.asignacion_id = af.id AND rf.estado_validacion = 'validado'
            WHERE af.formulario_id = f.id AND af.estado = 'completado')::numeric /
          NULLIF((SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id), 0) * 100, 1
        ) as porcentaje_aprobados
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

    if (fecha_desde) {
      paramCount++;
      query += ` AND f.fecha_creacion >= $${paramCount}`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      query += ` AND f.fecha_creacion <= $${paramCount}`;
      params.push(fecha_hasta);
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
             CASE WHEN a.estado = 'completado'
               THEN (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id)
               ELSE (SELECT COUNT(*) FROM borradores_respuesta br
                     WHERE br.asignacion_id = a.id
                     AND (br.valor_texto IS NOT NULL AND br.valor_texto != ''
                          OR br.valor_numero IS NOT NULL
                          OR br.valor_fecha IS NOT NULL
                          OR br.valor_json IS NOT NULL
                          OR br.archivo_url IS NOT NULL))
             END as campos_respondidos,
             (SELECT rf.id FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as respuesta_id,
             (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion,
             (SELECT rf.comentario_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as comentario_validacion
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
             u.id as usuario_id, u.nombre, u.apellido, u.rut, u.email, u.empresa,
             (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id) as total_campos,
             CASE WHEN a.estado = 'completado'
               THEN (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id)
               ELSE (SELECT COUNT(*) FROM borradores_respuesta br
                     WHERE br.asignacion_id = a.id
                     AND (br.valor_texto IS NOT NULL AND br.valor_texto != ''
                          OR br.valor_numero IS NOT NULL
                          OR br.valor_fecha IS NOT NULL
                          OR br.valor_json IS NOT NULL
                          OR br.archivo_url IS NOT NULL))
             END as campos_respondidos,
             (SELECT rf.id FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as respuesta_id,
             (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion,
             (SELECT rf.comentario_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as comentario_validacion
      FROM asignaciones_formulario a
      JOIN usuarios u ON a.proveedor_id = u.id
      JOIN formularios f ON a.formulario_id = f.id
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
      usuarios: result.rows.map(r => {
        const tc = r.total_campos || 1;
        const cr = r.campos_respondidos || 0;
        return {
          ...r,
          respondido: r.estado === 'completado',
          progreso: Math.round((cr / tc) * 100),
          campos_respondidos: cr,
          total_campos: tc,
        };
      }),
    });
  } catch (err) {
    console.error('Error en formUserStatus:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const previewFile = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL requerida' });

    const filename = path.basename(url);
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const ext = path.extname(filename).toLowerCase();

    // PDF, imágenes y video se sirven directamente
    const directTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg'];
    if (directTypes.includes(ext)) {
      return res.json({ type: 'direct', url });
    }

    // Excel se previsualiza client-side, solo devolver tipo
    const excelTypes = ['.xlsx', '.xls', '.csv'];
    if (excelTypes.includes(ext)) {
      return res.json({ type: 'excel', url });
    }

    // Word/PPT: convertir a PDF con LibreOffice, guardar en PostgreSQL
    const convertibleTypes = ['.docx', '.doc', '.pptx', '.ppt'];
    if (!convertibleTypes.includes(ext)) {
      return res.json({ type: 'download', url });
    }

    // Verificar si ya existe en PostgreSQL
    const cached = await pool.query(
      'SELECT id FROM preview_cache WHERE original_filename = $1',
      [filename]
    );

    if (cached.rows.length > 0) {
      return res.json({ type: 'pdf', id: cached.rows[0].id, filename });
    }

    // Convertir con LibreOffice a archivo temporal
    const tmpDir = '/tmp/preview_convert';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const pdfTmpPath = path.join(tmpDir, path.basename(filename, ext) + '.pdf');

    await new Promise((resolve, reject) => {
      execFile('libreoffice', [
        '--headless', '--convert-to', 'pdf',
        '--outdir', tmpDir,
        filePath,
      ], { timeout: 60000 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!fs.existsSync(pdfTmpPath)) {
      return res.status(500).json({ error: 'No se pudo convertir el archivo' });
    }

    // Leer PDF y guardar en PostgreSQL
    const pdfBuffer = fs.readFileSync(pdfTmpPath);
    fs.unlinkSync(pdfTmpPath); // limpiar temporal

    const result = await pool.query(
      'INSERT INTO preview_cache (original_filename, pdf_data) VALUES ($1, $2) ON CONFLICT (original_filename) DO UPDATE SET pdf_data = EXCLUDED.pdf_data, created_at = NOW() RETURNING id',
      [filename, pdfBuffer]
    );

    return res.json({ type: 'pdf', id: result.rows[0].id, filename });
  } catch (err) {
    console.error('Error en previewFile:', err);
    res.status(500).json({ error: 'Error al previsualizar' });
  }
};

const previewServe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT original_filename, pdf_data FROM preview_cache WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vista previa no encontrada' });
    }

    const row = result.rows[0];
    const originalName = path.basename(row.original_filename, path.extname(row.original_filename)) + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(row.pdf_data);
  } catch (err) {
    console.error('Error en previewServe:', err);
    res.status(500).json({ error: 'Error al servir vista previa' });
  }
};

const reportByCompany = async (req, res) => {
  try {
    const { search, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT COALESCE(u.empresa, 'Sin empresa') as empresa,
        COUNT(DISTINCT u.id) as total_proveedores,
        COUNT(DISTINCT a.id) as total_asignaciones,
        COUNT(DISTINCT CASE WHEN a.estado = 'completado' THEN a.id END) as completados,
        COUNT(DISTINCT CASE WHEN a.estado IN ('pendiente', 'en_progreso') THEN a.id END) as pendientes,
        COUNT(DISTINCT CASE WHEN a.estado = 'vencido' THEN a.id END) as vencidos,
        COUNT(DISTINCT CASE WHEN a.estado = 'completado' AND EXISTS (
          SELECT 1 FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id AND rf.estado_validacion = 'validado'
        ) THEN a.id END) as aprobados,
        ROUND(
          COUNT(DISTINCT CASE WHEN a.estado = 'completado' AND EXISTS (
            SELECT 1 FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id AND rf.estado_validacion = 'validado'
          ) THEN a.id END)::numeric /
          NULLIF(COUNT(DISTINCT a.id), 0) * 100, 1
        ) as porcentaje_aprobados
      FROM usuarios u
      LEFT JOIN asignaciones_formulario a ON a.proveedor_id = u.id
      WHERE u.rol = 'usuario'
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND u.empresa ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }
    if (fecha_desde) {
      paramCount++;
      query += ` AND a.fecha_envio >= $${paramCount}`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      paramCount++;
      query += ` AND a.fecha_envio <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    query += ` GROUP BY COALESCE(u.empresa, 'Sin empresa') ORDER BY completados DESC, empresa`;

    const result = await pool.query(query, params);
    res.json({ empresas: result.rows });
  } catch (err) {
    console.error('Error en reporte por empresa:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const exportAll = async (req, res) => {
  try {
    const { estado, plantilla_id, search, fecha_desde, fecha_hasta, format = 'xlsx' } = req.query;

    let query = `
      SELECT f.id, f.titulo, f.estado, f.fecha_creacion, f.fecha_limite,
        p.nombre as plantilla_nombre,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id) as total_asignados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'completado') as completados,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado IN ('pendiente', 'en_progreso')) as en_progreso,
        (SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id AND estado = 'vencido') as vencidos,
        (SELECT COUNT(*) FROM asignaciones_formulario af
          JOIN respuestas_formulario rf ON rf.asignacion_id = af.id AND rf.estado_validacion = 'validado'
          WHERE af.formulario_id = f.id AND af.estado = 'completado') as aprobados,
        ROUND(
          (SELECT COUNT(*) FROM asignaciones_formulario af
            JOIN respuestas_formulario rf ON rf.asignacion_id = af.id AND rf.estado_validacion = 'validado'
            WHERE af.formulario_id = f.id AND af.estado = 'completado')::numeric /
          NULLIF((SELECT COUNT(*) FROM asignaciones_formulario WHERE formulario_id = f.id), 0) * 100, 1
        ) as porcentaje_aprobados
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
    if (fecha_desde) {
      paramCount++;
      query += ` AND f.fecha_creacion >= $${paramCount}`;
      params.push(fecha_desde);
    }
    if (fecha_hasta) {
      paramCount++;
      query += ` AND f.fecha_creacion <= $${paramCount}`;
      params.push(fecha_hasta);
    }

    query += ` ORDER BY f.fecha_creacion DESC`;
    const formsResult = await pool.query(query, params);

    if (format === 'csv') {
      const headers = ['Formulario', 'Plantilla', 'Estado', 'Creado', 'Limite', 'Asignados', 'Aprobados', 'Completados', 'En Progreso', 'Vencidos', '% Aprobados', '% Pendientes'];
      const rows = [headers.join(';')];
      for (const f of formsResult.rows) {
        const pendientes = parseInt(f.total_asignados || 0) - parseInt(f.completados || 0);
        const pctPendientes = parseInt(f.total_asignados || 0) > 0
          ? (pendientes / parseInt(f.total_asignados) * 100).toFixed(1) : '0.0';
        rows.push([f.titulo, f.plantilla_nombre, f.estado, f.fecha_creacion, f.fecha_limite || '',
          f.total_asignados, f.aprobados, f.completados, f.en_progreso, f.vencidos,
          f.porcentaje_aprobados + '%', pctPendientes + '%'].join(';'));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_encuestas.csv"');
      res.send('\ufeff' + rows.join('\n'));
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Resumen Encuestas');

    // Header
    ws.addRow(['Formulario', 'Plantilla', 'Estado', 'Fecha Creación', 'Fecha Límite', 'Asignados', 'Aprobados', 'Completados', 'En Progreso', 'Vencidos', '% Aprobados', '% Pendientes']);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232856' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const f of formsResult.rows) {
      const pendientes = parseInt(f.total_asignados || 0) - parseInt(f.completados || 0);
      const pctPendientes = parseInt(f.total_asignados || 0) > 0
        ? (pendientes / parseInt(f.total_asignados) * 100).toFixed(1) : '0.0';
      ws.addRow([f.titulo, f.plantilla_nombre, f.estado,
        f.fecha_creacion ? new Date(f.fecha_creacion).toLocaleDateString('es-CL') : '',
        f.fecha_limite ? new Date(f.fecha_limite).toLocaleDateString('es-CL') : '',
        f.total_asignados, f.aprobados, f.completados, f.en_progreso, f.vencidos,
        f.porcentaje_aprobados + '%', pctPendientes + '%']);
    }

    ws.columns.forEach((col) => { col.width = 18; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_encuestas.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exportando todo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const exportFormStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Info del formulario
    const formResult = await pool.query(`
      SELECT f.titulo, f.fecha_limite, p.nombre as plantilla_nombre
      FROM formularios f
      JOIN plantillas p ON f.plantilla_id = p.id
      WHERE f.id = $1
    `, [id]);

    if (formResult.rows.length === 0) {
      return res.status(404).json({ error: 'Formulario no encontrado' });
    }

    // Estado de cada asignado
    const result = await pool.query(`
      SELECT a.estado, a.fecha_respuesta, a.fecha_envio,
             u.nombre, u.apellido, u.rut, u.email, u.empresa,
             (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id) as total_campos,
             CASE WHEN a.estado = 'completado'
               THEN (SELECT COUNT(*) FROM campos_plantilla cp WHERE cp.plantilla_id = f.plantilla_id)
               ELSE (SELECT COUNT(*) FROM borradores_respuesta br
                     WHERE br.asignacion_id = a.id
                     AND (br.valor_texto IS NOT NULL AND br.valor_texto != ''
                          OR br.valor_numero IS NOT NULL
                          OR br.valor_fecha IS NOT NULL
                          OR br.valor_json IS NOT NULL
                          OR br.archivo_url IS NOT NULL))
             END as campos_respondidos,
             (SELECT rf.estado_validacion FROM respuestas_formulario rf WHERE rf.asignacion_id = a.id ORDER BY rf.id DESC LIMIT 1) as estado_validacion
      FROM asignaciones_formulario a
      JOIN usuarios u ON a.proveedor_id = u.id
      JOIN formularios f ON a.formulario_id = f.id
      WHERE a.formulario_id = $1
      ORDER BY
        CASE WHEN a.estado = 'completado' THEN 1
             WHEN a.estado IN ('pendiente', 'en_progreso') THEN 2
             ELSE 3 END,
        u.apellido, u.nombre
    `, [id]);

    const totalAsignados = result.rows.length;
    const completados = result.rows.filter(r => r.estado === 'completado').length;
    const aprobados = result.rows.filter(r => r.estado_validacion === 'validado').length;
    const pendientes = totalAsignados - completados;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(formResult.rows[0].titulo.substring(0, 31));
    const form = formResult.rows[0];

    // Título principal
    ws.addRow([form.titulo]);
    ws.mergeCells('A1:I1');
    ws.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF232856' } };
    ws.getRow(1).alignment = { horizontal: 'left' };

    // Info del formulario
    const infoRow = ws.addRow([`Plantilla: ${form.plantilla_nombre}`, form.fecha_limite ? `Fecha limite: ${new Date(form.fecha_limite).toLocaleDateString('es-CL')}` : 'Sin fecha limite', `Generado: ${new Date().toLocaleDateString('es-CL')}`]);
    ws.mergeCells('A2:I2');
    ws.getRow(2).font = { size: 10, color: { argb: 'FF6B7280' } };

    ws.addRow([]);
    ws.addRow(['Resumen']);
    ws.mergeCells('A4:I4');
    ws.getRow(4).font = { bold: true, size: 11 };

    ws.addRow(['Total Asignados', 'Completados', 'Aprobados', 'Pendientes', '% Completado', '% Aprobados']);
    const resumenRow = ws.addRow([
      totalAsignados, completados, aprobados, pendientes,
      totalAsignados > 0 ? (completados / totalAsignados * 100).toFixed(1) + '%' : '0%',
      totalAsignados > 0 ? (aprobados / totalAsignados * 100).toFixed(1) + '%' : '0%',
    ]);
    resumenRow.font = { bold: true };
    resumenRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    resumenRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

    ws.addRow([]);

    // Tabla detallada
    const headers = ['Proveedor', 'RUT', 'Email', 'Empresa', 'Estado', 'Progreso', 'Validacion', 'Fecha Envio', 'Fecha Respuesta'];
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232856' } };

    const estadoLabel = (e) => {
      switch (e) {
        case 'completado': return 'Completado';
        case 'en_progreso': return 'En progreso';
        case 'vencido': return 'Vencido';
        default: return 'Pendiente';
      }
    };

    const validacionLabel = (v) => {
      switch (v) {
        case 'validado': return 'Aprobado';
        case 'rechazado': return 'Rechazado';
        default: return 'Pendiente';
      }
    };

    for (const row of result.rows) {
      const tc = row.total_campos || 1;
      const cr = row.campos_respondidos || 0;
      const progreso = Math.round((cr / tc) * 100);
      const wsRow = ws.addRow([
        `${row.nombre || ''} ${row.apellido || ''}`.trim(),
        row.rut || '',
        row.email || '',
        row.empresa || '',
        estadoLabel(row.estado),
        `${cr}/${tc} (${progreso}%)`,
        row.estado === 'completado' ? validacionLabel(row.estado_validacion) : '-',
        row.fecha_envio ? new Date(row.fecha_envio).toLocaleDateString('es-CL') : '',
        row.fecha_respuesta ? new Date(row.fecha_respuesta).toLocaleDateString('es-CL') : '',
      ]);

      // Colorear fila según estado
      const bgColor = row.estado === 'completado'
        ? (row.estado_validacion === 'validado' ? 'FFC8E6C9' : 'FFFFF9C4')
        : row.estado === 'vencido' ? 'FFFFCDD2' : 'FFFFFFFF';
      wsRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      });
    }

    ws.columns.forEach((col) => { col.width = 20 });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${formResult.rows[0].titulo} - Estado.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exportando estado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { summary, formDetail, exportForm, formResponses, reportByUser, reportSurveys, userDetail, formUserStatus, previewFile, previewServe, reportByCompany, exportAll, exportFormStatus };
