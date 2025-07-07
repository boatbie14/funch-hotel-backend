import express from "express";
import HotelsController from "../controllers/hotelsController.js";
import {
  validateHotelCreate,
  validateHotelUpdate,
  validatePagination,
  validateSearch,
  validateHotelsByCity,
  validateSelect,
  validateSlugCheck,
  validateUUID,
  validateCityUUID,
  validateSlugParam,
  sanitizeHotelData,
  validateHotelContent,
  validateHotelNames,
  validateHotelNameLength,
  validateCheckTimes,
  hotelRateLimit,
} from "../middleware/hotelsValidation.js";
import { validateSEOCreate, validateSEOUpdateChain } from "../middleware/seoValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes (no authentication required)

// @route   GET /api/hotels/search
// @desc    Search hotels by name or location (public)
// @access  Public
router.get("/search", validateSearch, HotelsController.searchHotelsPublic);

// @route   GET /api/hotels/slug/:slug
// @desc    Get hotel by slug (public)
// @access  Public
router.get("/slug/:slug", validateSlugParam, HotelsController.getHotelBySlugPublic);

// @route   GET /api/hotels/city/:cityId
// @desc    Get hotels by city ID (public)
// @access  Public
router.get("/city/:cityId", validateCityUUID, validateHotelsByCity, HotelsController.getHotelsByCityIdPublic);

// @route   GET /api/hotels
// @desc    Get all hotels with pagination and optional filters (public - limited data)
// @access  Public
router.get("/", validatePagination, HotelsController.getAllHotelsPublic);

// Admin routes (authentication required)

// @route   GET /api/hotels/admin
// @desc    Get all hotels with full data for admin
// @access  Private (Admin only)
router.get("/admin", authenticateToken, requireAdmin, validatePagination, HotelsController.getAllHotels);

// @route   GET /api/hotels/admin/search
// @desc    Search hotels with full data for admin
// @access  Private (Admin only)
router.get("/admin/search", authenticateToken, requireAdmin, validateSearch, HotelsController.searchHotels);

// @route   GET /api/hotels/select
// @desc    Get hotels for dropdown/select (simplified data)
// @access  Private (Admin only)
router.get("/select", authenticateToken, requireAdmin, validateSelect, HotelsController.getHotelsForSelect);

// @route   POST /api/hotels
// @desc    Create new hotel with location
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  hotelRateLimit(20, 15 * 60 * 1000), // 20 creates per 15 minutes
  sanitizeHotelData,
  validateSEOCreate, // ← SEO validation (includes SEO fields + slug)
  validateHotelContent,
  validateHotelNames,
  validateHotelNameLength,
  validateCheckTimes,
  validateHotelCreate, // ← Hotel validation (excludes SEO fields)
  HotelsController.createHotel
);

// Hotel-specific routes with ID parameter

// @route   GET /api/hotels/admin/:id
// @desc    Get hotel by ID with full admin data
// @access  Private (Admin only)
router.get("/admin/:id", validateUUID, authenticateToken, requireAdmin, HotelsController.getHotelById);

// @route   PUT /api/hotels/:id
// @desc    Update hotel with location
// @access  Private (Admin only)
router.put(
  "/:id",
  validateUUID,
  authenticateToken,
  requireAdmin,
  sanitizeHotelData,
  validateSEOUpdateChain, // ← SEO validation for updates
  validateHotelContent,
  validateHotelNames,
  validateHotelNameLength,
  validateCheckTimes,
  validateHotelUpdate, // ← Hotel validation (excludes SEO fields)
  HotelsController.updateHotel
);

// @route   DELETE /api/hotels/:id
// @desc    Delete hotel and all related data
// @access  Private (Admin only)
router.delete("/:id", validateUUID, authenticateToken, requireAdmin, HotelsController.deleteHotel);

// Hotel management routes

// @route   PUT /api/hotels/:id/status
// @desc    Toggle hotel status (active/inactive)
// @access  Private (Admin only)
router.put("/:id/status", validateUUID, authenticateToken, requireAdmin, HotelsController.toggleHotelStatus);

// @route   GET /api/hotels/:id/check-slug
// @desc    Check if slug is available for update
// @access  Private (Admin only)
router.get("/:id/check-slug", validateUUID, authenticateToken, requireAdmin, validateSlugCheck, HotelsController.checkSlugAvailability);

// Utility routes for other services

// @route   GET /api/hotels/:id/exists
// @desc    Check if hotel exists (utility endpoint for other services)
// @access  Private (Admin only)
router.get("/:id/exists", validateUUID, authenticateToken, requireAdmin, HotelsController.checkHotelExists);

// @route   GET /api/hotels/:id/basic
// @desc    Get basic hotel info (for other services)
// @access  Private (Admin only)
router.get("/:id/basic", validateUUID, authenticateToken, requireAdmin, HotelsController.getHotelBasicInfo);

export default router;
