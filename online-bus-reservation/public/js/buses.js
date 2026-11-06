/**
 * HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM
 * buses.js - Dynamic Bus Listing & Search powered EXCLUSIVELY by MySQL database
 * Database: online_bus_reservation | Table: buses
 */

// Active state for buses loaded from MySQL
let dbBuses = [];

document.addEventListener('DOMContentLoaded', () => {
  initSearchParams();
  loadBusesFromDatabase();
  setupSearchForm();
  setupFilterControls();
});

/* ==========================================================================
   1. PARSE URL QUERY PARAMETERS
   ========================================================================== */
function initSearchParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source') || urlParams.get('from') || '';
  const destination = urlParams.get('destination') || urlParams.get('to') || '';
  const date = urlParams.get('date') || getDefaultJourneyDate();

  const routeDisplay = document.getElementById('stripRouteDisplay');
  const dateDisplay = document.getElementById('stripDateDisplay');
  const modifyFrom = document.getElementById('modifyFrom');
  const modifyTo = document.getElementById('modifyTo');
  const modifyDate = document.getElementById('modifyDate');

  if (routeDisplay) {
    if (source && destination) {
      routeDisplay.innerHTML = `${capitalize(source)} <i class="fa-solid fa-arrow-right-long"></i> ${capitalize(destination)}`;
    } else {
      routeDisplay.innerHTML = `All Scheduled Fleet Routes`;
    }
  }

  if (dateDisplay) {
    dateDisplay.innerHTML = `<i class="fa-regular fa-calendar-check"></i> ${date}`;
  }

  if (modifyFrom) modifyFrom.value = source;
  if (modifyTo) modifyTo.value = destination;
  if (modifyDate) modifyDate.value = date;
}

function getDefaultJourneyDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ==========================================================================
   2. FETCH ACTUAL BUSES FROM MYSQL BACKEND API
   ========================================================================== */
async function loadBusesFromDatabase() {
  const container = document.getElementById('busListingContainer');
  const countBadge = document.getElementById('resultCountBadge');

  if (container) {
    container.innerHTML = `
      <div style="background:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; padding:3rem; text-align:center;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:var(--secondary); margin-bottom:1rem;"></i>
        <h4 style="color:var(--primary); font-size:1.15rem;">Loading Live Buses from Database...</h4>
        <p style="color:var(--text-muted); font-size:0.85rem;">Connecting to MySQL database 'online_bus_reservation'</p>
      </div>
    `;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source') || urlParams.get('from');
  const destination = urlParams.get('destination') || urlParams.get('to');

  let endpoint = '/buses';
  if (source && destination) {
    endpoint = `/search-buses?source=${encodeURIComponent(source.trim())}&destination=${encodeURIComponent(destination.trim())}`;
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: Failed to fetch buses`);
    }

    const data = await response.json();
    dbBuses = Array.isArray(data) ? data : [];

    // If a search query yielded 0 results, offer loading all buses
    if (dbBuses.length === 0 && endpoint.startsWith('/search-buses')) {
      renderNoBusesFound(source, destination, true);
      if (countBadge) countBadge.textContent = '0 Buses Found';
      return;
    }

    renderBuses(dbBuses);
  } catch (err) {
    console.error('Error fetching buses from MySQL:', err);
    if (container) {
      container.innerHTML = `
        <div style="background:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; padding:3rem 2rem; text-align:center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; color:var(--danger); margin-bottom:1rem;"></i>
          <h3 style="color:var(--primary); font-size:1.35rem; margin-bottom:0.5rem;">Database Connection Offline</h3>
          <p style="color:var(--text-muted); margin-bottom:1.5rem;">Could not connect to MySQL server. Please verify that Node.js server (App.js) is running on port 3000.</p>
          <button class="btn btn-primary" onclick="loadBusesFromDatabase()">
            <i class="fa-solid fa-rotate-right"></i> Retry Connection
          </button>
        </div>
      `;
    }
    if (countBadge) countBadge.textContent = 'Connection Error';
  }
}

/* ==========================================================================
   3. RENDER BUS CARDS (FROM ACTUAL MYSQL DATA)
   ========================================================================== */
function renderBuses(buses) {
  const container = document.getElementById('busListingContainer');
  const countBadge = document.getElementById('resultCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${buses.length} Bus${buses.length === 1 ? '' : 'es'} in Database`;
  }

  if (buses.length === 0) {
    renderNoBusesFound();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const journeyDate = urlParams.get('date') || getDefaultJourneyDate();

  container.innerHTML = buses.map(bus => {
    const available = bus.available_seats !== undefined ? bus.available_seats : (bus.avaliable_seats !== undefined ? bus.avaliable_seats : 0);
    const busTime = bus.departure_time || bus.depature_time || 'Scheduled';
    const isLowSeats = available <= 5;
    const isSoldOut = available <= 0;

    return `
      <div class="bus-card" id="bus-card-${bus.bus_id}">
        <div class="bus-card-main">
          <!-- Col 1: Bus Details -->
          <div class="bus-info-col">
            <span class="bus-type-badge">
              <i class="fa-solid fa-bus"></i> ID #${bus.bus_id}
            </span>
            <h3>${bus.bus_number}</h3>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.4rem;">
              <strong>Total Seats:</strong> ${bus.total_seats}
            </div>
            <div class="bus-rating">
              <span class="rating-badge"><i class="fa-solid fa-shield-halved"></i> Verified</span>
              <span style="color:var(--text-muted); font-size:0.8rem;">Database Record</span>
            </div>
          </div>

          <!-- Col 2: Route & Departure Timeline -->
          <div class="bus-timeline-col">
            <div class="time-point">
              <span class="time">${busTime}</span>
              <span class="location">${capitalize(bus.source)}</span>
            </div>
            <div class="duration-line">
              <span class="duration-tag">Scheduled</span>
              <div class="timeline-bar">
                <i class="fa-solid fa-arrow-right timeline-icon"></i>
              </div>
            </div>
            <div class="time-point">
              <span class="time"><i class="fa-solid fa-location-dot" style="font-size:1.1rem; color:var(--secondary);"></i></span>
              <span class="location">${capitalize(bus.destination)}</span>
            </div>
          </div>

          <!-- Col 3: Seat Availability & Action -->
          <div class="bus-pricing-col">
            <div class="seats-status ${isLowSeats ? 'low' : ''}" style="font-size:1rem; margin-bottom:0.5rem;">
              <i class="fa-solid ${isSoldOut ? 'fa-ban' : isLowSeats ? 'fa-fire' : 'fa-circle-check'}"></i> 
              ${isSoldOut ? 'Sold Out' : `${available} Seats Available`}
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;">
              Out of ${bus.total_seats} total seats
            </div>
            <div class="bus-card-actions">
              ${isSoldOut ? `
                <button class="btn btn-sm" style="background:#E2E8F0; color:#94A3B8; cursor:not-allowed;" disabled>
                  Sold Out
                </button>
              ` : `
                <a href="booking.html?bus_id=${bus.bus_id}&date=${encodeURIComponent(journeyDate)}" class="btn btn-accent btn-sm">
                  Book Seat <i class="fa-solid fa-arrow-right"></i>
                </a>
              `}
            </div>
          </div>
        </div>

        <!-- Bus Card Footer -->
        <div class="bus-card-footer">
          <div style="font-size:0.82rem; color:var(--text-dark);">
            <strong style="color:var(--secondary);">Route:</strong> ${capitalize(bus.source)} to ${capitalize(bus.destination)}
          </div>
          <div style="font-weight:600; color:var(--secondary); font-size:0.82rem;">
            <i class="fa-solid fa-database"></i> Live MySQL Record
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderNoBusesFound(source = '', destination = '', offerAll = false) {
  const container = document.getElementById('busListingContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="background:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; padding:4rem 2rem; text-align:center;">
      <img src="images/empty-bookings.svg" alt="No buses found" style="max-width:160px; margin:0 auto 1.5rem auto;">
      <h3 style="font-size:1.4rem; margin-bottom:0.5rem; color:var(--primary);">
        ${source && destination ? `No Buses Found for ${capitalize(source)} → ${capitalize(destination)}` : 'No Buses Available in Database'}
      </h3>
      <p style="color:var(--text-muted); margin-bottom:1.5rem;">
        There are currently no active buses in the MySQL 'buses' table matching this query.
      </p>
      ${offerAll ? `
        <a href="buses.html" class="btn btn-secondary">
          <i class="fa-solid fa-list"></i> View All Scheduled Buses
        </a>
      ` : `
        <button class="btn btn-outline" onclick="loadBusesFromDatabase()">
          <i class="fa-solid fa-rotate-right"></i> Refresh from MySQL
        </button>
      `}
    </div>
  `;
}

/* ==========================================================================
   4. SEARCH FORM SUBMISSION
   ========================================================================== */
function setupSearchForm() {
  const modifyForm = document.getElementById('modifySearchForm');
  if (modifyForm) {
    modifyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const from = document.getElementById('modifyFrom').value.trim();
      const to = document.getElementById('modifyTo').value.trim();
      const date = document.getElementById('modifyDate').value;

      if (!from || !to) {
        window.showToast('Please specify both source and destination.', 'warning');
        return;
      }

      window.location.href = `buses.html?source=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;
    });
  }
}

/* ==========================================================================
   5. FILTER & SORTING OF LIVE MYSQL RESULTS
   ========================================================================== */
function setupFilterControls() {
  // Sort Dropdown
  const sortSelect = document.getElementById('busSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      let sorted = [...dbBuses];

      if (mode === 'earliest') {
        sorted.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
      } else if (mode === 'fastest' || mode === 'seats') {
        sorted.sort((a, b) => b.available_seats - a.available_seats);
      } else {
        sorted.sort((a, b) => a.bus_id - b.bus_id);
      }
      renderBuses(sorted);
    });
  }

  // Seat Availability Checkbox
  const minSeatsCb = document.getElementById('filterMinSeats');
  if (minSeatsCb) {
    minSeatsCb.addEventListener('change', (e) => {
      if (e.target.checked) {
        const filtered = dbBuses.filter(b => b.available_seats >= 5);
        renderBuses(filtered);
      } else {
        renderBuses(dbBuses);
      }
    });
  }

  // Reset Filters Button
  const resetBtn = document.getElementById('resetFiltersBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (minSeatsCb) minSeatsCb.checked = false;
      if (sortSelect) sortSelect.value = 'cheapest';
      renderBuses(dbBuses);
      window.showToast('Filters reset to default database view.', 'info');
    });
  }
}
