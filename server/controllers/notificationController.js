const { pool } = require('../config/postgres');

const list = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT n.*, f.titulo as formulario_titulo
       FROM notificaciones n
       LEFT JOIN formularios f ON n.formulario_id = f.id
       ORDER BY n.leida ASC, n.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notificaciones WHERE leida = false'
    );

    res.json({
      notificaciones: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('Error listando notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notificaciones SET leida = true WHERE id = $1', [id]);
    res.json({ message: 'Notificacion marcada como leida' });
  } catch (err) {
    console.error('Error marcando notificacion:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = true WHERE leida = false');
    res.json({ message: 'Todas las notificaciones marcadas como leidas' });
  } catch (err) {
    console.error('Error marcando todas las notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const unreadCount = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notificaciones WHERE leida = false'
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error obteniendo conteo de notificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { list, markRead, markAllRead, unreadCount };
