const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

// สมมติว่าใช้ database connection แบบนี้
// const db = require('../database/connection');

// === MIDDLEWARE ===

// Validation middleware
const validateBookingData = (req, res, next) => {
  const { user_id, hotel_id, room_id, date, price } = req.body;

  const errors = [];

  if (!user_id) errors.push("user_id is required");
  if (!hotel_id) errors.push("hotel_id is required");
  if (!room_id) errors.push("room_id is required");
  if (!date) errors.push("date is required");
  if (!price || price <= 0) errors.push("price must be greater than 0");

  // ตรวจสอบ UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (user_id && !uuidRegex.test(user_id)) errors.push("user_id must be valid UUID");
  if (hotel_id && !uuidRegex.test(hotel_id)) errors.push("hotel_id must be valid UUID");
  if (room_id && !uuidRegex.test(room_id)) errors.push("room_id must be valid UUID");

  // ตรวจสอบวันที่
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(bookingDate.getTime())) errors.push("date must be valid date");
  if (bookingDate < today) errors.push("date cannot be in the past");

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

// Check room availability
const checkRoomAvailability = async (req, res, next) => {
  try {
    const { room_id, date } = req.body;

    // ดึงจำนวนห้องทั้งหมดจาก room table
    const roomQuery = await db.query("SELECT total_rooms FROM rooms WHERE id = $1", [room_id]);

    if (roomQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const totalRooms = roomQuery.rows[0].total_rooms;

    // นับจำนวน booking ที่ active ในวันนั้น
    const bookingQuery = await db.query(
      `
      SELECT COUNT(*) as booking_count 
      FROM bookings 
      WHERE room_id = $1 
      AND date = $2 
      AND status = 'active'
    `,
      [room_id, date]
    );

    const currentBookings = parseInt(bookingQuery.rows[0].booking_count);

    if (currentBookings >= totalRooms) {
      return res.status(409).json({
        success: false,
        message: `Room is fully booked for ${date}. Available rooms: ${totalRooms}, Current bookings: ${currentBookings}`,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking room availability:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking room availability",
    });
  }
};

// === API ENDPOINTS ===

// GET - ดึงรายการ booking
router.get("/bookings", async (req, res) => {
  try {
    const { user_id, date, status } = req.query;

    let query = "SELECT * FROM bookings WHERE 1=1";
    const params = [];
    let paramCount = 0;

    if (user_id) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (date) {
      paramCount++;
      query += ` AND date = $${paramCount}`;
      params.push(date);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += " ORDER BY create_at DESC";

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
    });
  }
});

// GET - ดึง booking ตาม ID
router.get("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking",
    });
  }
});

// POST - สร้าง booking ใหม่
router.post("/bookings", validateBookingData, checkRoomAvailability, async (req, res) => {
  try {
    const { user_id, hotel_id, room_id, date, price, note } = req.body;
    const id = uuidv4();

    const result = await db.query(
      `
      INSERT INTO bookings (id, user_id, hotel_id, room_id, date, price, note, status, create_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      RETURNING *
    `,
      [id, user_id, hotel_id, room_id, date, price, note]
    );

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      message: "Error creating booking",
    });
  }
});

// PUT - อัพเดท booking
router.put("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { price, note, status } = req.body;

    // เช็คว่า booking มีอยู่จริง
    const existingBooking = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);

    if (existingBooking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // สร้าง query สำหรับ update
    const updateFields = [];
    const params = [];
    let paramCount = 0;

    if (price !== undefined) {
      paramCount++;
      updateFields.push(`price = $${paramCount}`);
      params.push(price);
    }

    if (note !== undefined) {
      paramCount++;
      updateFields.push(`note = $${paramCount}`);
      params.push(note);
    }

    if (status !== undefined) {
      if (!["active", "cancel"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "cancel"',
        });
      }
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    paramCount++;
    params.push(id);

    const query = `UPDATE bookings SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      message: "Booking updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({
      success: false,
      message: "Error updating booking",
    });
  }
});

module.exports = router;
