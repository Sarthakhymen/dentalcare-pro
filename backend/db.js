// ============================================================
// Database Connection Module
// Uses mysql2 with promise support for async/await queries
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for better performance and connection management
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Enable multiple statements for initialization
  multipleStatements: true
});


// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // Create appointments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_name VARCHAR(100) NOT NULL,
        patient_email VARCHAR(100) NOT NULL,
        patient_phone VARCHAR(15),
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        problem TEXT,
        status ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create doctors table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255)
      )
    `);

    connection.release();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

module.exports = { pool, initializeDatabase };
