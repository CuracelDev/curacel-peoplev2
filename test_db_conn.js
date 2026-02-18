const { Pool } = require('pg');
const connectionString = "postgresql://peopleos_user:P3ople0S_Secure_2026!@34.145.99.193:5432/peopleos_production?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection error:', err);
  } else {
    console.log('Connection success:', res.rows[0]);
  }
  pool.end();
});
