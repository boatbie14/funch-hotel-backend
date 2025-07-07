import express from "express";
import RoomsController from "../controllers/roomsController.js";
import {
  validateRoomCreate,
  validateRoomUpdate,
  validatePagination,
  validateSearch,
  validateSelect,
  validateRoomsByHotel,
  validateUUID,
  validateHotelUUID,
  sanitizeRoomData,
  validateRoomContent,
  validateRoomCreateChain,
  validateRoomUpdateChain,
} from "../middleware/roomsValidation.js";
import { validateSEOCreate, validateSEOUpdateChain } from "../middleware/seoValidation.js";
import { sanitizeImageData, validateImageContent } from "../middleware/imageValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/rooms/search
// @desc    Search rooms by name
// @access  Public
router.get("/search", validateSearch, RoomsController.searchRooms);

// @route   GET /api/rooms/select
// @desc    Get rooms for dropdown/select (simplified data)
// @access  Public
router.get("/select", validateSelect, RoomsController.getRoomsForSelect);

// @route   GET /api/rooms/hotel/:hotelId
// @desc    Get rooms by hotel ID
// @access  Public
router.get("/hotel/:hotelId", validateHotelUUID, validateRoomsByHotel, RoomsController.getRoomsByHotelId);

// @route   GET /api/rooms/:id/availability
// @desc    Check room availability for specific dates
// @access  Public
router.get("/:id/availability", validateUUID, RoomsController.checkRoomAvailability);

// @route   GET /api/rooms/:id/availability/current
// @desc    Get current room availability status
// @access  Public
router.get("/:id/availability/current", validateUUID, RoomsController.getCurrentRoomAvailability);

// @route   GET /api/rooms/:id/bookings-check
// @desc    Check if room has bookings (for delete validation)
// @access  Private (Admin only)
router.get("/:id/bookings-check", validateUUID, authenticateToken, requireAdmin, RoomsController.checkRoomHasBookings);

// @route   GET /api/rooms
// @desc    Get all rooms with pagination and optional hotel filter
// @access  Public
router.get("/", validatePagination, RoomsController.getAllRooms);

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Public
router.get("/:id", validateUUID, RoomsController.getRoomById);

// @route   POST /api/rooms
// @desc    Create new room
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  // Sanitization middleware
  sanitizeRoomData,
  sanitizeImageData,
  // Content validation middleware
  validateRoomContent,
  validateImageContent,
  // SEO validation chain
  validateSEOCreate,
  // Room validation
  validateRoomCreate,
  RoomsController.createRoom
);

// @route   PUT /api/rooms/:id
// @desc    Update room
// @access  Private (Admin only)
router.put("/:id", validateUUID, authenticateToken, requireAdmin, validateRoomUpdateChain, validateSEOCreate, RoomsController.updateRoom);

// @route   DELETE /api/rooms/:id
// @desc    Delete room
// @access  Private (Admin only)
router.delete("/:id", validateUUID, authenticateToken, requireAdmin, RoomsController.deleteRoom);

export default router;
