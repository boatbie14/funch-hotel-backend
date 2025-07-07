import RoomsService from "../services/roomsService.js";

class RoomsController {
  // @route   GET /api/rooms
  // @desc    Get all rooms with pagination and optional hotel filter
  // @access  Public
  async getAllRooms(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const hotelId = req.query.hotel_id || null;

      const result = await RoomsService.getAllRooms(page, limit, hotelId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Rooms retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        filters: {
          hotel_id: hotelId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/:id
  // @desc    Get room by ID
  // @access  Public
  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const result = await RoomsService.getRoomById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Room retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/:id/availability
  // @desc    Check room availability for specific dates
  // @access  Public
  async checkRoomAvailability(req, res) {
    try {
      const { id } = req.params;
      const { check_in, check_out } = req.query;

      if (!check_in || !check_out) {
        return res.status(400).json({
          error: "Missing Parameters",
          message: "check_in and check_out dates are required",
        });
      }

      const result = await RoomsService.checkRoomAvailability(id, check_in, check_out);

      if (!result.success) {
        return res.status(400).json({
          error: "Availability Check Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Room availability checked successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/:id/availability/current
  // @desc    Get current room availability status
  // @access  Public
  async getCurrentRoomAvailability(req, res) {
    try {
      const { id } = req.params;
      const result = await RoomsService.getCurrentRoomAvailability(id);

      if (!result.success) {
        return res.status(400).json({
          error: "Availability Check Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Current room availability retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/rooms
  // @desc    Create new room
  // @access  Private (Admin only)
  async createRoom(req, res) {
    try {
      const roomData = req.body;
      const result = await RoomsService.createRoom(roomData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Hotel not found")) {
          return res.status(400).json({
            error: "Invalid Hotel",
            message: result.error,
          });
        }

        if (result.error.includes("Total rooms must be at least 1")) {
          return res.status(400).json({
            error: "Invalid Room Count",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: "Room created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/rooms/:id
  // @desc    Update room
  // @access  Private (Admin only)
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await RoomsService.updateRoom(id, updateData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Room not found") || result.error.includes("not found")) {
          return res.status(404).json({
            error: "Not Found",
            message: result.error,
          });
        }

        if (result.error.includes("Total rooms must be at least 1")) {
          return res.status(400).json({
            error: "Invalid Room Count",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Room updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/rooms/:id
  // @desc    Delete room
  // @access  Private (Admin only)
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const result = await RoomsService.deleteRoom(id);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Cannot delete room that has existing bookings")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Room deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/select
  // @desc    Get rooms for dropdown/select
  // @access  Public
  async getRoomsForSelect(req, res) {
    try {
      const hotelId = req.query.hotel_id || null;
      const result = await RoomsService.getRoomsForSelect(hotelId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Rooms for selection retrieved successfully",
        data: result.data,
        count: result.count,
        filters: {
          hotel_id: hotelId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/search
  // @desc    Search rooms by name
  // @access  Public
  async searchRooms(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const hotelId = req.query.hotel_id || null;

      if (!searchTerm) {
        return res.status(400).json({
          error: "Missing Parameter",
          message: "Search term (q) is required",
        });
      }

      const result = await RoomsService.searchRooms(searchTerm, page, limit, hotelId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Room search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
        filters: {
          hotel_id: hotelId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/hotel/:hotelId
  // @desc    Get rooms by hotel ID
  // @access  Public
  async getRoomsByHotelId(req, res) {
    try {
      const { hotelId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await RoomsService.getRoomsByHotelId(hotelId, page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Rooms by hotel retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        hotel_id: hotelId,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/rooms/:id/bookings-check
  // @desc    Check if room has bookings (for delete validation)
  // @access  Private (Admin only)
  async checkRoomHasBookings(req, res) {
    try {
      const { id } = req.params;
      const result = await RoomsService.checkRoomHasBookings(id);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Bookings check completed successfully",
        data: {
          roomId: id,
          hasBookings: result.hasBookings,
          bookingsCount: result.bookingsCount,
          canDelete: !result.hasBookings,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new RoomsController();
