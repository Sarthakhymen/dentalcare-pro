// ============================================================
// Email Controller
// Handles all email sending: doctor notifications,
// patient confirmations, and patient rejections
// Uses Nodemailer with Gmail SMTP
// ============================================================

const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection on startup
transporter.verify()
  .then(() => console.log('✅ Email transporter ready'))
  .catch((err) => console.warn('⚠️  Email transporter not configured:', err.message));

// ─────────────────────────────────────────────
// Send notification email to doctor when a new
// appointment is booked by a patient
// ─────────────────────────────────────────────
async function sendDoctorNotification(appointment) {
  const { id, patient_name, patient_email, patient_phone, appointment_date, appointment_time, problem } = appointment;

  const approveUrl = `${process.env.BACKEND_URL}/api/approve/${id}`;
  const rejectUrl = `${process.env.BACKEND_URL}/api/reject/${id}`;

  // Format date for display
  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width:600px; margin:30px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding:32px 40px; text-align:center;">
          <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:600;">🦷 New Appointment Request</h1>
          <p style="color:#ccfbf1; margin:8px 0 0; font-size:14px;">A patient has requested an appointment</p>
        </div>
        
        <!-- Content -->
        <div style="padding:32px 40px;">
          <h2 style="color:#0f172a; margin:0 0 20px; font-size:18px;">Patient Details</h2>
          
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:12px 16px; background:#f8fafc; border-radius:8px 0 0 0; font-weight:600; color:#475569; width:140px;">Patient Name</td>
              <td style="padding:12px 16px; background:#f8fafc; border-radius:0 8px 0 0; color:#0f172a;">${patient_name}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; font-weight:600; color:#475569;">Email</td>
              <td style="padding:12px 16px; color:#0f172a;">${patient_email}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; background:#f8fafc; font-weight:600; color:#475569;">Phone</td>
              <td style="padding:12px 16px; background:#f8fafc; color:#0f172a;">${patient_phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; font-weight:600; color:#475569;">Date</td>
              <td style="padding:12px 16px; color:#0f172a;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; background:#f8fafc; font-weight:600; color:#475569;">Time</td>
              <td style="padding:12px 16px; background:#f8fafc; color:#0f172a;">${appointment_time}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; font-weight:600; color:#475569; border-radius:0 0 0 8px;">Problem</td>
              <td style="padding:12px 16px; color:#0f172a; border-radius:0 0 8px 0;">${problem || 'Not specified'}</td>
            </tr>
          </table>
          
          <!-- Action Buttons -->
          <div style="margin-top:32px; text-align:center;">
            <a href="${approveUrl}" style="display:inline-block; padding:14px 40px; background:linear-gradient(135deg, #059669, #10b981); color:#ffffff; text-decoration:none; border-radius:10px; font-weight:600; font-size:16px; margin-right:12px; box-shadow:0 4px 12px rgba(16,185,129,0.3);">✅ Approve</a>
            <a href="${rejectUrl}" style="display:inline-block; padding:14px 40px; background:linear-gradient(135deg, #dc2626, #ef4444); color:#ffffff; text-decoration:none; border-radius:10px; font-weight:600; font-size:16px; box-shadow:0 4px 12px rgba(239,68,68,0.3);">❌ Reject</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding:20px 40px; background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8; margin:0; font-size:12px;">DentalCare Pro — Appointment Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"DentalCare Pro" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to the doctor (same as configured email)
      subject: `New Appointment Request from ${patient_name}`,
      html: htmlContent
    });
    console.log(`📧 Doctor notification sent for appointment #${id}`);
  } catch (error) {
    console.error('❌ Failed to send doctor notification:', error.message);
  }
}

// ─────────────────────────────────────────────
// Send confirmation email to patient when
// doctor approves the appointment
// ─────────────────────────────────────────────
async function sendPatientConfirmation(appointment) {
  const { patient_name, patient_email, appointment_date, appointment_time } = appointment;

  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width:600px; margin:30px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding:32px 40px; text-align:center;">
          <h1 style="color:#ffffff; margin:0; font-size:28px;">✅ Appointment Confirmed!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding:32px 40px;">
          <p style="color:#0f172a; font-size:16px; line-height:1.6;">
            Dear <strong>${patient_name}</strong>,
          </p>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            Great news! Your dental appointment has been confirmed. Here are the details:
          </p>
          
          <div style="background:linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius:12px; padding:24px; margin:24px 0; border-left:4px solid #10b981;">
            <p style="margin:0 0 8px; color:#064e3b;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin:0 0 8px; color:#064e3b;"><strong>🕐 Time:</strong> ${appointment_time}</p>
            <p style="margin:0; color:#064e3b;"><strong>📍 Location:</strong> DentalCare Pro Clinic</p>
          </div>
          
          <div style="background:#fffbeb; border-radius:12px; padding:20px; margin:20px 0; border-left:4px solid #f59e0b;">
            <p style="margin:0; color:#92400e; font-size:14px;">
              ⏰ <strong>Please arrive 10 minutes early</strong> to complete any necessary paperwork. 
              Bring a valid ID and your insurance card if applicable.
            </p>
          </div>
          
          <p style="color:#475569; font-size:14px; line-height:1.6;">
            If you need to reschedule or cancel, please contact us at least 24 hours in advance.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding:20px 40px; background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8; margin:0; font-size:12px;">DentalCare Pro — Your Smile, Our Priority</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"DentalCare Pro" <${process.env.EMAIL_USER}>`,
      to: patient_email,
      subject: '✅ Your Appointment is Confirmed!',
      html: htmlContent
    });
    console.log(`📧 Confirmation email sent to ${patient_email}`);
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error.message);
  }
}

// ─────────────────────────────────────────────
// Send rejection email to patient when
// doctor rejects the appointment
// ─────────────────────────────────────────────
async function sendPatientRejection(appointment) {
  const { patient_name, patient_email } = appointment;
  const rebookUrl = `${process.env.FRONTEND_URL}/booking.html`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width:600px; margin:30px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #475569 0%, #64748b 100%); padding:32px 40px; text-align:center;">
          <h1 style="color:#ffffff; margin:0; font-size:24px;">About Your Appointment Request</h1>
        </div>
        
        <!-- Content -->
        <div style="padding:32px 40px;">
          <p style="color:#0f172a; font-size:16px; line-height:1.6;">
            Dear <strong>${patient_name}</strong>,
          </p>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            We're sorry, but we were unable to accommodate your appointment request at the requested time. 
            This may be due to scheduling conflicts or the doctor's availability.
          </p>
          <p style="color:#475569; font-size:15px; line-height:1.6;">
            We encourage you to book a new appointment at a different time. We'd love to see you!
          </p>
          
          <div style="text-align:center; margin:32px 0;">
            <a href="${rebookUrl}" style="display:inline-block; padding:14px 40px; background:linear-gradient(135deg, #0d9488, #0891b2); color:#ffffff; text-decoration:none; border-radius:10px; font-weight:600; font-size:16px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">📅 Book a New Appointment</a>
          </div>
          
          <p style="color:#94a3b8; font-size:13px; text-align:center;">
            Need help? Contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#0d9488;">${process.env.EMAIL_USER}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding:20px 40px; background:#f8fafc; text-align:center; border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8; margin:0; font-size:12px;">DentalCare Pro — Your Smile, Our Priority</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"DentalCare Pro" <${process.env.EMAIL_USER}>`,
      to: patient_email,
      subject: 'About your appointment request',
      html: htmlContent
    });
    console.log(`📧 Rejection email sent to ${patient_email}`);
  } catch (error) {
    console.error('❌ Failed to send rejection email:', error.message);
  }
}

module.exports = {
  sendDoctorNotification,
  sendPatientConfirmation,
  sendPatientRejection
};
