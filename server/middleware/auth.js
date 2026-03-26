const jwt = require('jsonwebtoken');
const { pool } = require('../config/postgres');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await pool.query(
      'SELECT id, rut, nombre, apellido, email, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!userResult.rows[0].activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userResult = await pool.query(
        'SELECT id, rut, nombre, apellido, email, rol, activo FROM usuarios WHERE id = $1',
        [decoded.userId]
      );
      if (userResult.rows.length > 0 && userResult.rows[0].activo) {
        req.user = userResult.rows[0];
      }
    }
  } catch (err) {
    // Token inválido, continuar sin autenticación
  }
  next();
};

module.exports = { verifyToken, optionalAuth };
