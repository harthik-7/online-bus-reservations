/**
 * HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM
 * auth.js - Authentication & Registration connected DIRECTLY to MySQL backend
 * Database: online_bus_reservation | Table: passengers
 */

document.addEventListener('DOMContentLoaded', () => {
  setupAuthTabs();
  setupPasswordToggles();
  setupPasswordStrengthMeter();
  setupLoginForm();
  setupRegisterForm();
});

/* ==========================================================================
   1. TAB SWITCHING (LOGIN / REGISTER)
   ========================================================================== */
function setupAuthTabs() {
  const tabBtns = document.querySelectorAll('.auth-tab-btn');
  const forms = document.querySelectorAll('.auth-form');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetForm = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));

      btn.classList.add('active');
      const activeForm = document.getElementById(targetForm);
      if (activeForm) activeForm.classList.add('active');
    });
  });

  // Check URL query param e.g. login.html?tab=register
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'register') {
    const regTabBtn = document.querySelector('[data-tab="registerForm"]');
    if (regTabBtn) regTabBtn.click();
  }
}

/* ==========================================================================
   2. PASSWORD VISIBILITY TOGGLES
   ========================================================================== */
function setupPasswordToggles() {
  const toggleBtns = document.querySelectorAll('.toggle-password');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetInputId = btn.getAttribute('data-target');
      const input = document.getElementById(targetInputId);
      if (!input) return;

      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');

      const icon = btn.querySelector('i');
      if (icon) {
        if (isPassword) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        } else {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  });
}

/* ==========================================================================
   3. PASSWORD STRENGTH METER & CONFIRM MATCH
   ========================================================================== */
function setupPasswordStrengthMeter() {
  const regPassword = document.getElementById('regPassword');
  const strengthBar = document.getElementById('strengthIndicator');
  const confirmPassword = document.getElementById('regConfirmPassword');
  const matchIndicator = document.getElementById('passwordMatchIndicator');

  if (regPassword && strengthBar) {
    regPassword.addEventListener('input', () => {
      const val = regPassword.value;
      strengthBar.className = 'strength-indicator';

      if (val.length === 0) {
        strengthBar.style.width = '0%';
      } else if (val.length < 4) {
        strengthBar.classList.add('weak');
      } else if (val.length >= 6 && /[A-Z]/.test(val) && /[0-9]/.test(val)) {
        strengthBar.classList.add('strong');
      } else {
        strengthBar.classList.add('medium');
      }
    });
  }

  if (confirmPassword && matchIndicator) {
    const checkMatch = () => {
      if (!confirmPassword.value) {
        matchIndicator.textContent = '';
        return;
      }
      if (confirmPassword.value === regPassword.value) {
        matchIndicator.innerHTML = '<span style="color:var(--success); font-size:0.75rem;"><i class="fa-solid fa-check"></i> Passwords match</span>';
      } else {
        matchIndicator.innerHTML = '<span style="color:var(--danger); font-size:0.75rem;"><i class="fa-solid fa-xmark"></i> Passwords do not match</span>';
      }
    };

    confirmPassword.addEventListener('input', checkMatch);
    if (regPassword) regPassword.addEventListener('input', checkMatch);
  }
}

/* ==========================================================================
   4. REAL MYSQL LOGIN (POST /login)
   ========================================================================== */
function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
      window.showToast('Please enter both email and password.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking MySQL Database...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication Failed');
      }

      // Store authenticated passenger profile in localStorage (No passwords stored)
      localStorage.setItem('harthikraj_user', JSON.stringify(data.passenger));
      window.showToast(`Login successful! Welcome, ${data.passenger.name}.`, 'success');

      setTimeout(() => {
        window.location.href = 'my-bookings.html';
      }, 700);

    } catch (err) {
      window.showToast(err.message, 'error', 4000);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

/* ==========================================================================
   5. REAL MYSQL REGISTRATION (POST /passengers)
   ========================================================================== */
function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone_no = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('regConfirmPassword').value.trim();
    const terms = document.getElementById('regTerms');

    if (!name || !email || !phone_no || !password) {
      window.showToast('Please fill in all required registration fields.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      window.showToast('Passwords do not match.', 'error');
      return;
    }

    if (terms && !terms.checked) {
      window.showToast('Please accept the Terms of Service to continue.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to MySQL Database...';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone_no, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration Failed');
      }

      window.showToast(`Registration Successful! Passenger ID: ${data.passenger_id}. Please Sign In.`, 'success', 4000);

      // Auto-switch to login tab and prefill email
      const loginTabBtn = document.querySelector('[data-tab="loginForm"]');
      if (loginTabBtn) loginTabBtn.click();

      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) loginEmailInput.value = email;

      form.reset();
    } catch (err) {
      window.showToast(err.message, 'error', 4500);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}
