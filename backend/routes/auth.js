// ============================================================
// Auth Routes
// POST /api/login — Doctor login with email/password
// Returns JWT token on successful authentication
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
require('dotenv').config();

// ─────────────────────────────────────────────
// POST /api/login
// Authenticate doctor and return JWT token
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find doctor by email
    const [rows] = await pool.query('SELECT * FROM doctors WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const doctor = rows[0];

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, doctor.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { id: doctor.id, email: doctor.email, name: doctor.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

module.exports = router;
