require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const { pool, testConnection } = require('./config/postgres');
const { verifyConnection, sendDeadlineReminder, sendDailySummaryEmail } = require('./services/emailService');

const authRoutes = require('./routes/auth');
const invitationRoutes = require('./routes/invitations');
const templateRoutes = require('./routes/templates');
const formRoutes = require('./routes/forms');
const responseRoutes = require('./routes/responses');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy para rate limiting detrás de Nginx
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - límites relajados para uso interno
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Demasiados intentos de login. Intente nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', loginLimiter);

// Archivos estáticos (uploads y descargas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use('/logo.png', express.static(path.join(__dirname, 'logo.png')));

// Configurar multer para subida de archivos
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 80);
    cb(null, `${Date.now()}-${sanitizedName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
      '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm',
      '.mp3', '.wav', '.ogg', '.aac', '.wma', '.flac',
      '.txt', '.csv'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${ext}`));
    }
  },
});

// Endpoint de subida de archivos (respuestas de usuarios)
app.post('/api/upload', (req, res) => {
  const singleUpload = upload.single('file');
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.originalname,
    });
  });
});

// Endpoint de subida de archivos de plantilla (documentos descargables)
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

const downloadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, downloadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 80);
    cb(null, `${sanitizedName}${ext}`);
  },
});

const downloadUpload = multer({
  storage: downloadStorage,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten documentos: PDF, Word, Excel, PPT, TXT, CSV'));
    }
  },
});

app.post('/api/upload-template', (req, res) => {
  const singleUpload = downloadUpload.single('file');
  singleUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    res.json({
      url: `/downloads/${req.file.filename}`,
      filename: req.file.originalname,
    });
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  // SPA fallback: cualquier ruta que no sea API ni archivo estático → index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.includes('.')) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMB = Math.round((parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760) / 1048576);
      return res.status(400).json({ error: `El archivo supera el limite de ${maxMB}MB permitido` });
    }
    return res.status(400).json({ error: 'Error al subir el archivo: ' + err.message });
  }
  if (err.type === 'entity.too.large') {
    const maxMB = Math.round((parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760) / 1048576);
    return res.status(413).json({ error: `El archivo supera el limite de ${maxMB}MB permitido` });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Marcar formularios vencidos periódicamente
const marcarVencidos = async () => {
  try {
    await pool.query(`
      UPDATE asignaciones_formulario
      SET estado = 'vencido'
      WHERE estado IN ('pendiente', 'en_progreso')
      AND formulario_id IN (
        SELECT id FROM formularios
        WHERE fecha_limite IS NOT NULL AND fecha_limite < CURRENT_TIMESTAMP AND estado = 'pendiente'
      );
      UPDATE formularios SET estado = 'vencido'
      WHERE estado = 'pendiente' AND fecha_limite IS NOT NULL AND fecha_limite < CURRENT_TIMESTAMP;
    `);
  } catch (err) {
    console.error('Error marcando vencidos:', err.message);
  }
};

// Crear tabla de recordatorios si no existe
const initRecordatorios = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recordatorios_enviados (
        id SERIAL PRIMARY KEY,
        asignacion_id INTEGER NOT NULL REFERENCES asignaciones_formulario(id) ON DELETE CASCADE,
        dias_antes INTEGER NOT NULL,
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asignacion_id, dias_antes)
      );
    `);
    console.log('Tabla recordatorios_enviados verificada');
  } catch (err) {
    console.error('Error creando tabla recordatorios:', err.message);
  }
};

// Crear tabla de notificaciones si no existe
const initNotificaciones = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(300) NOT NULL,
        mensaje TEXT,
        formulario_id INTEGER,
        respuesta_id INTEGER,
        proveedor_id INTEGER,
        proveedor_nombre VARCHAR(200),
        proveedor_empresa VARCHAR(200),
        leida BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla notificaciones verificada');
  } catch (err) {
    console.error('Error creando tabla notificaciones:', err.message);
  }
};

// Enviar recordatorios de formularios próximos a vencer
const enviarRecordatorios = async () => {
  try {
    // Buscar asignaciones pendientes con fecha_limite entre hoy y 7 días
    const result = await pool.query(`
      SELECT
        a.id as asignacion_id,
        u.nombre, u.apellido, u.email,
        f.titulo, f.fecha_limite,
        DATE(f.fecha_limite) - DATE(CURRENT_TIMESTAMP) as dias_restantes
      FROM asignaciones_formulario a
      JOIN formularios f ON a.formulario_id = f.id
      JOIN usuarios u ON a.proveedor_id = u.id
      WHERE a.estado = 'pendiente'
        AND f.estado = 'pendiente'
        AND f.fecha_limite IS NOT NULL
        AND f.fecha_limite > CURRENT_TIMESTAMP
        AND DATE(f.fecha_limite) - DATE(CURRENT_TIMESTAMP) IN (7, 5, 3, 2, 1)
    `);

    for (const row of result.rows) {
      const dias = parseInt(row.dias_restantes);

      // Verificar si ya se envió recordatorio para esta asignación y estos días
      const enviado = await pool.query(
        'SELECT id FROM recordatorios_enviados WHERE asignacion_id = $1 AND dias_antes = $2',
        [row.asignacion_id, dias]
      );

      if (enviado.rows.length > 0) continue;

      try {
        await sendDeadlineReminder(
          `${row.nombre} ${row.apellido || ''}`.trim(),
          row.email,
          row.titulo,
          row.fecha_limite,
          dias
        );

        await pool.query(
          'INSERT INTO recordatorios_enviados (asignacion_id, dias_antes) VALUES ($1, $2)',
          [row.asignacion_id, dias]
        );

        console.log(`Recordatorio enviado: ${row.email} - "${row.titulo}" (${dias} días restantes)`);
      } catch (emailErr) {
        console.error(`Error enviando recordatorio a ${row.email}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('Error en job de recordatorios:', err.message);
  }
};

// Enviar resumen diario a admins
const enviarResumenDiario = async () => {
  try {
    const adminsResult = await pool.query(
      "SELECT email FROM usuarios WHERE rol = 'admin' AND activo = true"
    );
    const adminEmails = adminsResult.rows.map((r) => r.email);
    if (!adminEmails.length) {
      console.log('No hay admins activos para enviar resumen diario');
      return;
    }

    const result = await pool.query(`
      SELECT
        rf.fecha_envio,
        rf.estado_validacion,
        f.titulo as formulario_titulo,
        u.nombre, u.apellido, u.empresa
      FROM respuestas_formulario rf
      JOIN formularios f ON rf.formulario_id = f.id
      JOIN usuarios u ON rf.proveedor_id = u.id
      WHERE rf.fecha_envio >= CURRENT_DATE - INTERVAL '1 day'
        AND rf.fecha_envio < CURRENT_DATE
      ORDER BY rf.fecha_envio DESC
    `);

    if (result.rows.length === 0) {
      console.log('No hubo respuestas ayer, no se envia resumen');
      return;
    }

    const resumen = result.rows.map((r) => ({
      proveedor_nombre: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
      proveedor_empresa: r.empresa || '-',
      formulario_titulo: r.formulario_titulo,
      fecha_envio: new Date(r.fecha_envio).toLocaleString('es-CL'),
      estado_validacion: r.estado_validacion || 'pendiente',
    }));

    await sendDailySummaryEmail(adminEmails, resumen);
    console.log(`Resumen diario enviado a ${adminEmails.length} admin(s) con ${resumen.length} respuesta(s)`);
  } catch (err) {
    console.error('Error enviando resumen diario:', err.message);
  }
};

// Iniciar servidor
const startServer = async () => {
  await testConnection();
  await verifyConnection();
  await initRecordatorios();
  await initNotificaciones();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Encuestas Zener Chile corriendo en puerto ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  setInterval(marcarVencidos, 5 * 60 * 1000);
  marcarVencidos();

  // Recordatorios cada 6 horas
  setInterval(enviarRecordatorios, 6 * 60 * 60 * 1000);
  setTimeout(enviarRecordatorios, 60 * 1000); // primer ejecución a los 60 segundos

  // Resumen diario a las 8:00 AM (recalcula cada vez para evitar drift)
  const scheduleDailySummary = () => {
    const scheduleNext = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(8, 0, 0, 0);
      if (now >= target) {
        target.setDate(target.getDate() + 1);
      }
      const msUntil8 = target - now;
      const horas = Math.floor(msUntil8 / 3600000);
      const mins = Math.floor((msUntil8 % 3600000) / 60000);
      console.log(`Resumen diario programado: en ${horas}h ${mins}m`);
      setTimeout(async () => {
        await enviarResumenDiario();
        scheduleNext();
      }, msUntil8);
    };
    scheduleNext();
  };
  scheduleDailySummary();
};

startServer();
