import express from "express";
import CountryController from "../controllers/countryController.js";
import {
  validateCountryCreate,
  validateCountryUpdate,
  validatePagination,
  validateSearch,
  validateUUID,
  sanitizeCountryData,
  validateCountryContent,
  validateImageUrl,
} from "../middleware/countryValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/country/search
// @desc    Search countries by name
// @access  Private (Admin only)
router.get("/search", authenticateToken, requireAdmin, validateSearch, CountryController.searchCountries);

// @route   GET /api/country/select
// @desc    Get countries for dropdown/select (simplified data)
// @access  Private (Admin only)
router.get("/select", authenticateToken, requireAdmin, CountryController.getCountriesForSelect);

// @route   GET /api/country
// @desc    Get all countries with pagination
// @access  Private (Admin only)
router.get("/", authenticateToken, requireAdmin, validatePagination, CountryController.getAllCountries);

// @route   GET /api/country/:id/cities-check
// @desc    Check if country has cities (for delete validation)
// @access  Private (Admin only)
router.get("/:id/cities-check", validateUUID, authenticateToken, requireAdmin, CountryController.checkCountryHasCities);

// @route   GET /api/country/:id
// @desc    Get country by ID
// @access  Private (Admin only)
router.get("/:id", validateUUID, authenticateToken, requireAdmin, CountryController.getCountryById);

// @route   POST /api/country
// @desc    Create new country
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  sanitizeCountryData,
  validateCountryContent,
  validateImageUrl,
  validateCountryCreate,
  CountryController.createCountry
);

// @route   PUT /api/country/:id
// @desc    Update country
// @access  Private (Admin only)
router.put(
  "/:id",
  validateUUID,
  authenticateToken,
  requireAdmin,
  sanitizeCountryData,
  validateCountryContent,
  validateImageUrl,
  validateCountryUpdate,
  CountryController.updateCountry
);

// @route   DELETE /api/country/:id
// @desc    Delete country
// @access  Private (Admin only)
router.delete("/:id", validateUUID, authenticateToken, requireAdmin, CountryController.deleteCountry);

export default router;
