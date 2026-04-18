// ============================================================
// DentalCare Pro — Frontend Application Logic
// Handles: Navigation, Booking Form, Dashboard, Toasts
// ============================================================

// ─────── Configuration ───────
const API_BASE = '/api';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// ─────── Toast Notification System ───────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ─────── Spinner Control ───────
function showSpinner() {
  const overlay = document.getElementById('spinnerOverlay');
  if (overlay) overlay.classList.add('visible');
}

function hideSpinner() {
  const overlay = document.getElementById('spinnerOverlay');
  if (overlay) overlay.classList.remove('visible');
}

// ─────── Format Date for Display ───────
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ─────── Format Time for Display ───────
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// ============================================================
// NAVBAR — Scroll Effect & Mobile Menu
// ============================================================
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  // Navbar scroll effect
  if (navbar && !navbar.classList.contains('scrolled')) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // Mobile menu toggle
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = navLinks.style.display === 'flex';
      navLinks.style.display = isOpen ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = '#fff';
      navLinks.style.padding = isOpen ? '0' : '20px';
      navLinks.style.boxShadow = isOpen ? 'none' : '0 8px 24px rgba(0,0,0,0.1)';
      navLinks.style.borderRadius = '0 0 12px 12px';
    });
  }
})();

// ============================================================
// SCROLL REVEAL ANIMATION
// ============================================================
(function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach((el) => observer.observe(el));
})();

// ============================================================
// BOOKING FORM
// ============================================================
(function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  // Set minimum date to today
  const dateInput = document.getElementById('appointmentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Gather form values
    const name = document.getElementById('patientName').value.trim();
    const email = document.getElementById('patientEmail').value.trim();
    const phone = document.getElementById('patientPhone').value.trim();
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const problemType = document.getElementById('problemType').value;
    const problemDetails = document.getElementById('problemDetails').value.trim();

    // Validate
    let isValid = true;

    // Name validation
    if (!name) {
      document.getElementById('patientName').classList.add('error');
      document.getElementById('nameError').classList.add('visible');
      isValid = false;
    } else {
      document.getElementById('patientName').classList.remove('error');
      document.getElementById('nameError').classList.remove('visible');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      document.getElementById('patientEmail').classList.add('error');
      document.getElementById('emailError').classList.add('visible');
      isValid = false;
    } else {
      document.getElementById('patientEmail').classList.remove('error');
      document.getElementById('emailError').classList.remove('visible');
    }

    // Phone validation (required for SMS notifications)
    if (!phone || phone.length < 10) {
      document.getElementById('patientPhone').classList.add('error');
      document.getElementById('phoneError').classList.add('visible');
      isValid = false;
    } else {
      document.getElementById('patientPhone').classList.remove('error');
      document.getElementById('phoneError').classList.remove('visible');
    }

    // Date validation
    if (!date) {
      document.getElementById('appointmentDate').classList.add('error');
      document.getElementById('dateError').classList.add('visible');
      isValid = false;
    } else {
      document.getElementById('appointmentDate').classList.remove('error');
      document.getElementById('dateError').classList.remove('visible');
    }

    // Time validation
    if (!time) {
      document.getElementById('appointmentTime').classList.add('error');
      document.getElementById('timeError').classList.add('visible');
      isValid = false;
    } else {
      document.getElementById('appointmentTime').classList.remove('error');
      document.getElementById('timeError').classList.remove('visible');
    }

    if (!isValid) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Build problem string
    const problem = [problemType, problemDetails].filter(Boolean).join(' — ');

    // Submit
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    showSpinner();

    try {
      const response = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: name,
          patient_email: email,
          patient_phone: phone,
          appointment_date: date,
          appointment_time: time,
          problem: problem
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Your appointment request has been received! We\'ll send you a WhatsApp message once it\'s confirmed.', 'success');
        form.reset();
      } else {
        showToast(data.message || 'Something went wrong', 'error');
      }
    } catch (error) {
      console.error('Booking error:', error);
      showToast('Unable to connect to server. Please try again later.', 'error');
    } finally {
      hideSpinner();
      submitBtn.disabled = false;
      submitBtn.textContent = '📩 Submit Appointment Request';
    }
  });

  // Clear error styling on input
  const inputs = form.querySelectorAll('.form-control');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorEl = input.parentElement.querySelector('.form-error');
      if (errorEl) errorEl.classList.remove('visible');
    });
  });
})();

// Dashboard logic moved to separate admin-frontend

