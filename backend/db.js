const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Essential for Neon's serverless connection
  }
});

/**
 * Compatibility wrapper to mimic mysql2/promise query return structure.
 * MySQL returns [rows, fields], PostgreSQL returns { rows, fields... }.
 * We return [result.rows, result.fields] for minimal refactoring.
 */
const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return [res.rows, res.fields];
  } catch (err) {
    console.error('DATABASE QUERY ERROR:', { text, params, error: err.message });
    throw err;
  }
};

module.exports = {
  pool,
  query
};
