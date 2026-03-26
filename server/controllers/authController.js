const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/postgres');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  try {
    const { rut, password } = req.body;

    if (!rut || !password) {
      return res.status(400).json({ error: 'RUT y contraseña son requeridos' });
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE rut = $1',
      [rut]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (usuario_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        rut: user.rut,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const register = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token y contraseña son requeridos' });
    }

    await client.query('BEGIN');

    const invitationResult = await client.query(
      'SELECT * FROM invitaciones WHERE token = $1 AND estado = $2',
      [token, 'pendiente']
    );

    if (invitationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invitación no encontrada o ya utilizada' });
    }

    const invitation = invitationResult.rows[0];

    const existingUser = await client.query(
      'SELECT id FROM usuarios WHERE rut = $1 OR email = $2',
      [invitation.rut, invitation.email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe una cuenta con este RUT o email' });
    }

    if (password.length < 6) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO usuarios (rut, password_hash, nombre, apellido, email, rol)
       VALUES ($1, $2, $3, $4, $5, 'usuario') RETURNING id, rut, nombre, apellido, email, rol`,
      [invitation.rut, passwordHash, invitation.nombre, invitation.apellido, invitation.email]
    );

    await client.query(
      'UPDATE invitaciones SET estado = $1, fecha_registro = CURRENT_TIMESTAMP WHERE id = $2',
      ['registrada', invitation.id]
    );

    await client.query('COMMIT');

    const user = userResult.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (usuario_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

const verifyInvite = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      'SELECT nombre, apellido, rut, email FROM invitaciones WHERE token = $1 AND estado = $2',
      [token, 'pendiente']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitación no válida o ya utilizada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error verificando invitación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const newTokens = generateTokens(decoded.userId);

    await pool.query(
      'DELETE FROM refresh_tokens WHERE token = $1',
      [refreshToken]
    );

    await pool.query(
      'INSERT INTO refresh_tokens (usuario_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [decoded.userId, newTokens.refreshToken]
    );

    res.json(newTokens);
  } catch (err) {
    console.error('Error refrescando token:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Invalidar todos los refresh tokens del usuario
      await pool.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [req.user?.id]);
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, rut, nombre, apellido, email, rol, fecha_registro, ultimo_acceso
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Estadísticas
    let stats = {};
    if (user.rol === 'admin') {
      const statsResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM invitaciones) as total_invitaciones,
          (SELECT COUNT(*) FROM invitaciones WHERE estado = 'pendiente') as invitaciones_pendientes,
          (SELECT COUNT(*) FROM plantillas WHERE activa = true) as plantillas_activas,
          (SELECT COUNT(*) FROM formularios) as total_formularios,
          (SELECT COUNT(*) FROM formularios WHERE estado = 'pendiente') as formularios_pendientes,
          (SELECT COUNT(*) FROM asignaciones_formulario WHERE estado = 'completado') as respuestas_recibidas
      `);
      stats = statsResult.rows[0];
    } else {
      const statsResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM asignaciones_formulario WHERE proveedor_id = $1 AND estado = 'pendiente') as pendientes,
          (SELECT COUNT(*) FROM asignaciones_formulario WHERE proveedor_id = $1 AND estado = 'completado') as completados,
          (SELECT COUNT(*) FROM asignaciones_formulario WHERE proveedor_id = $1 AND estado = 'vencido') as vencidos
      `, [user.id]);
      stats = statsResult.rows[0];
    }

    res.json({ ...user, stats });
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const result = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [passwordHash, req.user.id]
    );

    await pool.query('DELETE FROM refresh_tokens WHERE usuario_id = $1', [req.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  login,
  register,
  verifyInvite,
  refreshToken,
  logout,
  me,
  changePassword,
};
