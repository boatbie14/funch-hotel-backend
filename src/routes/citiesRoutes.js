import express from "express";
import CitiesController from "../controllers/citiesController.js";
import {
  validateCityCreate,
  validateCityUpdate,
  validatePagination,
  validateSearch,
  validateSelect,
  validateCitiesByCountry,
  validateUUID,
  validateCountryUUID,
  sanitizeCityData,
  validateCityContent,
  validateCityNames,
  validateCityNameLength,
} from "../middleware/citiesValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/cities/search
// @desc    Search cities by name
// @access  Private (Admin only)
router.get("/search", authenticateToken, requireAdmin, validateSearch, CitiesController.searchCities);

// @route   GET /api/cities/select
// @desc    Get cities for dropdown/select (simplified data)
// @access  Private (Admin only)
router.get("/select", validateSelect, CitiesController.getCitiesForSelect);

// @route   GET /api/cities/country/:countryId
// @desc    Get cities by country ID
// @access  Private (Admin only)
router.get(
  "/country/:countryId",
  validateCountryUUID,
  authenticateToken,
  requireAdmin,
  validateCitiesByCountry,
  CitiesController.getCitiesByCountryId
);

// @route   GET /api/cities
// @desc    Get all cities with pagination and optional country filter
// @access  Private (Admin only)
router.get("/", validatePagination, CitiesController.getAllCities);

// @route   GET /api/cities/:id/hotels-check
// @desc    Check if city has hotels (for delete validation)
// @access  Private (Admin only)
router.get("/:id/hotels-check", validateUUID, authenticateToken, requireAdmin, CitiesController.checkCityHasHotels);

// @route   GET /api/cities/:id
// @desc    Get city by ID
// @access  Private (Admin only)
router.get("/:id", validateUUID, authenticateToken, requireAdmin, CitiesController.getCityById);

// @route   POST /api/cities
// @desc    Create new city
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  sanitizeCityData,
  validateCityContent,
  validateCityNames,
  validateCityNameLength,
  validateCityCreate,
  CitiesController.createCity
);

// @route   PUT /api/cities/:id
// @desc    Update city
// @access  Private (Admin only)
router.put(
  "/:id",
  validateUUID,
  authenticateToken,
  requireAdmin,
  sanitizeCityData,
  validateCityContent,
  validateCityNames,
  validateCityNameLength,
  validateCityUpdate,
  CitiesController.updateCity
);

// @route   DELETE /api/cities/:id
// @desc    Delete city
// @access  Private (Admin only)
router.delete("/:id", validateUUID, authenticateToken, requireAdmin, CitiesController.deleteCity);

export default router;
