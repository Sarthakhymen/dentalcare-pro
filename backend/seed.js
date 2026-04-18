// ============================================================
// Database Seeder
// Creates a default doctor account for testing
// Run: node seed.js
// ============================================================

const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('./db');

async function seed() {
  try {
    await initializeDatabase();

    // Check if doctor already exists
    const [existing] = await pool.query('SELECT * FROM doctors WHERE email = ?', ['doctor@dentalcare.com']);

    if (existing.length > 0) {
      console.log('ℹ️  Doctor account already exists');
    } else {
      // Hash the password
      const hashedPassword = await bcrypt.hash('doctor123', 12);

      await pool.query(
        'INSERT INTO doctors (name, email, password) VALUES (?, ?, ?)',
        ['Dr. Sarah Mitchell', 'doctor@dentalcare.com', hashedPassword]
      );

      console.log('✅ Default doctor account created:');
      console.log('   Email: doctor@dentalcare.com');
      console.log('   Password: doctor123');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
