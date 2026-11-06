/**
 * HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM
 * main.js - Core shared interactions & UI components
 * Completely Database-Driven: No fake users, no fake seed data.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initActiveNavLink();
  initBackToTop();
  initStatsCounter();
  initScrollReveal();
  initUserSession();
  initSwapButtons();
  initNewsletter();
});

/* ==========================================================================
   1. NAVBAR & STICKY SCROLL
   ========================================================================== */
function initNavbar() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   2. MOBILE NAV DRAWER
   ========================================================================== */
function initMobileDrawer() {
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.mobile-nav-drawer');

  if (!hamburger || !drawer) return;

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      hamburger.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      drawer.classList.add('open');
      hamburger.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });

  const drawerLinks = drawer.querySelectorAll('.mobile-nav-link');
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      hamburger.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

/* ==========================================================================
   3. ACTIVE NAVIGATION LINK
   ========================================================================== */
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    if (href === currentPath || (currentPath === '' && href === 'index.html') || (currentPath === '/' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* ==========================================================================
   4. BACK TO TOP BUTTON
   ========================================================================== */
function initBackToTop() {
  let btn = document.querySelector('.back-to-top');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(btn);
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ==========================================================================
   5. REAL STATS COUNTER FROM DATABASE
   ========================================================================== */
async function initStatsCounter() {
  const counters = document.querySelectorAll('.stat-number');
  if (!counters.length) return;

  // Fetch real counts from MySQL backend if available
  try {
    const [busesRes, bookingsRes, passengersRes] = await Promise.all([
      fetch('/buses').catch(() => null),
      fetch('/bookings').catch(() => null),
      fetch('/passengers').catch(() => null)
    ]);

    if (busesRes && busesRes.ok) {
      const buses = await busesRes.json();
      const busCounter = document.getElementById('statTotalBusesCounter');
      if (busCounter) busCounter.setAttribute('data-target', buses.length);
    }

    if (bookingsRes && bookingsRes.ok) {
      const bookings = await bookingsRes.json();
      const bookingCounter = document.getElementById('statTotalBookingsCounter');
      if (bookingCounter) bookingCounter.setAttribute('data-target', bookings.length);
    }
  } catch (err) {
    console.warn('Backend stats sync skipped:', err.message);
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const targetValue = parseFloat(target.getAttribute('data-target') || '0');
        const prefix = target.getAttribute('data-prefix') || '';
        const suffix = target.getAttribute('data-suffix') || '';
        const isDecimal = targetValue % 1 !== 0;

        let current = 0;
        const duration = 1500;
        const stepTime = 25;
        const totalSteps = duration / stepTime;
        const increment = targetValue / totalSteps;

        const timer = setInterval(() => {
          current += increment;
          if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
          }
          target.textContent = `${prefix}${isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString()}${suffix}`;
        }, stepTime);

        obs.unobserve(target);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => observer.observe(counter));
}

/* ==========================================================================
   6. SCROLL REVEAL ANIMATIONS
   ========================================================================== */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   7. USER SESSION & AUTH STATE (ONLY REAL LOGGED-IN USERS)
   ========================================================================== */
function initUserSession() {
  // Only use authenticated user from MySQL login
  const storedUser = JSON.parse(localStorage.getItem('harthikraj_user') || 'null');
  const authNavContainer = document.getElementById('navAuthContainer');
  const mobileNavActions = document.getElementById('mobileNavActions');

  if (storedUser && storedUser.passenger_id) {
    const initials = storedUser.name ? storedUser.name.substring(0, 2).toUpperCase() : 'U';
    
    if (authNavContainer) {
      authNavContainer.innerHTML = `
        <div class="user-account-nav" id="userMenuDropdown" title="Logged in as ${storedUser.name} (ID: ${storedUser.passenger_id})">
          <div class="user-account-avatar">${initials}</div>
          <span class="user-account-name">${storedUser.name}</span>
          <i class="fa-solid fa-chevron-down" style="font-size:0.75rem; color:var(--text-muted)"></i>
        </div>
      `;

      const userMenu = document.getElementById('userMenuDropdown');
      userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = 'my-bookings.html';
      });
    }

    if (mobileNavActions) {
      mobileNavActions.innerHTML = `
        <a href="my-bookings.html" class="btn btn-secondary">
          <i class="fa-solid fa-user-circle"></i> ${storedUser.name} (ID: ${storedUser.passenger_id})
        </a>
        <button class="btn btn-outline" id="mobileLogoutBtn">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      `;

      const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', () => {
          logoutUser();
        });
      }
    }
  } else {
    // If not logged in, display standard Login / Register button
    if (authNavContainer) {
      authNavContainer.innerHTML = `
        <a href="login.html" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-user-circle"></i> Login / Register
        </a>
      `;
    }
    if (mobileNavActions) {
      mobileNavActions.innerHTML = `
        <a href="login.html" class="btn btn-primary">
          <i class="fa-solid fa-user-circle"></i> Login / Register
        </a>
      `;
    }
  }
}

function logoutUser() {
  localStorage.removeItem('harthikraj_user');
  showToast('Logged out successfully.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 800);
}

/* ==========================================================================
   8. SWAP BUTTON (FROM / TO LOCATIONS)
   ========================================================================== */
function initSwapButtons() {
  const swapBtn = document.getElementById('swapLocationsBtn');
  const fromInput = document.getElementById('fromCity');
  const toInput = document.getElementById('toCity');

  if (!swapBtn || !fromInput || !toInput) return;

  swapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const temp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = temp;

    swapBtn.style.transform = 'rotate(180deg) scale(1.1)';
    setTimeout(() => {
      swapBtn.style.transform = '';
    }, 300);

    showToast(`Locations swapped: ${fromInput.value} ⇄ ${toInput.value}`, 'info', 1500);
  });
}

/* ==========================================================================
   9. GLOBAL TOAST NOTIFICATION UTILITY
   ========================================================================== */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    warning: 'fa-solid fa-triangle-exclamation',
    info: 'fa-solid fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} toast-icon"></i>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const removeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  };

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', removeToast);

  setTimeout(removeToast, duration);
}

/* ==========================================================================
   10. COPY COUPON CODE FUNCTIONALITY
   ========================================================================== */
function copyCoupon(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Coupon code <strong>${code}</strong> copied to clipboard!`, 'success');
  }).catch(() => {
    showToast(`Use coupon code: ${code}`, 'info');
  });
}

/* ==========================================================================
   11. FOOTER NEWSLETTER
   ========================================================================== */
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput && emailInput.value) {
      showToast('Thank you for subscribing! You will receive travel updates.', 'success');
      emailInput.value = '';
    }
  });
}

window.showToast = showToast;
window.copyCoupon = copyCoupon;
window.logoutUser = logoutUser;
