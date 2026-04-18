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
// DASHBOARD — Login & Appointment Management
// ============================================================
(function initDashboard() {
  const loginPage = document.getElementById('loginPage');
  const dashboardPage = document.getElementById('dashboardPage');
  const loginForm = document.getElementById('loginForm');

  if (!loginPage || !dashboardPage) return;

  // Check if already logged in
  const token = localStorage.getItem('dental_token');
  const doctorData = localStorage.getItem('dental_doctor');

  if (token && doctorData) {
    showDashboard(JSON.parse(doctorData));
  }

  // ─────── Login Form Submit ───────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        showToast('Please enter both email and password', 'error');
        return;
      }

      const loginBtn = document.getElementById('loginBtn');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      showSpinner();

      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('dental_token', data.token);
          localStorage.setItem('dental_doctor', JSON.stringify(data.doctor));
          showToast('Login successful!', 'success');
          showDashboard(data.doctor);
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showToast('Unable to connect to server', 'error');
      } finally {
        hideSpinner();
        loginBtn.disabled = false;
        loginBtn.textContent = '🔐 Sign In';
      }
    });
  }

  // ─────── Show Dashboard ───────
  function showDashboard(doctor) {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'block';

    const doctorName = document.getElementById('doctorName');
    if (doctorName) doctorName.textContent = doctor.name || 'Doctor';

    loadAppointments();
    initFilterTabs();
    initLogout();
  }

  // ─────── Load Appointments ───────
  let allAppointments = [];
  let currentFilter = 'all';

  async function loadAppointments() {
    const token = localStorage.getItem('dental_token');
    showSpinner();

    try {
      const response = await fetch(`${API_BASE}/appointments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        allAppointments = data.appointments;
        updateStats();
        renderAppointments();
      } else {
        if (response.status === 401) {
          showToast('Session expired. Please login again.', 'error');
          logout();
        } else {
          showToast('Failed to load appointments', 'error');
        }
      }
    } catch (error) {
      console.error('Load appointments error:', error);
      showToast('Unable to connect to server', 'error');
    } finally {
      hideSpinner();
    }
  }

  // ─────── Update Stats ───────
  function updateStats() {
    const total = allAppointments.length;
    const pending = allAppointments.filter(a => a.status === 'pending').length;
    const confirmed = allAppointments.filter(a => a.status === 'confirmed').length;
    const rejected = allAppointments.filter(a => a.status === 'rejected').length;

    animateNumber('totalCount', total);
    animateNumber('pendingCount', pending);
    animateNumber('confirmedCount', confirmed);
    animateNumber('rejectedCount', rejected);
  }

  // Smooth number animation
  function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 500;
    const steps = 20;
    const increment = (target - current) / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      el.textContent = Math.round(current + increment * step);
      if (step >= steps) {
        el.textContent = target;
        clearInterval(interval);
      }
    }, duration / steps);
  }

  // ─────── Render Appointments Table ───────
  function renderAppointments() {
    const tbody = document.getElementById('appointmentsTable');
    const emptyState = document.getElementById('emptyState');
    if (!tbody) return;

    // Filter appointments
    let filtered = allAppointments;
    if (currentFilter !== 'all') {
      filtered = allAppointments.filter(a => a.status === currentFilter);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map((apt, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(apt.patient_name)}</strong></td>
        <td>${escapeHtml(apt.patient_email)}</td>
        <td>${formatDate(apt.appointment_date)}</td>
        <td>${formatTime(apt.appointment_time)}</td>
        <td>${escapeHtml(apt.problem || '—')}</td>
        <td>
          <span class="status-badge ${apt.status}">
            ${apt.status === 'pending' ? '⏳' : apt.status === 'confirmed' ? '✅' : '❌'} 
            ${apt.status}
          </span>
        </td>
        <td>
          ${apt.status === 'pending' ? `
            <div class="action-btns">
              <button class="btn btn-success btn-sm" onclick="handleApprove(${apt.id})">Approve</button>
              <button class="btn btn-danger btn-sm" onclick="handleReject(${apt.id})">Reject</button>
            </div>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  }

  // HTML escaping to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─────── Filter Tabs ───────
  function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderAppointments();
      });
    });
  }

  // ─────── Approve/Reject Actions ───────
  window.handleApprove = async function(id) {
    if (!confirm('Approve this appointment?')) return;

    showSpinner();
    try {
      const response = await fetch(`${API_BASE}/approve/${id}`);
      showToast('Appointment approved! Opening WhatsApp...', 'success');
      
      // Auto-open WhatsApp chat with patient
      const apt = allAppointments.find(a => a.id === id);
      if (apt && apt.patient_phone) {
        let phone = apt.patient_phone.replace(/\D/g, ''); // strip non-digits
        if (phone.length === 10) phone = '91' + phone; // prepend India country code if length is 10
        else if (phone.startsWith('0')) phone = '91' + phone.substring(1);

        const dateObj = new Date(apt.appointment_date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
        
        const message = `✅ *APPOINTMENT CONFIRMED!*\n\nHi ${apt.patient_name}, your dental appointment is confirmed.\n\n📅 *Date:* ${formattedDate}\n🕐 *Time:* ${formatTime(apt.appointment_time)}\n📍 *Location:* DentalCare Pro Clinic\n\n⏰ Please arrive 10 minutes early.`;
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      await loadAppointments();
    } catch (error) {
      console.error('Approve error:', error);
      showToast('Failed to approve appointment', 'error');
    } finally {
      hideSpinner();
    }
  };

  window.handleReject = async function(id) {
    if (!confirm('Reject this appointment?')) return;

    showSpinner();
    try {
      const response = await fetch(`${API_BASE}/reject/${id}`);
      showToast('Appointment rejected. Opening WhatsApp...', 'info');
      
      const apt = allAppointments.find(a => a.id === id);
      if (apt && apt.patient_phone) {
        let phone = apt.patient_phone.replace(/\D/g, '');
        if (phone.length === 10) phone = '91' + phone;
        else if (phone.startsWith('0')) phone = '91' + phone.substring(1);

        const rebookUrl = window.location.origin + '/booking.html';
        const message = `❌ *APPOINTMENT UPDATE*\n\nHi ${apt.patient_name}, we're sorry but we couldn't accommodate your requested appointment time.\n\nPlease rebook at a different time:\n📅 ${rebookUrl}\n\nWe'd love to see you!\n— DentalCare Pro`;
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }

      await loadAppointments();
    } catch (error) {
      console.error('Reject error:', error);
      showToast('Failed to reject appointment', 'error');
    } finally {
      hideSpinner();
    }
  };

  // ─────── Logout ───────
  function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  }

  function logout() {
    localStorage.removeItem('dental_token');
    localStorage.removeItem('dental_doctor');
    loginPage.style.display = '';
    dashboardPage.style.display = 'none';
    showToast('Logged out successfully', 'info');
  }
})();
