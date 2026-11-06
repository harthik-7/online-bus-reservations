// =============================================================================
// HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM - BACKEND SERVER
// File: App.js
// Tech Stack: Node.js, Express.js, MySQL (mysql2), bcryptjs
// Database: online_bus_reservation
// =============================================================================

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// =============================================================================
// 1. DATABASE CONNECTION & COLUMN DETECTOR
// =============================================================================
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "harthik123",
    database: "online_bus_reservation"
});

// Dynamic column mapping for compatibility with user's MySQL schema:
// Accommodates both standard and typographical variants ('depature_time' vs 'departure_time', 'avaliable_seats' vs 'available_seats')
let busTimeCol = "depature_time";
let busAvailCol = "avaliable_seats";

function detectBusColumns(callback) {
    db.query("SHOW COLUMNS FROM buses", (err, cols) => {
        if (!err && Array.isArray(cols)) {
            const colNames = cols.map(c => c.Field);
            if (colNames.includes("departure_time")) {
                busTimeCol = "departure_time";
            } else if (colNames.includes("depature_time")) {
                busTimeCol = "depature_time";
            }

            if (colNames.includes("available_seats")) {
                busAvailCol = "available_seats";
            } else if (colNames.includes("avaliable_seats")) {
                busAvailCol = "avaliable_seats";
            }

            console.log(`📋 Schema detected: Time='${busTimeCol}', AvailableSeats='${busAvailCol}'`);
        } else if (err) {
            console.warn("⚠️ Column detection warning:", err.message);
        }
        if (callback) callback();
    });
}

db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Failed:", err.message);
        console.log("👉 Please make sure MySQL service is running and database 'online_bus_reservation' exists.");
        return;
    }
    console.log("✅ Connected to MySQL Database 'online_bus_reservation' Successfully");
    detectBusColumns();
});

// =============================================================================
// 2. PASSENGER OPERATIONS
// Database Table: passengers
// Columns: passenger_id (PK), name, email, phone_no, password
// =============================================================================

// 2.1 GET ALL PASSENGERS (Passwords excluded for security)
app.get("/passengers", (req, res) => {
    const sql = "SELECT passenger_id, name, email, phone_no FROM passengers ORDER BY passenger_id ASC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching passengers:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 2.2 GET SINGLE PASSENGER BY ID
app.get("/passengers/:passenger_id", (req, res) => {
    const { passenger_id } = req.params;
    const sql = "SELECT passenger_id, name, email, phone_no FROM passengers WHERE passenger_id = ?";

    db.query(sql, [passenger_id], (err, results) => {
        if (err) {
            console.error("Error fetching passenger:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Passenger Not Found" });
        }
        res.json(results[0]);
    });
});

// 2.3 POST / REGISTER A NEW PASSENGER
// Validates details, checks duplicate email, hashes password with bcrypt
app.post("/passengers", async (req, res) => {
    const { name, email, phone_no, phone, password } = req.body;
    const contactPhone = phone_no || phone;

    if (!name || !email || !contactPhone || !password) {
        return res.status(400).json({ error: "All fields (name, email, phone_no, password) are required" });
    }

    try {
        const checkEmailSql = "SELECT passenger_id FROM passengers WHERE email = ?";
        db.query(checkEmailSql, [email], async (err, existing) => {
            if (err) {
                console.error("Error checking email duplicate:", err.message);
                return res.status(500).json({ error: err.message });
            }

            if (existing.length > 0) {
                return res.status(409).json({ error: "Email already registered. Please use another email." });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const insertSql = `
                INSERT INTO passengers (name, email, phone_no, password)
                VALUES (?, ?, ?, ?)
            `;

            db.query(insertSql, [name, email, contactPhone, hashedPassword], (err, result) => {
                if (err) {
                    console.error("Error inserting passenger:", err.message);
                    return res.status(500).json({ error: err.message });
                }

                res.status(201).json({
                    message: "Passenger Registered Successfully",
                    passenger_id: result.insertId
                });
            });
        });
    } catch (err) {
        console.error("Registration Exception:", err.message);
        res.status(500).json({ error: "Registration Failed: " + err.message });
    }
});

// 2.4 POST PASSENGER LOGIN
// Supports existing plain-text database records AND bcrypt-hashed passwords safely
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const sql = "SELECT passenger_id, name, email, phone_no, password FROM passengers WHERE email = ?";

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error("Login DB Error:", err.message);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = results[0];
        let isMatch = false;

        // Try bcrypt compare first
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            isMatch = false;
        }

        // Safe fallback check for existing plain-text records in user's DB (e.g. '1234', '6789', '7410')
        if (!isMatch && String(user.password) === String(password)) {
            isMatch = true;
        }

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Return user profile WITHOUT password
        res.json({
            message: "Login Successful",
            passenger: {
                passenger_id: user.passenger_id,
                name: user.name,
                email: user.email,
                phone_no: user.phone_no
            }
        });
    });
});

// =============================================================================
// 3. BUS OPERATIONS
// Database Table: buses
// Columns: bus_id (PK), bus_number, source, destination, [departure_time/depature_time], total_seats, [available_seats/avaliable_seats]
// =============================================================================

// 3.1 GET ALL BUSES
app.get("/buses", (req, res) => {
    const sql = `
        SELECT 
            bus_id, 
            bus_number, 
            source, 
            destination, 
            ${busTimeCol} AS departure_time, 
            ${busTimeCol} AS depature_time,
            total_seats, 
            ${busAvailCol} AS available_seats,
            ${busAvailCol} AS avaliable_seats 
        FROM buses 
        ORDER BY bus_id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching buses:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 3.2 GET SINGLE BUS USING bus_id
app.get("/buses/:bus_id", (req, res) => {
    const { bus_id } = req.params;
    const sql = `
        SELECT 
            bus_id, 
            bus_number, 
            source, 
            destination, 
            ${busTimeCol} AS departure_time, 
            ${busTimeCol} AS depature_time,
            total_seats, 
            ${busAvailCol} AS available_seats,
            ${busAvailCol} AS avaliable_seats 
        FROM buses 
        WHERE bus_id = ?
    `;

    db.query(sql, [bus_id], (err, results) => {
        if (err) {
            console.error("Error fetching bus:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Bus Not Found" });
        }
        res.json(results[0]);
    });
});

// 3.3 SEARCH BUSES USING source AND destination
app.get("/search-buses", (req, res) => {
    const { source, destination } = req.query;

    if (!source || !destination) {
        return res.status(400).json({ error: "Both 'source' and 'destination' query parameters are required" });
    }

    const sql = `
        SELECT 
            bus_id, 
            bus_number, 
            source, 
            destination, 
            ${busTimeCol} AS departure_time, 
            ${busTimeCol} AS depature_time,
            total_seats, 
            ${busAvailCol} AS available_seats,
            ${busAvailCol} AS avaliable_seats 
        FROM buses
        WHERE LOWER(TRIM(source)) = LOWER(TRIM(?)) AND LOWER(TRIM(destination)) = LOWER(TRIM(?))
        AND ${busAvailCol} > 0
        ORDER BY ${busTimeCol} ASC
    `;

    db.query(sql, [source.trim(), destination.trim()], (err, results) => {
        if (err) {
            console.error("Error searching buses:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 3.4 POST / ADD A NEW BUS
app.post("/buses", (req, res) => {
    const {
        bus_number,
        bus_no,
        source,
        destination,
        departure_time,
        depature_time,
        total_seats,
        available_seats,
        avaliable_seats
    } = req.body;

    const busNumber = bus_number || bus_no;
    const timeVal = departure_time || depature_time;
    const availVal = available_seats != null ? available_seats : (avaliable_seats != null ? avaliable_seats : total_seats);

    if (!busNumber || !source || !destination || !timeVal || total_seats == null) {
        return res.status(400).json({ error: "Required fields: bus_number, source, destination, departure_time, total_seats" });
    }

    const sql = `
        INSERT INTO buses (bus_number, source, destination, ${busTimeCol}, total_seats, ${busAvailCol})
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [busNumber, source, destination, timeVal, total_seats, availVal],
        (err, result) => {
            if (err) {
                console.error("Error adding bus:", err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
                message: "Bus Added Successfully",
                bus_id: result.insertId
            });
        }
    );
});

// 3.5 PUT / UPDATE EXISTING BUS DETAILS
app.put("/buses/:bus_id", (req, res) => {
    const { bus_id } = req.params;
    const {
        bus_number,
        bus_no,
        source,
        destination,
        departure_time,
        depature_time,
        total_seats,
        available_seats,
        avaliable_seats
    } = req.body;

    const busNumber = bus_number || bus_no;
    const timeVal = departure_time || depature_time;
    const availVal = available_seats != null ? available_seats : (avaliable_seats != null ? avaliable_seats : total_seats);

    if (!busNumber || !source || !destination || !timeVal || total_seats == null || availVal == null) {
        return res.status(400).json({ error: "All bus details are required" });
    }

    const sql = `
        UPDATE buses SET
            bus_number = ?,
            source = ?,
            destination = ?,
            ${busTimeCol} = ?,
            total_seats = ?,
            ${busAvailCol} = ?
        WHERE bus_id = ?
    `;

    db.query(
        sql,
        [busNumber, source, destination, timeVal, total_seats, availVal, bus_id],
        (err, result) => {
            if (err) {
                console.error("Error updating bus:", err.message);
                return res.status(500).json({ error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Bus Not Found" });
            }
            res.json({ message: "Bus Updated Successfully", bus_id: parseInt(bus_id) });
        }
    );
});

// 3.6 DELETE A BUS USING bus_id
app.delete("/buses/:bus_id", (req, res) => {
    const { bus_id } = req.params;

    const sql = "DELETE FROM buses WHERE bus_id = ?";

    db.query(sql, [bus_id], (err, result) => {
        if (err) {
            console.error("Error deleting bus:", err.message);
            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.status(409).json({ error: "Cannot delete bus with existing passenger bookings. Cancel bookings first." });
            }
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Bus Not Found" });
        }
        res.json({ message: "Bus Deleted Successfully", bus_id: parseInt(bus_id) });
    });
});

// =============================================================================
// 4. BOOKING OPERATIONS
// Database Table: bookings
// Columns: booking_id (PK), passenger_id (FK), bus_id (FK), booking_date, seat_no, fare
// Transactional Operations: Decrease/Increase available seats, prevent duplicate seats
// =============================================================================

// 4.1 GET ALL BOOKINGS WITH SQL JOIN (Supports ?passenger_id= and ?bus_id= filters)
app.get("/bookings", (req, res) => {
    const { passenger_id, bus_id } = req.query;

    let sql = `
        SELECT
            bk.booking_id,
            bk.passenger_id,
            p.name AS passenger_name,
            p.email AS passenger_email,
            p.phone_no AS passenger_phone,
            bk.bus_id,
            b.bus_number,
            b.source,
            b.destination,
            b.${busTimeCol} AS departure_time,
            b.${busTimeCol} AS depature_time,
            DATE_FORMAT(bk.booking_date, '%Y-%m-%d') AS booking_date,
            bk.seat_no,
            bk.fare
        FROM bookings bk
        JOIN passengers p ON bk.passenger_id = p.passenger_id
        JOIN buses b ON bk.bus_id = b.bus_id
    `;

    const conditions = [];
    const params = [];

    if (passenger_id) {
        conditions.push("bk.passenger_id = ?");
        params.push(passenger_id);
    }
    if (bus_id) {
        conditions.push("bk.bus_id = ?");
        params.push(bus_id);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY bk.booking_id ASC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching bookings:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 4.2 GET SINGLE BOOKING BY ID WITH JOIN
app.get("/bookings/:booking_id", (req, res) => {
    const { booking_id } = req.params;

    const sql = `
        SELECT
            bk.booking_id,
            bk.passenger_id,
            p.name AS passenger_name,
            p.email AS passenger_email,
            p.phone_no AS passenger_phone,
            bk.bus_id,
            b.bus_number,
            b.source,
            b.destination,
            b.${busTimeCol} AS departure_time,
            b.${busTimeCol} AS depature_time,
            DATE_FORMAT(bk.booking_date, '%Y-%m-%d') AS booking_date,
            bk.seat_no,
            bk.fare
        FROM bookings bk
        JOIN passengers p ON bk.passenger_id = p.passenger_id
        JOIN buses b ON bk.bus_id = b.bus_id
        WHERE bk.booking_id = ?
    `;

    db.query(sql, [booking_id], (err, results) => {
        if (err) {
            console.error("Error fetching booking:", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Booking Not Found" });
        }
        res.json(results[0]);
    });
});

// 4.3 POST / CREATE A NEW BOOKING (MySQL Transaction)
app.post("/bookings", (req, res) => {
    const {
        passenger_id,
        bus_id,
        booking_date,
        seat_no,
        fare
    } = req.body;

    if (!passenger_id || !bus_id || !booking_date || !seat_no || fare == null) {
        return res.status(400).json({ error: "All booking details (passenger_id, bus_id, booking_date, seat_no, fare) are required" });
    }

    // Begin Database Transaction
    db.beginTransaction((err) => {
        if (err) {
            console.error("Transaction Start Error:", err.message);
            return res.status(500).json({ error: "Failed to initiate booking transaction" });
        }

        // STEP 1: Validate passenger exists
        const checkPassengerSql = "SELECT passenger_id, name FROM passengers WHERE passenger_id = ?";
        db.query(checkPassengerSql, [passenger_id], (err, passengerRows) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
            }
            if (passengerRows.length === 0) {
                return db.rollback(() => res.status(404).json({ error: `Passenger with ID ${passenger_id} does not exist` }));
            }

            // STEP 2: Validate bus and lock row for seat check
            const checkBusSql = `SELECT bus_id, bus_number, ${busAvailCol} AS available_seats FROM buses WHERE bus_id = ? FOR UPDATE`;
            db.query(checkBusSql, [bus_id], (err, busRows) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }
                if (busRows.length === 0) {
                    return db.rollback(() => res.status(404).json({ error: `Bus with ID ${bus_id} does not exist` }));
                }

                const bus = busRows[0];
                if (bus.available_seats <= 0) {
                    return db.rollback(() => res.status(400).json({ error: `No seats available on bus ${bus.bus_number}` }));
                }

                // STEP 3: Prevent duplicate seat booking on same bus and date
                const checkDuplicateSeatSql = `
                    SELECT booking_id FROM bookings 
                    WHERE bus_id = ? AND booking_date = ? AND seat_no = ? 
                    FOR UPDATE
                `;
                db.query(checkDuplicateSeatSql, [bus_id, booking_date, seat_no], (err, existingSeat) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }
                    if (existingSeat.length > 0) {
                        return db.rollback(() => res.status(409).json({
                            error: `Seat ${seat_no} is already booked on ${booking_date} for bus ${bus.bus_number}. Please choose a different seat.`
                        }));
                    }

                    // STEP 4: Deduct 1 available seat from the bus
                    const updateSeatsSql = `UPDATE buses SET ${busAvailCol} = ${busAvailCol} - 1 WHERE bus_id = ?`;
                    db.query(updateSeatsSql, [bus_id], (err) => {
                        if (err) {
                            return db.rollback(() => res.status(500).json({ error: err.message }));
                        }

                        // STEP 5: Insert booking record
                        const insertBookingSql = `
                            INSERT INTO bookings (passenger_id, bus_id, booking_date, seat_no, fare)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        db.query(insertBookingSql, [passenger_id, bus_id, booking_date, seat_no, fare], (err, result) => {
                            if (err) {
                                return db.rollback(() => res.status(500).json({ error: err.message }));
                            }

                            // STEP 6: Commit Transaction
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => res.status(500).json({ error: "Failed to commit booking transaction" }));
                                }

                                res.status(201).json({
                                    message: "Ticket Booked Successfully",
                                    booking_id: result.insertId,
                                    passenger_id: parseInt(passenger_id),
                                    bus_id: parseInt(bus_id),
                                    bus_number: bus.bus_number,
                                    booking_date,
                                    seat_no,
                                    fare: parseFloat(fare),
                                    remaining_seats: bus.available_seats - 1
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// 4.4 DELETE / CANCEL AN EXISTING BOOKING (MySQL Transaction)
app.delete("/bookings/:booking_id", (req, res) => {
    const { booking_id } = req.params;

    // Begin Database Transaction
    db.beginTransaction((err) => {
        if (err) {
            console.error("Transaction Start Error:", err.message);
            return res.status(500).json({ error: "Failed to initiate cancellation transaction" });
        }

        // STEP 1: Find booking and fetch bus_id
        const findBookingSql = "SELECT booking_id, bus_id, seat_no FROM bookings WHERE booking_id = ? FOR UPDATE";
        db.query(findBookingSql, [booking_id], (err, bookingRows) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: err.message }));
            }
            if (bookingRows.length === 0) {
                return db.rollback(() => res.status(404).json({ error: "Booking Not Found" }));
            }

            const { bus_id, seat_no } = bookingRows[0];

            // STEP 2: Delete booking record
            const deleteBookingSql = "DELETE FROM bookings WHERE booking_id = ?";
            db.query(deleteBookingSql, [booking_id], (err) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }

                // STEP 3: Increase available seats by 1 on the corresponding bus
                const incrementSeatSql = `UPDATE buses SET ${busAvailCol} = ${busAvailCol} + 1 WHERE bus_id = ?`;
                db.query(incrementSeatSql, [bus_id], (err) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }

                    // STEP 4: Commit Transaction
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => res.status(500).json({ error: "Failed to commit cancellation transaction" }));
                        }

                        res.json({
                            message: "Booking Cancelled Successfully",
                            cancelled_booking_id: parseInt(booking_id),
                            bus_id: bus_id,
                            released_seat: seat_no
                        });
                    });
                });
            });
        });
    });
});

// =============================================================================
// 5. ROOT / HEALTH CHECK ROUTE
// =============================================================================
app.get("/api/health", (req, res) => {
    res.json({
        system: "HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM",
        status: "UP",
        database: "online_bus_reservation",
        tables: ["passengers", "buses", "bookings"],
        schema: {
            time_column: busTimeCol,
            seats_column: busAvailCol
        },
        timestamp: new Date().toISOString()
    });
});

// Fallback to index.html for root path
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================================================================
// 6. START SERVER
// =============================================================================
app.listen(PORT, () => {
    console.log("=================================================");
    console.log("🚍 HARTHIKRAJ ONLINE BUS RESERVATION SYSTEM");
    console.log(`🌐 Server Running at http://localhost:${PORT}`);
    console.log("=================================================");
});
