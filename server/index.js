require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const { pool, testConnection } = require('./config/postgres');
const { verifyConnection } = require('./services/emailService');

const authRoutes = require('./routes/auth');
const invitationRoutes = require('./routes/invitations');
const templateRoutes = require('./routes/templates');
const formRoutes = require('./routes/forms');
const responseRoutes = require('./routes/responses');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');

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
    cb(null, `${uuidv4()}${ext}`);
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
    return res.status(400).json({ error: err.message });
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

// Iniciar servidor
const startServer = async () => {
  await testConnection();
  await verifyConnection();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Encuestas Zener Chile corriendo en puerto ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  setInterval(marcarVencidos, 5 * 60 * 1000);
  marcarVencidos();
};

startServer();
