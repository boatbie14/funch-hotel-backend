import express from "express";
import BookingController from "../controllers/bookingController.js";

const router = express.Router();

// === BOOKING ROUTES ===

// GET /api/bookings - Get all bookings with pagination and filters
// Query params: page, limit, user_id, date, status, hotel_id
router.get("/", BookingController.getAllBookings);

// GET /api/bookings/user/:userId - Get bookings by user ID
// Query params: page, limit
router.get("/user/:userId", BookingController.getBookingsByUserId);

// GET /api/bookings/date-range - Get bookings by date range
// Query params: start_date, end_date, page, limit
router.get("/date-range", BookingController.getBookingsByDateRange);

// GET /api/bookings/room/:roomId/availability - Check room availability
// Query params: date
router.get("/room/:roomId/availability", BookingController.checkRoomAvailability);

// GET /api/bookings/:id - Get booking by ID
router.get("/:id", BookingController.getBookingById);

// POST /api/bookings - Create new booking (single or multiple dates)
// Body: { user_id, hotel_id, room_id, date?, dates?, price, note? }
// Use 'date' for single date OR 'dates' array for multiple dates
router.post("/", BookingController.createBooking);

// PUT /api/bookings/:id - Update booking
// Body: { price?, note?, status?, room_id?, date? }
router.put("/:id", BookingController.updateBooking);

// PATCH /api/bookings/:id/cancel - Cancel booking (soft delete)
router.patch("/:id/cancel", BookingController.cancelBooking);

// DELETE /api/bookings/:id - Delete booking (hard delete)
router.delete("/:id", BookingController.deleteBooking);

export default router;
