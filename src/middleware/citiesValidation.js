import { body, query, validationResult } from "express-validator";

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation Error",
      details: errors.array(),
    });
  }
  next();
};

// Cities validation rules
export const validateCityCreate = [
  body("name_th")
    .notEmpty()
    .trim()
    .withMessage("Thai name is required")
    .isLength({ max: 255 })
    .withMessage("Thai name must not exceed 255 characters")
    .matches(/^[\u0E00-\u0E7Fa-zA-Z0-9\s\-\(\)\.]+$/)
    .withMessage("Thai name contains invalid characters"),

  body("name_en")
    .notEmpty()
    .trim()
    .withMessage("English name is required")
    .isLength({ max: 255 })
    .withMessage("English name must not exceed 255 characters")
    .matches(/^[a-zA-Z0-9\s\-\(\)\.]+$/)
    .withMessage("English name can only contain letters, numbers, spaces, hyphens, parentheses, and periods"),

  body("country_id").notEmpty().withMessage("Country ID is required").isUUID().withMessage("Country ID must be a valid UUID"),

  handleValidationErrors,
];

export const validateCityUpdate = [
  body("name_th")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Thai name must not exceed 255 characters")
    .matches(/^[\u0E00-\u0E7Fa-zA-Z0-9\s\-\(\)\.]+$/)
    .withMessage("Thai name contains invalid characters"),

  body("name_en")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("English name must not exceed 255 characters")
    .matches(/^[a-zA-Z0-9\s\-\(\)\.]+$/)
    .withMessage("English name can only contain letters, numbers, spaces, hyphens, parentheses, and periods"),

  body("country_id").optional().isUUID().withMessage("Country ID must be a valid UUID"),

  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    const allowedFields = ["name_th", "name_en", "country_id"];
    const providedFields = Object.keys(req.body).filter((key) => allowedFields.includes(key) && req.body[key] !== undefined);

    if (providedFields.length === 0) {
      throw new Error("At least one field (name_th, name_en, or country_id) must be provided for update");
    }
    return true;
  }),

  handleValidationErrors,
];

// Pagination validation for GET requests
export const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("country_id").optional().isUUID().withMessage("Country ID must be a valid UUID"),

  handleValidationErrors,
];

// Search validation
export const validateSearch = [
  query("q")
    .notEmpty()
    .trim()
    .withMessage("Search query is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1-100 characters")
    .matches(/^[\u0E00-\u0E7Fa-zA-Z0-9\s\-\(\)\.]+$/)
    .withMessage("Search query contains invalid characters"),

  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("country_id").optional().isUUID().withMessage("Country ID must be a valid UUID"),

  handleValidationErrors,
];

// Select validation (for dropdown endpoints)
export const validateSelect = [
  query("country_id").optional().isUUID().withMessage("Country ID must be a valid UUID"),

  handleValidationErrors,
];

// Cities by country validation
export const validateCitiesByCountry = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  handleValidationErrors,
];

// UUID parameter validation
export const validateUUID = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      error: "Invalid ID format",
      message: "ID must be a valid UUID",
    });
  }

  next();
};

// Country ID parameter validation
export const validateCountryUUID = (req, res, next) => {
  const { countryId } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(countryId)) {
    return res.status(400).json({
      error: "Invalid Country ID format",
      message: "Country ID must be a valid UUID",
    });
  }

  next();
};

// Sanitize and normalize input data
export const sanitizeCityData = (req, res, next) => {
  try {
    if (req.body.name_th) {
      req.body.name_th = req.body.name_th.trim();
    }
    if (req.body.name_en) {
      req.body.name_en = req.body.name_en.trim();
    }
    if (req.body.country_id) {
      req.body.country_id = req.body.country_id.trim();
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process request data",
    });
  }
};

// Check for malicious content in city names
export const validateCityContent = (req, res, next) => {
  try {
    const { name_th, name_en } = req.body;

    // Basic XSS prevention
    const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;

    if (name_th && xssPattern.test(name_th)) {
      return res.status(400).json({
        error: "Invalid Content",
        message: "Thai name contains potentially harmful content",
      });
    }

    if (name_en && xssPattern.test(name_en)) {
      return res.status(400).json({
        error: "Invalid Content",
        message: "English name contains potentially harmful content",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Content Validation Error",
      message: "Failed to validate content security",
    });
  }
};

// Validate city names are not just numbers
export const validateCityNames = (req, res, next) => {
  try {
    const { name_th, name_en } = req.body;

    // Check if names are not just numbers
    if (name_th && /^\d+$/.test(name_th.trim())) {
      return res.status(400).json({
        error: "Invalid City Name",
        message: "Thai name cannot be just numbers",
      });
    }

    if (name_en && /^\d+$/.test(name_en.trim())) {
      return res.status(400).json({
        error: "Invalid City Name",
        message: "English name cannot be just numbers",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Name Validation Error",
      message: "Failed to validate city names",
    });
  }
};

// Validate city names length (minimum length check)
export const validateCityNameLength = (req, res, next) => {
  try {
    const { name_th, name_en } = req.body;

    if (name_th && name_th.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid City Name",
        message: "Thai name must be at least 2 characters long",
      });
    }

    if (name_en && name_en.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid City Name",
        message: "English name must be at least 2 characters long",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Name Length Validation Error",
      message: "Failed to validate city name length",
    });
  }
};

// Rate limiting for city operations (if needed)
export const cityRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean old entries
    for (const [key, data] of requests.entries()) {
      if (now - data.firstRequest > windowMs) {
        requests.delete(key);
      }
    }

    const userRequests = requests.get(identifier);

    if (!userRequests) {
      requests.set(identifier, {
        count: 1,
        firstRequest: now,
      });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const timeLeft = Math.ceil((windowMs - (now - userRequests.firstRequest)) / 1000);
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Too many city requests. Try again in ${timeLeft} seconds`,
        retryAfter: timeLeft,
      });
    }

    userRequests.count++;
    next();
  };
};

export default {
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
  cityRateLimit,
  handleValidationErrors,
};
