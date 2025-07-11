import BookingService from "../services/bookingService.js";

class BookingController {
  // GET /api/bookings - Get all bookings with pagination and filters
  async getAllBookings(req, res) {
    try {
      const { page = 1, limit = 20, user_id, date, status, hotel_id } = req.query;

      // Convert to numbers
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Validate pagination params
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid pagination parameters. Page must be >= 1 and limit must be between 1-100",
        });
      }

      // Build filters
      const filters = {};
      if (user_id) filters.user_id = user_id;
      if (date) filters.date = date;
      if (status) filters.status = status;
      if (hotel_id) filters.hotel_id = hotel_id;

      const result = await BookingService.getAllBookings(pageNum, limitNum, filters);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in getAllBookings:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /api/bookings/:id - Get booking by ID
  async getBookingById(req, res) {
    try {
      const { id } = req.params;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID format",
        });
      }

      const result = await BookingService.getBookingById(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in getBookingById:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // POST /api/bookings - Create new booking (single or multiple dates)
  async createBooking(req, res) {
    try {
      const { user_id, hotel_id, room_id, date, dates, price, note } = req.body;

      // Determine if it's single date or multiple dates
      const isMultipleDates = dates && Array.isArray(dates) && dates.length > 0;
      const isSingleDate = date && !isMultipleDates;

      if (!isSingleDate && !isMultipleDates) {
        return res.status(400).json({
          success: false,
          message: "Either 'date' (string) or 'dates' (array) must be provided",
        });
      }

      // Validation
      const errors = [];

      if (!user_id) errors.push("user_id is required");
      if (!hotel_id) errors.push("hotel_id is required");
      if (!room_id) errors.push("room_id is required");
      if (!price || price <= 0) errors.push("price must be greater than 0");

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (user_id && !uuidRegex.test(user_id)) errors.push("user_id must be valid UUID");
      if (hotel_id && !uuidRegex.test(hotel_id)) errors.push("hotel_id must be valid UUID");
      if (room_id && !uuidRegex.test(room_id)) errors.push("room_id must be valid UUID");

      // Validate dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isSingleDate) {
        const bookingDate = new Date(date);
        if (isNaN(bookingDate.getTime())) errors.push("date must be valid date");
        if (bookingDate < today) errors.push("date cannot be in the past");
      }

      if (isMultipleDates) {
        if (dates.length > 30) errors.push("maximum 30 dates allowed per booking");

        dates.forEach((dateStr, index) => {
          const bookingDate = new Date(dateStr);
          if (isNaN(bookingDate.getTime())) {
            errors.push(`dates[${index}] must be valid date`);
          } else if (bookingDate < today) {
            errors.push(`dates[${index}] cannot be in the past`);
          }
        });

        // Check for duplicate dates
        const uniqueDates = [...new Set(dates)];
        if (uniqueDates.length !== dates.length) {
          errors.push("duplicate dates are not allowed");
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      let result;

      if (isSingleDate) {
        // Single date booking
        result = await BookingService.createBooking({
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
        });
      } else {
        // Multiple dates booking
        result = await BookingService.createMultipleBookings({
          user_id,
          hotel_id,
          room_id,
          dates,
          price,
          note,
        });
      }

      if (!result.success) {
        // Check if it's a room availability error
        if (result.error.includes("fully booked")) {
          return res.status(409).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      const responseMessage = isMultipleDates
        ? `${result.count} bookings created successfully for ${result.dates.length} dates`
        : "Booking created successfully";

      res.status(201).json({
        success: true,
        message: responseMessage,
        data: result.data,
        ...(isMultipleDates && {
          count: result.count,
          dates: result.dates,
        }),
      });
    } catch (error) {
      console.error("Error in createBooking:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // PUT /api/bookings/:id - Update booking
  async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const { price, note, status, room_id, date } = req.body;

      // Validate booking ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID format",
        });
      }

      // Validate input data
      const errors = [];

      if (price !== undefined && price <= 0) errors.push("price must be greater than 0");
      if (status !== undefined && !["active", "cancel"].includes(status)) {
        errors.push('status must be either "active" or "cancel"');
      }
      if (room_id !== undefined && !uuidRegex.test(room_id)) {
        errors.push("room_id must be valid UUID");
      }
      if (date !== undefined) {
        const bookingDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(bookingDate.getTime())) errors.push("date must be valid date");
        if (bookingDate < today) errors.push("date cannot be in the past");
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      // Check if there's anything to update
      const updateData = {};
      if (price !== undefined) updateData.price = price;
      if (note !== undefined) updateData.note = note;
      if (status !== undefined) updateData.status = status;
      if (room_id !== undefined) updateData.room_id = room_id;
      if (date !== undefined) updateData.date = date;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      const result = await BookingService.updateBooking(id, updateData);

      if (!result.success) {
        // Check if it's a not found error
        if (result.error.includes("not found")) {
          return res.status(404).json({
            success: false,
            message: result.error,
          });
        }

        // Check if it's a room availability error
        if (result.error.includes("fully booked")) {
          return res.status(409).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Booking updated successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in updateBooking:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // PATCH /api/bookings/:id/cancel - Cancel booking
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;

      // Validate booking ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID format",
        });
      }

      const result = await BookingService.cancelBooking(id);

      if (!result.success) {
        if (result.error.includes("not found")) {
          return res.status(404).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Booking cancelled successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in cancelBooking:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /api/bookings/user/:userId - Get bookings by user ID
  async getBookingsByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Validate user ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      // Convert to numbers
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Validate pagination params
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid pagination parameters",
        });
      }

      const result = await BookingService.getBookingsByUserId(userId, pageNum, limitNum);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in getBookingsByUserId:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /api/bookings/date-range - Get bookings by date range
  async getBookingsByDateRange(req, res) {
    try {
      const { start_date, end_date, page = 1, limit = 20 } = req.query;

      // Validate required params
      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "start_date and end_date are required",
        });
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "start_date must be before end_date",
        });
      }

      // Convert to numbers
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      // Validate pagination params
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid pagination parameters",
        });
      }

      const result = await BookingService.getBookingsByDateRange(start_date, end_date, pageNum, limitNum);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in getBookingsByDateRange:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // DELETE /api/bookings/:id - Delete booking (hard delete)
  async deleteBooking(req, res) {
    try {
      const { id } = req.params;

      // Validate booking ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking ID format",
        });
      }

      const result = await BookingService.deleteBooking(id);

      if (!result.success) {
        if (result.error.includes("not found")) {
          return res.status(404).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Booking deleted successfully",
        data: result.data,
      });
    } catch (error) {
      console.error("Error in deleteBooking:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /api/bookings/room/:roomId/availability - Check room availability for a specific date
  async checkRoomAvailability(req, res) {
    try {
      const { roomId } = req.params;
      const { date } = req.query;

      // Validate room ID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roomId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid room ID format",
        });
      }

      // Validate date
      if (!date) {
        return res.status(400).json({
          success: false,
          message: "date is required",
        });
      }

      const bookingDate = new Date(date);
      if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      const result = await BookingService.checkRoomAvailability(roomId, date);

      if (!result.success) {
        if (result.error.includes("not found")) {
          return res.status(404).json({
            success: false,
            message: result.error,
          });
        }

        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      res.json({
        success: true,
        data: {
          room_id: roomId,
          date: date,
          is_available: result.isAvailable,
          total_rooms: result.totalRooms,
          current_bookings: result.currentBookings,
          available_rooms: result.availableRooms,
        },
      });
    } catch (error) {
      console.error("Error in checkRoomAvailability:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default new BookingController();
