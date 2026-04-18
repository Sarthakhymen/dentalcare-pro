// ============================================================
// Appointment Routes
// Public routes: book, approve, reject
// Protected routes: list appointments (doctor only)
// ============================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  bookAppointment,
  getAppointments,
  approveAppointment,
  rejectAppointment
} = require('../controllers/appointmentController');

// PUBLIC: Patient books a new appointment
router.post('/book', bookAppointment);

// PROTECTED: Doctor gets all appointments
router.get('/appointments', authMiddleware, getAppointments);

// PUBLIC (via email link): Doctor approves appointment
router.get('/approve/:id', approveAppointment);

// PUBLIC (via email link): Doctor rejects appointment
router.get('/reject/:id', rejectAppointment);

module.exports = router;
