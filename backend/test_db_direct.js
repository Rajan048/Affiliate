const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM products');
    console.log('Product count:', res.rows[0].count);
    const groups = await pool.query('SELECT category, COUNT(*) FROM products GROUP BY category');
    console.log('Category breakdown:', groups.rows);
    const sample = await pool.query('SELECT * FROM products LIMIT 5');
    console.log('Sample products:', sample.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

check();
