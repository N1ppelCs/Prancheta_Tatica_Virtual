const mysql = require('mysql2/promise');

async function initializeDatabase() {
  try {
    // Connect without DB first to verify/create database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '010320',
      port: process.env.DB_PORT || 3306
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'Taticas'}\`;`);
    await connection.end();
  } catch (err) {
    console.warn('Warning: Could not verify or create database automatically (this is normal on some hosts):', err.message);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '010320',
  database: process.env.DB_NAME || 'Taticas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  pool,
  initializeDatabase
};
