// ============================================================
// Appointment Controller
// Handles CRUD operations for appointments:
// - Book new appointment
// - Get all appointments
// - Approve appointment
// - Reject appointment
// ============================================================

const { pool } = require('../db');
const { sendDoctorNotification, sendPatientConfirmation, sendPatientRejection } = require('./smsController');

// ─────────────────────────────────────────────
// POST /api/book
// Create a new appointment with status 'pending'
// Then notify the doctor via email
// ─────────────────────────────────────────────
async function bookAppointment(req, res) {
  try {
    const { patient_name, patient_email, patient_phone, appointment_date, appointment_time, problem } = req.body;

    // Validate required fields
    if (!patient_name || !patient_email || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (name, email, date, time)'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patient_email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Insert appointment into database
    const [result] = await pool.query(
      `INSERT INTO appointments (patient_name, patient_email, patient_phone, appointment_date, appointment_time, problem)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_name, patient_email, patient_phone || null, appointment_date, appointment_time, problem || null]
    );

    // Fetch the newly created appointment
    const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [result.insertId]);
    const appointment = rows[0];

    // Send notification email to doctor (async, don't block response)
    sendDoctorNotification(appointment).catch(err =>
      console.error('Background email error:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Your appointment request has been received! We will notify you once the doctor reviews it.',
      appointment: {
        id: appointment.id,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
}

// ─────────────────────────────────────────────
// GET /api/appointments
// Get all appointments (protected route - doctor only)
// Supports optional status filter via query param
// ─────────────────────────────────────────────
async function getAppointments(req, res) {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM appointments ORDER BY created_at DESC';
    let params = [];

    // Filter by status if provided
    if (status && ['pending', 'confirmed', 'rejected'].includes(status)) {
      query = 'SELECT * FROM appointments WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    }

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      appointments: rows
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
}

// ─────────────────────────────────────────────
// GET /api/approve/:id
// Approve a pending appointment and email patient
// This can be accessed via email link (no auth required)
// ─────────────────────────────────────────────
async function approveAppointment(req, res) {
  try {
    const { id } = req.params;

    // Fetch the appointment
    const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).send(generateResponsePage('Not Found', 'Appointment not found.', 'error'));
    }

    const appointment = rows[0];

    if (appointment.status === 'confirmed') {
      return res.send(generateResponsePage('Already Approved', 'This appointment has already been confirmed.', 'info'));
    }

    if (appointment.status === 'rejected') {
      return res.send(generateResponsePage('Already Rejected', 'This appointment was previously rejected.', 'warning'));
    }

    // Update status to confirmed
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', id]);

    // Construct WhatsApp Link
    let waLink = '';
    if (appointment.patient_phone) {
      let phone = appointment.patient_phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      else if (phone.startsWith('0')) phone = '91' + phone.substring(1);

      const dateObj = new Date(appointment.appointment_date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
      
      const message = `✅ *APPOINTMENT CONFIRMED!*\n\nHi ${appointment.patient_name}, your dental appointment is confirmed.\n\n📅 *Date:* ${formattedDate}\n🕐 *Time:* ${appointment.appointment_time}\n📍 *Location:* DentalCare Pro Clinic\n\n⏰ Please arrive 10 minutes early.`;
      waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    // Check if JSON response is requested
    if (req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({
        success: true,
        message: 'Appointment approved successfully',
        waLink: waLink
      });
    }

    res.send(generateResponsePage(
      'Appointment Approved ✅',
      `The appointment for <strong>${appointment.patient_name}</strong> has been confirmed. Click the button below to send the confirmation via WhatsApp.`,
      'success',
      waLink,
      'Send WhatsApp Confirmation'
    ));

  } catch (error) {
    console.error('Approve appointment error:', error);
    if (req.query.format === 'json') {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.status(500).send(generateResponsePage('Error', 'Something went wrong. Please try again.', 'error'));
  }
}

// ─────────────────────────────────────────────
// GET /api/reject/:id
// Reject a pending appointment and email patient
// This can be accessed via email link (no auth required)
// ─────────────────────────────────────────────
async function rejectAppointment(req, res) {
  try {
    const { id } = req.params;

    // Fetch the appointment
    const [rows] = await pool.query('SELECT * FROM appointments WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).send(generateResponsePage('Not Found', 'Appointment not found.', 'error'));
    }

    const appointment = rows[0];

    if (appointment.status === 'rejected') {
      return res.send(generateResponsePage('Already Rejected', 'This appointment has already been rejected.', 'info'));
    }

    if (appointment.status === 'confirmed') {
      return res.send(generateResponsePage('Already Confirmed', 'This appointment was previously confirmed.', 'warning'));
    }

    // Update status to rejected
    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', ['rejected', id]);

    // Construct WhatsApp Link
    let waLink = '';
    if (appointment.patient_phone) {
      let phone = appointment.patient_phone.replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      else if (phone.startsWith('0')) phone = '91' + phone.substring(1);

      // Dynamically detect host for the rebook URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const rebookUrl = `${protocol}://${host}/booking.html`;
      
      const message = `❌ *APPOINTMENT UPDATE*\n\nHi ${appointment.patient_name}, we're sorry but we couldn't accommodate your requested appointment time.\n\nPlease rebook at a different time:\n📅 ${rebookUrl}\n\nWe'd love to see you!\n— DentalCare Pro`;
      waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }

    // Check if JSON response is requested
    if (req.query.format === 'json' || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({
        success: true,
        message: 'Appointment rejected successfully',
        waLink: waLink
      });
    }

    res.send(generateResponsePage(
      'Appointment Rejected',
      `The appointment for <strong>${appointment.patient_name}</strong> has been rejected. Click the button below to notify them via WhatsApp.`,
      'rejected',
      waLink,
      'Send WhatsApp Rejection'
    ));

  } catch (error) {
    console.error('Reject appointment error:', error);
    if (req.query.format === 'json') {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.status(500).send(generateResponsePage('Error', 'Something went wrong. Please try again.', 'error'));
  }
}

// ─────────────────────────────────────────────
// Helper: Generate a styled HTML response page
// Used for approve/reject email link responses
// ─────────────────────────────────────────────
function generateResponsePage(title, message, type, linkUrl = null, linkText = 'Send Message') {
  const colors = {
    success: { bg: '#ecfdf5', accent: '#10b981', icon: '✅' },
    error: { bg: '#fef2f2', accent: '#ef4444', icon: '❌' },
    info: { bg: '#eff6ff', accent: '#3b82f6', icon: 'ℹ️' },
    warning: { bg: '#fffbeb', accent: '#f59e0b', icon: '⚠️' },
    rejected: { bg: '#fef2f2', accent: '#64748b', icon: '📋' }
  };

  const c = colors[type] || colors.info;

  const btnHtml = linkUrl 
    ? `<a href="${linkUrl}" style="display:inline-block; margin-top:20px; padding:12px 24px; background:#25D366; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; font-size:16px;">💬 ${linkText}</a>` 
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} — DentalCare Pro</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background:linear-gradient(135deg,#f0f4f8,#e2e8f0); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
        .card { background:#fff; border-radius:20px; padding:48px; max-width:500px; width:100%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.08); }
        .icon { font-size:48px; margin-bottom:16px; }
        h1 { color:#0f172a; font-size:24px; margin-bottom:16px; }
        p { color:#475569; font-size:15px; line-height:1.7; }
        .accent-bar { width:60px; height:4px; background:${c.accent}; border-radius:2px; margin:24px auto 0; }
        a:hover { opacity:0.9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${c.icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        ${btnHtml}
        <div class="accent-bar"></div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  bookAppointment,
  getAppointments,
  approveAppointment,
  rejectAppointment
};
