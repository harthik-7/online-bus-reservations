/**
 * HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM
 * my-bookings.js - Passenger Dashboard & Booking Management powered EXCLUSIVELY by MySQL
 * Database: online_bus_reservation | Tables: bookings, passengers, buses
 */

let allDatabaseBookings = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderUserProfile();
  loadBookingsFromDatabase();
  setupFilterTabs();
  setupDashboardSidebar();
});

/* ==========================================================================
   1. RENDER LOGGED-IN PASSENGER PROFILE
   ========================================================================== */
function renderUserProfile() {
  const storedUser = JSON.parse(localStorage.getItem('harthikraj_user') || 'null');

  const profileName = document.getElementById('dashProfileName');
  const profileEmail = document.getElementById('dashProfileEmail');
  const profileAvatar = document.getElementById('dashProfileAvatar');
  const profileTier = document.getElementById('dashProfileTier');

  if (storedUser && storedUser.passenger_id) {
    const initials = storedUser.name ? storedUser.name.substring(0, 2).toUpperCase() : 'U';
    if (profileName) profileName.textContent = storedUser.name;
    if (profileEmail) profileEmail.textContent = `${storedUser.email} (ID: ${storedUser.passenger_id})`;
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileTier) profileTier.innerHTML = `<i class="fa-solid fa-circle-check"></i> Registered Passenger #${storedUser.passenger_id}`;
  } else {
    if (profileName) profileName.textContent = 'All Database Bookings';
    if (profileEmail) profileEmail.textContent = 'Sign in to view personal trips';
    if (profileAvatar) profileAvatar.textContent = 'DB';
    if (profileTier) profileTier.innerHTML = `<a href="login.html" style="color:#B45309; font-weight:700;"><i class="fa-solid fa-right-to-bracket"></i> Sign In to Account</a>`;
  }
}

/* ==========================================================================
   2. RETRIEVE ACTUAL BOOKINGS FROM MYSQL (GET /bookings)
   ========================================================================== */
async function loadBookingsFromDatabase() {
  const container = document.getElementById('bookingsTableBody');
  if (container) {
    container.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem; color:var(--secondary); margin-bottom:0.75rem;"></i>
          <div>Querying MySQL 'bookings' table with SQL JOIN...</div>
        </td>
      </tr>
    `;
  }

  try {
    const response = await fetch('/bookings');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: Failed to fetch bookings`);
    }

    const data = await response.json();
    allDatabaseBookings = Array.isArray(data) ? data : [];

    renderDashboardStats(allDatabaseBookings);
    renderBookingsTable();

  } catch (err) {
    console.error('Error fetching bookings from MySQL:', err);
    if (container) {
      container.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:3rem; color:var(--danger);">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:0.5rem;"></i>
            <h4>Unable to Connect to MySQL Database</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">Ensure your Node.js backend (App.js) is running on http://localhost:3000.</p>
          </td>
        </tr>
      `;
    }
  }
}

/* ==========================================================================
   3. UPDATE DASHBOARD KPI STATS FROM MYSQL DATA
   ========================================================================== */
function renderDashboardStats(bookings) {
  const total = bookings.length;
  
  // Calculate upcoming based on booking_date >= today
  const todayStr = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.booking_date >= todayStr).length;
  const completed = bookings.filter(b => b.booking_date < todayStr).length;

  const totalEl = document.getElementById('statTotalBookings');
  const upcomingEl = document.getElementById('statUpcoming');
  const completedEl = document.getElementById('statCompleted');
  const cancelledEl = document.getElementById('statCancelled');

  if (totalEl) totalEl.textContent = total;
  if (upcomingEl) upcomingEl.textContent = upcoming;
  if (completedEl) completedEl.textContent = completed;
  if (cancelledEl) cancelledEl.textContent = 0;
}

/* ==========================================================================
   4. RENDER ACTUAL BOOKINGS TABLE
   ========================================================================== */
function renderBookingsTable() {
  const container = document.getElementById('bookingsTableBody');
  if (!container) return;

  const storedUser = JSON.parse(localStorage.getItem('harthikraj_user') || 'null');
  let displayedBookings = allDatabaseBookings;

  // If filter is specific
  const todayStr = new Date().toISOString().split('T')[0];
  if (currentFilter === 'upcoming') {
    displayedBookings = allDatabaseBookings.filter(b => b.booking_date >= todayStr);
  } else if (currentFilter === 'completed') {
    displayedBookings = allDatabaseBookings.filter(b => b.booking_date < todayStr);
  } else if (currentFilter === 'cancelled') {
    displayedBookings = [];
  }

  // Filter for logged-in user if available and checkbox allows
  const userOnlyCb = document.getElementById('filterUserOnly');
  if (storedUser && storedUser.passenger_id && userOnlyCb && userOnlyCb.checked) {
    displayedBookings = displayedBookings.filter(b => String(b.passenger_id) === String(storedUser.passenger_id));
  }

  if (displayedBookings.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3.5rem 1rem;">
          <img src="images/empty-bookings.svg" alt="No bookings" style="max-width:140px; margin:0 auto 1rem auto;">
          <h4 style="color:var(--primary); font-size:1.15rem; margin-bottom:0.35rem;">No Bookings Found in MySQL</h4>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1.25rem;">
            ${currentFilter !== 'all' ? `No ${currentFilter} records found in database.` : 'The MySQL bookings table currently has no records for this view.'}
          </p>
          <a href="buses.html" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-magnifying-glass"></i> Search & Book Buses
          </a>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = displayedBookings.map(b => {
    const isUpcoming = b.booking_date >= todayStr;
    const statusText = isUpcoming ? 'Confirmed' : 'Completed';
    const badgeClass = isUpcoming ? 'badge-success' : 'badge-primary';

    return `
      <tr>
        <td>
          <span class="ticket-id" style="font-size:0.95rem; font-weight:800;">#${b.booking_id}</span>
          <div style="font-size:0.75rem; color:var(--text-muted);">PID: ${b.passenger_id}</div>
        </td>
        <td>
          <div style="font-weight:700; color:var(--primary);">${b.bus_number}</div>
          <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">Bus ID #${b.bus_id}</span>
        </td>
        <td>
          <div style="font-weight:700;">${capitalize(b.source)} → ${capitalize(b.destination)}</div>
          <span style="font-size:0.78rem; color:var(--text-muted);">${b.passenger_name} (${b.passenger_email})</span>
        </td>
        <td>
          <div style="font-weight:700;">${b.booking_date}</div>
          <span style="font-size:0.78rem; color:var(--secondary); font-weight:600;">${b.departure_time || b.depature_time || ''}</span>
        </td>
        <td>
          <span class="badge badge-accent" style="font-size:0.85rem; padding:0.3rem 0.65rem;">
            Seat ${b.seat_no}
          </span>
        </td>
        <td>
          <div style="font-weight:800; color:var(--primary);">₹${parseFloat(b.fare).toFixed(2)}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${statusText}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-primary btn-sm" onclick="viewTicketModal('${b.booking_id}')" title="View Boarding Pass">
              <i class="fa-solid fa-ticket"></i> Ticket
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:var(--danger);" onclick="cancelBookingInDatabase('${b.booking_id}', '${b.seat_no}', '${b.bus_number}')" title="Cancel Booking in MySQL">
              <i class="fa-solid fa-ban"></i> Cancel
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ==========================================================================
   5. FILTER TABS
   ========================================================================== */
function setupFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      renderBookingsTable();
    });
  });
}

/* ==========================================================================
   6. CANCEL BOOKING IN MYSQL (DELETE /bookings/:booking_id)
   ========================================================================== */
async function cancelBookingInDatabase(bookingId, seatNo, busNumber) {
  const confirmed = confirm(`Are you sure you want to cancel Booking #${bookingId} (Seat: ${seatNo}) for Bus ${busNumber}?\n\nThis will delete the record from MySQL 'bookings' table and automatically increment available seats by 1.`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/bookings/${bookingId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel booking');
    }

    window.showToast(`Booking #${bookingId} Cancelled Successfully! Seat ${data.released_seat} returned to database inventory.`, 'success', 4000);

    // Refresh actual bookings from MySQL
    await loadBookingsFromDatabase();

  } catch (err) {
    window.showToast(err.message, 'error', 4500);
  }
}

/* ==========================================================================
   7. VIEW DIGITAL BOARDING PASS MODAL (ACTUAL MYSQL DATA)
   ========================================================================== */
function viewTicketModal(bookingId) {
  const booking = allDatabaseBookings.find(b => String(b.booking_id) === String(bookingId));
  if (!booking) return;

  let modal = document.getElementById('ticketModalOverlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ticketModalOverlay';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="ticket-modal-card">
      <div class="ticket-header">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <img src="images/logo-white.svg" alt="HARTHIKRAJ" style="height:36px;">
        </div>
        <button class="ticket-close-btn" onclick="closeTicketModal()" aria-label="Close ticket">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="boarding-pass">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
          <div>
            <span class="badge badge-accent" style="margin-bottom:0.4rem;">OFFICIAL DIGITAL BOARDING PASS</span>
            <h2 style="font-size:1.4rem; color:var(--primary); margin:0;">Bus ${booking.bus_number}</h2>
            <div style="font-size:0.85rem; color:var(--text-muted); font-family:monospace;">
              Bus ID: #${booking.bus_id} | Passenger ID: #${booking.passenger_id}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">MYSQL BOOKING ID:</div>
            <div style="font-family:monospace; font-size:1.35rem; font-weight:900; color:var(--secondary);">#${booking.booking_id}</div>
          </div>
        </div>

        <div class="ticket-perforation">
          <div class="perforation-line"></div>
        </div>

        <div class="ticket-route-grid">
          <div class="ticket-route-node">
            <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">ORIGIN</span>
            <h3>${capitalize(booking.source)}</h3>
          </div>
          <div style="color:var(--accent); font-size:1.8rem; padding:0 1rem;">
            <i class="fa-solid fa-bus"></i>
          </div>
          <div class="ticket-route-node">
            <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">DESTINATION</span>
            <h3>${capitalize(booking.destination)}</h3>
          </div>
        </div>

        <div class="ticket-meta-grid">
          <div class="ticket-meta-cell">
            <label>JOURNEY DATE</label>
            <span>${booking.booking_date}</span>
          </div>
          <div class="ticket-meta-cell">
            <label>DEPARTURE TIME</label>
            <span>${booking.departure_time || 'Scheduled'}</span>
          </div>
          <div class="ticket-meta-cell">
            <label>CONFIRMED SEAT</label>
            <span style="color:var(--accent); font-size:1.2rem;">${booking.seat_no}</span>
          </div>
          <div class="ticket-meta-cell">
            <label>PASSENGER NAME</label>
            <span>${booking.passenger_name}</span>
          </div>
          <div class="ticket-meta-cell">
            <label>PASSENGER EMAIL</label>
            <span>${booking.passenger_email}</span>
          </div>
          <div class="ticket-meta-cell">
            <label>TOTAL FARE PAID</label>
            <span style="color:var(--success);">₹${parseFloat(booking.fare).toFixed(2)}</span>
          </div>
        </div>

        <div class="ticket-perforation">
          <div class="perforation-line"></div>
        </div>

        <div class="ticket-footer-grid">
          <div style="display:flex; align-items:center; gap:1rem;">
            <img src="images/ticket-qr.svg" alt="Ticket QR Code" class="ticket-qr-box">
            <div style="font-size:0.75rem; color:var(--text-muted); max-width:200px;">
              Scan at boarding counter for biometric passenger verification.
            </div>
          </div>
          <div class="ticket-barcode-box">
            <div class="barcode-strip"></div>
            <div style="font-family:monospace; font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">*BK-${booking.booking_id}-P${booking.passenger_id}*</div>
          </div>
        </div>

        <div style="display:flex; gap:1rem; justify-content:center; margin-top:2rem;">
          <button class="btn btn-secondary" onclick="window.print()">
            <i class="fa-solid fa-print"></i> Print Boarding Pass
          </button>
          <button class="btn btn-outline" onclick="closeTicketModal()">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeTicketModal() {
  const modal = document.getElementById('ticketModalOverlay');
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   8. SIDEBAR LOGOUT
   ========================================================================== */
function setupDashboardSidebar() {
  const logoutBtn = document.getElementById('dashLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.logoutUser();
    });
  }
}

window.viewTicketModal = viewTicketModal;
window.closeTicketModal = closeTicketModal;
window.cancelBookingInDatabase = cancelBookingInDatabase;
