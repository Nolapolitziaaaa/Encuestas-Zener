const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'encuestas_zener',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Execute a query with RLS session variables set.
 * Acquires a client, sets app.user_id in a transaction,
 * runs the query, and releases the client.
 *
 * @param {Object} user - The authenticated user object (req.user)
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const queryWithRLS = async (user, text, params) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (user && user.id) {
      await client.query('SET LOCAL app.user_id = $1', [String(user.id)]);
    }
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');
    client.release();
  } catch (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    process.exit(-1);
  }
};

module.exports = { pool, testConnection, queryWithRLS };
