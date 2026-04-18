// ============================================================
// Express Server — DentalCare Pro Backend
// Entry point for the dental clinic appointment system
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./db');
const appointmentRoutes = require('./routes/appointments');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────── Middleware ───────
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────── Serve frontend static files ───────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────── API Routes ───────
app.use('/api', appointmentRoutes);
app.use('/api', authRoutes);

// ─────── Serve Doctor Dashboard (Admin) ───────
// We serve this AT /admin. Note: we use a specific path to avoid conflict with the patient app
app.use('/admin', express.static(path.join(__dirname, '..', 'admin-frontend')));

// ─────── Serve Patient Frontend (Static) ───────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────── Special Route: /admin should serve dashboard index.html ───────
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-frontend', 'index.html'));
});

// ─────── Health check endpoint ───────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DentalCare Pro API is running' });
});

// ─────── Catch-all: serve patient frontend for any other route ───────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─────── Global error handler ───────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ─────── Start server ───────
async function startServer() {
  try {
    // Initialize database tables
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║     🦷 DentalCare Pro Unified Server    ║
║     Running on port ${PORT}                ║
║     - Patient App: http://localhost:${PORT} ║
║     - Doctor App:  http://localhost:${PORT}/admin ║
╚══════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();


