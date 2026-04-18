// ============================================================
// SMS Controller — Twilio
// Handles all SMS notifications:
//   - Doctor notification when patient books
//   - Patient confirmation when doctor approves
//   - Patient rejection when doctor rejects
// ============================================================

require('dotenv').config();
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const DOCTOR_PHONE = process.env.DOCTOR_PHONE_NUMBER;

// ─────────────────────────────────────────────
// Send SMS notification to doctor when a new
// appointment is booked by a patient
// ─────────────────────────────────────────────
async function sendDoctorNotification(appointment) {
  const { id, patient_name, patient_phone, appointment_date, appointment_time, problem } = appointment;

  const approveUrl = `${process.env.BACKEND_URL}/api/approve/${id}`;
  const rejectUrl = `${process.env.BACKEND_URL}/api/reject/${id}`;

  // Format date for readability
  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });

  const message = `🦷 NEW APPOINTMENT REQUEST

Patient: ${patient_name}
Phone: ${patient_phone || 'Not provided'}
Date: ${formattedDate}
Time: ${appointment_time}
Problem: ${problem || 'Not specified'}

✅ Approve: ${approveUrl}
❌ Reject: ${rejectUrl}`;

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${FROM_NUMBER}`,
      to: `whatsapp:${DOCTOR_PHONE}`
    });
    console.log(`📱 Doctor WhatsApp notification sent for appointment #${id}`);
  } catch (error) {
    console.error('❌ Failed to send doctor WhatsApp:', error.message);
  }
}

// ─────────────────────────────────────────────
// Send confirmation SMS to patient when
// doctor approves the appointment
// ─────────────────────────────────────────────
async function sendPatientConfirmation(appointment) {
  const { patient_name, patient_phone, appointment_date, appointment_time } = appointment;

  if (!patient_phone) {
    console.warn('⚠️  No phone number — cannot send patient confirmation SMS');
    return;
  }

  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const message = `✅ APPOINTMENT CONFIRMED!

Hi ${patient_name}, your dental appointment is confirmed.

📅 Date: ${formattedDate}
🕐 Time: ${appointment_time}
📍 Location: DentalCare Pro Clinic

⏰ Please arrive 10 minutes early.
Bring a valid ID and insurance card if applicable.

— DentalCare Pro`;

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${FROM_NUMBER}`,
      to: `whatsapp:${patient_phone}`
    });
    console.log(`📱 Confirmation WhatsApp sent to ${patient_phone}`);
  } catch (error) {
    console.error('❌ Failed to send confirmation WhatsApp:', error.message);
  }
}

// ─────────────────────────────────────────────
// Send rejection SMS to patient when
// doctor rejects the appointment
// ─────────────────────────────────────────────
async function sendPatientRejection(appointment) {
  const { patient_name, patient_phone } = appointment;

  if (!patient_phone) {
    console.warn('⚠️  No phone number — cannot send patient rejection SMS');
    return;
  }

  const rebookUrl = `${process.env.FRONTEND_URL}/booking.html`;

  const message = `Hi ${patient_name}, we're sorry but we couldn't accommodate your requested appointment time.

Please rebook at a different time:
📅 ${rebookUrl}

We'd love to see you!
— DentalCare Pro`;

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${FROM_NUMBER}`,
      to: `whatsapp:${patient_phone}`
    });
    console.log(`📱 Rejection WhatsApp sent to ${patient_phone}`);
  } catch (error) {
    console.error('❌ Failed to send rejection WhatsApp:', error.message);
  }
}

module.exports = {
  sendDoctorNotification,
  sendPatientConfirmation,
  sendPatientRejection
};
