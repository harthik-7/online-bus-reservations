/**
 * HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM
 * booking.js - Interactive Seat Selection & Booking powered EXCLUSIVELY by MySQL
 * Database: online_bus_reservation | Tables: buses, passengers, bookings
 */

let currentBus = null;
let selectedSeats = [];
let bookedSeatsFromDb = [];
let journeyDate = getDefaultJourneyDate();
let farePerSeat = 500.00; // Standard fare per seat for booking table

document.addEventListener('DOMContentLoaded', () => {
  loadSelectedBusDetails();
  setupBookingForm();
});

function getDefaultJourneyDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/* ==========================================================================
   1. RETRIEVE REAL BUS DETAILS FROM MYSQL (GET /buses/:bus_id)
   ========================================================================== */
async function loadSelectedBusDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const bus_id = urlParams.get('bus_id') || urlParams.get('busId') || '1';
  journeyDate = urlParams.get('date') || getDefaultJourneyDate();

  const bannerContainer = document.getElementById('selectedBusBanner');
  if (bannerContainer) {
    bannerContainer.innerHTML = `
      <div style="padding:1.5rem; text-align:center; color:#FFFFFF; width:100%;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:1.8rem; margin-bottom:0.75rem;"></i>
        <div>Fetching bus details from MySQL database...</div>
      </div>
    `;
  }

  try {
    // 1. Fetch bus from MySQL
    const busRes = await fetch(`/buses/${bus_id}`);
    if (!busRes.ok) {
      throw new Error(`Bus ID ${bus_id} not found in MySQL database.`);
    }
    currentBus = await busRes.json();

    // Determine fare (if bus has fare column or default standard route fare)
    farePerSeat = currentBus.fare ? parseFloat(currentBus.fare) : (currentBus.bus_id === 2 ? 650.00 : currentBus.bus_id === 3 ? 450.00 : 500.00);

    // 2. Fetch existing bookings for this bus to identify already booked seats
    await loadBookedSeats(currentBus.bus_id, journeyDate);

    // 3. Render Bus Details Banner
    renderBusBanner(currentBus);

    // Populate Boarding / Dropping points using real DB source and destination
    const boardingSelect = document.getElementById('boardingPointSelect');
    const droppingSelect = document.getElementById('droppingPointSelect');
    if (boardingSelect) {
      boardingSelect.innerHTML = `<option value="${currentBus.source}">${capitalize(currentBus.source)} Bus Station</option>`;
    }
    if (droppingSelect) {
      droppingSelect.innerHTML = `<option value="${currentBus.destination}">${capitalize(currentBus.destination)} Bus Station</option>`;
    }

    // 4. Render Dynamic Seat Layout based on total_seats & existing bookings
    renderDynamicSeatLayout(currentBus.total_seats || 40);

    // 5. Populate Passenger Identification
    await initPassengerIdentity();

    // 6. Update Fare Summary
    updateBookingSummary();

  } catch (err) {
    console.error('Error loading bus details:', err);
    if (bannerContainer) {
      bannerContainer.innerHTML = `
        <div style="padding:1.5rem; text-align:center; color:#FFFFFF; width:100%;">
          <i class="fa-solid fa-circle-exclamation" style="font-size:2rem; color:var(--accent); margin-bottom:0.5rem;"></i>
          <h3 style="color:#FFFFFF;">${err.message}</h3>
          <p style="color:#CBD5E1; font-size:0.85rem; margin-bottom:1rem;">Please select an active bus from the Available Buses page.</p>
          <a href="buses.html" class="btn btn-outline-white btn-sm">
            <i class="fa-solid fa-arrow-left"></i> Back to Available Buses
          </a>
        </div>
      `;
    }
  }
}

/* ==========================================================================
   2. FETCH BOOKED SEATS FOR THIS BUS FROM MYSQL (GET /bookings)
   ========================================================================== */
async function loadBookedSeats(bus_id, date) {
  try {
    const res = await fetch('/bookings');
    if (res.ok) {
      const allBookings = await res.json();
      bookedSeatsFromDb = allBookings
        .filter(b => String(b.bus_id) === String(bus_id))
        .map(b => b.seat_no ? b.seat_no.trim().toUpperCase() : '');
    }
  } catch (e) {
    console.warn('Could not fetch existing booked seats:', e.message);
    bookedSeatsFromDb = [];
  }
}

/* ==========================================================================
   3. RENDER BUS DETAILS HEADER BANNER
   ========================================================================== */
function renderBusBanner(bus) {
  const bannerContainer = document.getElementById('selectedBusBanner');
  if (!bannerContainer) return;

  const available = bus.available_seats !== undefined ? bus.available_seats : (bus.avaliable_seats !== undefined ? bus.avaliable_seats : 0);
  const busTime = bus.departure_time || bus.depature_time || 'Scheduled';
  const isLow = available <= 5;

  bannerContainer.innerHTML = `
    <div class="bus-banner-info">
      <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem;">
        <span class="badge badge-accent">Bus ID #${bus.bus_id}</span>
        <span style="font-size:0.85rem; color:#CBD5E1; font-family:monospace; font-weight:700;">
          Registration: ${bus.bus_number}
        </span>
      </div>
      <h2>${capitalize(bus.source)} to ${capitalize(bus.destination)}</h2>
      <div class="bus-banner-meta">
        <span><i class="fa-regular fa-calendar-check"></i> Date: ${journeyDate}</span>
        <span><i class="fa-solid fa-clock"></i> Departure: ${busTime}</span>
        <span><i class="fa-solid fa-chair"></i> Total: ${bus.total_seats} Seats</span>
        <span style="color:${isLow ? '#FF8A00' : '#4ADE80'}; font-weight:700;">
          <i class="fa-solid fa-circle-check"></i> ${available} Available
        </span>
      </div>
    </div>
    <div>
      <a href="buses.html" class="btn btn-outline-white btn-sm">
        <i class="fa-solid fa-arrow-left"></i> Change Bus
      </a>
    </div>
  `;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ==========================================================================
   4. RENDER DYNAMIC BUS SEATS MATCHING MYSQL TOTAL_SEATS
   ========================================================================== */
function renderDynamicSeatLayout(totalSeats) {
  const gridContainer = document.getElementById('seatsLayoutGrid');
  if (!gridContainer) return;

  // Generate 2x2 rows with aisle (A1, A2 | A3, A4; B1, B2 | B3, B4...)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const rowsCount = Math.ceil(totalSeats / 4);

  let html = '';
  let seatCounter = 0;

  for (let r = 0; r < rowsCount && seatCounter < totalSeats; r++) {
    const rowLetter = letters[r] || `R${r + 1}`;
    html += `<div class="seat-row">`;

    // Left 2 seats
    for (let c = 1; c <= 2 && seatCounter < totalSeats; c++) {
      seatCounter++;
      const seatCode = `${rowLetter}${c}`;
      html += createSeatHtml(seatCode);
    }

    // Aisle
    html += `<div class="aisle-gap"></div>`;

    // Right 2 seats
    for (let c = 3; c <= 4 && seatCounter < totalSeats; c++) {
      seatCounter++;
      const seatCode = `${rowLetter}${c}`;
      html += createSeatHtml(seatCode);
    }

    html += `</div>`;
  }

  gridContainer.innerHTML = html;

  // Attach click listeners to available seats
  const availableElements = gridContainer.querySelectorAll('.seat:not(.booked)');
  availableElements.forEach(el => {
    el.addEventListener('click', () => {
      const seatCode = el.getAttribute('data-seat-id');
      handleSeatClick(seatCode, el);
    });
  });

  // Friendly alert on already booked seats
  const bookedElements = gridContainer.querySelectorAll('.seat.booked');
  bookedElements.forEach(el => {
    el.addEventListener('click', () => {
      window.showToast(`Seat ${el.getAttribute('data-seat-id')} is already booked in MySQL for this bus.`, 'warning', 2500);
    });
  });
}

function createSeatHtml(seatCode) {
  const isBooked = bookedSeatsFromDb.includes(seatCode.toUpperCase());
  const isSelected = selectedSeats.includes(seatCode);

  let classes = 'seat';
  if (isBooked) {
    classes += ' booked';
  } else if (isSelected) {
    classes += ' selected';
  }

  return `
    <div class="${classes}" data-seat-id="${seatCode}" title="${isBooked ? `Seat ${seatCode} (Already Booked)` : `Seat ${seatCode} (Available)`}">
      <span>${seatCode}</span>
    </div>
  `;
}

function handleSeatClick(seatCode, element) {
  const index = selectedSeats.indexOf(seatCode);

  if (index > -1) {
    selectedSeats.splice(index, 1);
    element.classList.remove('selected');
    window.showToast(`Seat ${seatCode} deselected.`, 'info', 1200);
  } else {
    // Only 1 seat per transaction for direct single-seat booking table constraint
    if (selectedSeats.length >= 1) {
      // Clear previous seat selection to select new one
      const prev = selectedSeats[0];
      const prevEl = document.querySelector(`[data-seat-id="${prev}"]`);
      if (prevEl) prevEl.classList.remove('selected');
      selectedSeats = [];
    }
    selectedSeats.push(seatCode);
    element.classList.add('selected');
    window.showToast(`Seat ${seatCode} selected.`, 'success', 1500);
  }

  updateBookingSummary();
}

/* ==========================================================================
   5. PASSENGER IDENTITY SETUP FROM MYSQL
   ========================================================================== */
async function initPassengerIdentity() {
  const dynamicContainer = document.getElementById('dynamicPassengerFields');
  if (!dynamicContainer) return;

  const storedUser = JSON.parse(localStorage.getItem('harthikraj_user') || 'null');

  if (storedUser && storedUser.passenger_id) {
    // Passenger is logged in
    dynamicContainer.innerHTML = `
      <div style="background:var(--secondary-lighter); border:1px solid rgba(23,105,170,0.25); border-radius:10px; padding:1.25rem;">
        <div style="font-weight:700; color:var(--primary); font-size:1rem; margin-bottom:0.25rem;">
          <i class="fa-solid fa-id-card" style="color:var(--secondary);"></i> Passenger: ${storedUser.name}
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted);">
          <strong>Passenger ID:</strong> <span style="font-family:monospace; color:var(--secondary); font-weight:700;">${storedUser.passenger_id}</span> | 
          <strong>Email:</strong> ${storedUser.email} | 
          <strong>Phone:</strong> ${storedUser.phone_no || 'N/A'}
        </div>
        <input type="hidden" id="confirmedPassengerId" value="${storedUser.passenger_id}">
      </div>
    `;

    const emailInput = document.getElementById('contactEmail');
    const phoneInput = document.getElementById('contactPhone');
    if (emailInput) emailInput.value = storedUser.email || '';
    if (phoneInput) phoneInput.value = storedUser.phone_no || '';

  } else {
    // Not logged in: Fetch real passengers from MySQL database so user can select their account
    try {
      const res = await fetch('/passengers');
      const passengers = await res.json();

      let optionsHtml = '';
      if (Array.isArray(passengers) && passengers.length > 0) {
        optionsHtml = passengers.map(p => `
          <option value="${p.passenger_id}">${p.name} (ID: ${p.passenger_id} | Email: ${p.email})</option>
        `).join('');
      }

      dynamicContainer.innerHTML = `
        <div style="margin-bottom:1rem;">
          <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:0.4rem; color:var(--primary);">
            <i class="fa-solid fa-users"></i> Select Registered Passenger from Database *
          </label>
          <select id="confirmedPassengerId" class="form-control" style="font-weight:600;" required>
            ${optionsHtml}
          </select>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.35rem;">
            Or <a href="login.html" style="color:var(--secondary); font-weight:700; text-decoration:underline;">Sign In</a> / <a href="login.html?tab=register" style="color:var(--secondary); font-weight:700; text-decoration:underline;">Register a new passenger</a>.
          </div>
        </div>
      `;

      // Update email and phone automatically when passenger selection changes
      const pSelect = document.getElementById('confirmedPassengerId');
      if (pSelect && passengers.length > 0) {
        const updateContactFields = () => {
          const selectedPid = pSelect.value;
          const found = passengers.find(p => String(p.passenger_id) === String(selectedPid));
          if (found) {
            const emailInput = document.getElementById('contactEmail');
            const phoneInput = document.getElementById('contactPhone');
            if (emailInput) emailInput.value = found.email;
            if (phoneInput) phoneInput.value = found.phone_no;
          }
        };
        pSelect.addEventListener('change', updateContactFields);
        updateContactFields();
      }

    } catch (e) {
      dynamicContainer.innerHTML = `
        <div class="form-group">
          <label>Passenger ID *</label>
          <input type="number" id="confirmedPassengerId" class="form-control" placeholder="e.g. 101" required value="101">
        </div>
      `;
    }
  }
}

/* ==========================================================================
   6. FARE SUMMARY CALCULATION
   ========================================================================== */
function updateBookingSummary() {
  const countEl = document.getElementById('selectedSeatsCount');
  const badgeList = document.getElementById('selectedSeatsBadgeList');
  const baseFareEl = document.getElementById('summaryBaseFare');
  const gstEl = document.getElementById('summaryGst');
  const totalPayableEl = document.getElementById('summaryTotalPayable');
  const confirmBtn = document.getElementById('confirmBookingBtn');

  const count = selectedSeats.length;

  if (countEl) countEl.textContent = `${count} Seat`;

  if (badgeList) {
    if (count === 0) {
      badgeList.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">No seat selected. Click an available seat on the coach map.</span>`;
    } else {
      badgeList.innerHTML = selectedSeats.map(s => `
        <span class="selected-seat-chip">
          <i class="fa-solid fa-chair"></i> Seat ${s}
        </span>
      `).join('');
    }
  }

  const baseFare = count * farePerSeat;
  const gst = 0; // Transparent exact fare directly matching DB records
  const total = baseFare;

  if (baseFareEl) baseFareEl.textContent = `₹${baseFare.toFixed(2)}`;
  if (gstEl) gstEl.textContent = `₹0.00`;
  if (totalPayableEl) totalPayableEl.textContent = `₹${total.toFixed(2)}`;

  if (confirmBtn) {
    if (count > 0 && currentBus && currentBus.available_seats > 0) {
      confirmBtn.removeAttribute('disabled');
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    } else {
      confirmBtn.setAttribute('disabled', 'true');
      confirmBtn.style.opacity = '0.6';
      confirmBtn.style.cursor = 'not-allowed';
    }
  }
}

/* ==========================================================================
   7. SUBMIT BOOKING DIRECTLY TO MYSQL (POST /bookings)
   ========================================================================== */
function setupBookingForm() {
  const bookingForm = document.getElementById('bookingCheckoutForm');
  if (!bookingForm) return;

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (selectedSeats.length === 0) {
      window.showToast('Please select an available seat first.', 'warning');
      return;
    }

    if (!currentBus) {
      window.showToast('No bus selected.', 'error');
      return;
    }

    const passengerIdEl = document.getElementById('confirmedPassengerId');
    const passenger_id = passengerIdEl ? parseInt(passengerIdEl.value) : null;

    if (!passenger_id) {
      window.showToast('Please select or specify a valid passenger ID.', 'warning');
      return;
    }

    const seat_no = selectedSeats[0];
    const fare = farePerSeat;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    const originalBtnHtml = confirmBtn.innerHTML;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Executing MySQL Transaction...`;
    confirmBtn.disabled = true;

    try {
      const response = await fetch('/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_id,
          bus_id: currentBus.bus_id,
          booking_date: journeyDate,
          seat_no,
          fare
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete booking');
      }

      // Show Confirmation Modal with the real MySQL booking ID
      showBookingSuccessModal(data);

      // Decrement available seats locally
      currentBus.available_seats -= 1;
      bookedSeatsFromDb.push(seat_no);
      selectedSeats = [];
      renderBusBanner(currentBus);
      renderDynamicSeatLayout(currentBus.total_seats);
      updateBookingSummary();

    } catch (err) {
      window.showToast(err.message, 'error', 4500);
    } finally {
      confirmBtn.innerHTML = originalBtnHtml;
      confirmBtn.disabled = false;
    }
  });
}

/* ==========================================================================
   8. REAL BOOKING SUCCESS MODAL WITH MYSQL RECORD
   ========================================================================== */
function showBookingSuccessModal(booking) {
  let modal = document.getElementById('bookingSuccessModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bookingSuccessModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="ticket-modal-card" style="max-width:550px; text-align:center;">
      <div style="background:var(--success); color:#FFFFFF; padding:2rem 1.5rem;">
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; margin:0 auto 1rem auto; font-size:2rem;">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h2 style="color:#FFFFFF; font-size:1.6rem; margin-bottom:0.25rem;">Booking Confirmed in MySQL!</h2>
        <p style="color:#E3FCEF; font-size:0.95rem;">Database record inserted into 'bookings' table.</p>
      </div>

      <div style="padding:2rem;">
        <div style="background:var(--bg-light); border:1px solid var(--border-color); border-radius:12px; padding:1.25rem; margin-bottom:1.5rem; text-align:left;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">DATABASE BOOKING ID:</span>
            <span style="font-family:monospace; font-weight:800; color:var(--secondary); font-size:1.1rem;">#${booking.booking_id}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">PASSENGER ID:</span>
            <span style="font-weight:700; color:var(--primary);">${booking.passenger_id}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">BUS NUMBER:</span>
            <span style="font-weight:700; color:var(--primary);">${booking.bus_number} (Bus #${booking.bus_id})</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">BOOKING DATE:</span>
            <span style="font-weight:700; color:var(--primary);">${booking.booking_date}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.6rem;">
            <span style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">CONFIRMED SEAT:</span>
            <span style="font-weight:800; color:var(--accent); font-size:1.1rem;">${booking.seat_no}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:0.6rem; margin-top:0.6rem;">
            <span style="font-size:0.9rem; font-weight:800; color:var(--primary);">FARE:</span>
            <span style="font-size:1.15rem; font-weight:900; color:var(--success);">₹${booking.fare.toFixed(2)}</span>
          </div>
        </div>

        <div style="display:flex; gap:0.75rem; justify-content:center;">
          <a href="my-bookings.html" class="btn btn-primary" style="flex:1;">
            <i class="fa-solid fa-ticket"></i> View in My Bookings
          </a>
          <a href="buses.html" class="btn btn-outline" style="flex:1;">
            <i class="fa-solid fa-bus"></i> Book Another Bus
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}
