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

// Hotels validation rules (CREATE)
export const validateHotelCreate = [
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

  body("description_th").optional().trim().isLength({ max: 5000 }).withMessage("Thai description must not exceed 5000 characters"),

  body("description_en").optional().trim().isLength({ max: 5000 }).withMessage("English description must not exceed 5000 characters"),

  body("excerpt_th").optional().trim().isLength({ max: 300 }).withMessage("Thai excerpt must not exceed 300 characters"),

  body("excerpt_en").optional().trim().isLength({ max: 300 }).withMessage("English excerpt must not exceed 300 characters"),

  body("location_th")
    .notEmpty()
    .trim()
    .withMessage("Thai location is required")
    .isLength({ max: 500 })
    .withMessage("Thai location must not exceed 500 characters"),

  body("location_en")
    .notEmpty()
    .trim()
    .withMessage("English location is required")
    .isLength({ max: 500 })
    .withMessage("English location must not exceed 500 characters"),

  body("google_map_link")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Google map link must be a valid URL"),

  body("checkin_time")
    .notEmpty()
    .withMessage("Check-in time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-in time must be in HH:mm format"),

  body("checkout_time")
    .notEmpty()
    .withMessage("Check-out time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-out time must be in HH:mm format"),

  body("status").optional().isBoolean().withMessage("Status must be true or false"),

  // Hotel Location validation
  body("city_id").notEmpty().withMessage("City ID is required").isUUID().withMessage("City ID must be a valid UUID"),

  handleValidationErrors,
];

// Hotels validation rules (UPDATE)
export const validateHotelUpdate = [
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

  body("description_th").optional().trim().isLength({ max: 5000 }).withMessage("Thai description must not exceed 5000 characters"),

  body("description_en").optional().trim().isLength({ max: 5000 }).withMessage("English description must not exceed 5000 characters"),

  body("excerpt_th").optional().trim().isLength({ max: 300 }).withMessage("Thai excerpt must not exceed 300 characters"),

  body("excerpt_en").optional().trim().isLength({ max: 300 }).withMessage("English excerpt must not exceed 300 characters"),

  body("location_th").optional().trim().isLength({ max: 500 }).withMessage("Thai location must not exceed 500 characters"),

  body("location_en").optional().trim().isLength({ max: 500 }).withMessage("English location must not exceed 500 characters"),

  body("google_map_link")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"] })
    .withMessage("Google map link must be a valid URL"),

  body("checkin_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-in time must be in HH:mm format"),

  body("checkout_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-out time must be in HH:mm format"),

  body("status").optional().isBoolean().withMessage("Status must be true or false"),

  body("city_id").optional().isUUID().withMessage("City ID must be a valid UUID"),

  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    const allowedFields = [
      "name_th",
      "name_en",
      "description_th",
      "description_en",
      "excerpt_th",
      "excerpt_en",
      "location_th",
      "location_en",
      "google_map_link",
      "checkin_time",
      "checkout_time",
      "status",
      "city_id",
    ];
    const providedFields = Object.keys(req.body).filter((key) => allowedFields.includes(key) && req.body[key] !== undefined);

    if (providedFields.length === 0) {
      throw new Error("At least one field must be provided for update");
    }
    return true;
  }),

  handleValidationErrors,
];

// Pagination validation for GET requests
export const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("city_id").optional().isUUID().withMessage("City ID must be a valid UUID"),

  query("status").optional().isBoolean().withMessage("Status must be true or false"),

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

  query("city_id").optional().isUUID().withMessage("City ID must be a valid UUID"),

  query("status").optional().isBoolean().withMessage("Status must be true or false"),

  handleValidationErrors,
];

// Hotels by city validation
export const validateHotelsByCity = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("status").optional().isBoolean().withMessage("Status must be true or false"),

  handleValidationErrors,
];

// Select validation (for dropdown endpoints)
export const validateSelect = [
  query("city_id").optional().isUUID().withMessage("City ID must be a valid UUID"),

  query("status").optional().isBoolean().withMessage("Status must be true or false"),

  handleValidationErrors,
];

// Slug validation
export const validateSlugCheck = [
  query("slug")
    .notEmpty()
    .trim()
    .withMessage("Slug is required")
    .isLength({ max: 255 })
    .withMessage("Slug must not exceed 255 characters")
    .matches(/^[a-z0-9\-]+$/)
    .withMessage("Slug can only contain lowercase letters, numbers, and hyphens"),

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

// City ID parameter validation
export const validateCityUUID = (req, res, next) => {
  const { cityId } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(cityId)) {
    return res.status(400).json({
      error: "Invalid City ID format",
      message: "City ID must be a valid UUID",
    });
  }

  next();
};

// Slug parameter validation
export const validateSlugParam = (req, res, next) => {
  const { slug } = req.params;
  const slugRegex = /^[a-z0-9\-]+$/;

  if (!slugRegex.test(slug)) {
    return res.status(400).json({
      error: "Invalid Slug format",
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
    });
  }

  next();
};

// Sanitize and normalize input data
export const sanitizeHotelData = (req, res, next) => {
  try {
    const fieldsToTrim = [
      "name_th",
      "name_en",
      "description_th",
      "description_en",
      "excerpt_th",
      "excerpt_en",
      "location_th",
      "location_en",
      "google_map_link",
      "city_id",
    ];

    fieldsToTrim.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = req.body[field].trim();
      }
    });

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process request data",
    });
  }
};

// Check for malicious content
export const validateHotelContent = (req, res, next) => {
  try {
    const fieldsToCheck = [
      "name_th",
      "name_en",
      "description_th",
      "description_en",
      "excerpt_th",
      "excerpt_en",
      "location_th",
      "location_en",
    ];

    // Basic XSS prevention
    const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;

    for (const field of fieldsToCheck) {
      if (req.body[field] && xssPattern.test(req.body[field])) {
        return res.status(400).json({
          error: "Invalid Content",
          message: `${field} contains potentially harmful content`,
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Content Validation Error",
      message: "Failed to validate content security",
    });
  }
};

// Validate hotel names are not just numbers
export const validateHotelNames = (req, res, next) => {
  try {
    const { name_th, name_en } = req.body;

    if (name_th && /^\d+$/.test(name_th.trim())) {
      return res.status(400).json({
        error: "Invalid Hotel Name",
        message: "Thai name cannot be just numbers",
      });
    }

    if (name_en && /^\d+$/.test(name_en.trim())) {
      return res.status(400).json({
        error: "Invalid Hotel Name",
        message: "English name cannot be just numbers",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Name Validation Error",
      message: "Failed to validate hotel names",
    });
  }
};

// Validate hotel names length
export const validateHotelNameLength = (req, res, next) => {
  try {
    const { name_th, name_en } = req.body;

    if (name_th && name_th.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid Hotel Name",
        message: "Thai name must be at least 2 characters long",
      });
    }

    if (name_en && name_en.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid Hotel Name",
        message: "English name must be at least 2 characters long",
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Name Length Validation Error",
      message: "Failed to validate hotel name length",
    });
  }
};

// Validate check-in/check-out time logic
export const validateCheckTimes = (req, res, next) => {
  try {
    const { checkin_time, checkout_time } = req.body;

    if (checkin_time && checkout_time) {
      // Convert times to minutes for comparison
      const checkinMinutes = checkin_time.split(":").reduce((acc, val, idx) => acc + parseInt(val) * (idx === 0 ? 60 : 1), 0);
      const checkoutMinutes = checkout_time.split(":").reduce((acc, val, idx) => acc + parseInt(val) * (idx === 0 ? 60 : 1), 0);

      // Check-out should not be same or after check-in (assuming same day)
      if (checkoutMinutes >= checkinMinutes) {
        return res.status(400).json({
          error: "Invalid Time Range",
          message: "Check-out time must be before check-in time (next day)",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Time Validation Error",
      message: "Failed to validate check-in/check-out times",
    });
  }
};

// เพิ่ม validation ใหม่สำหรับ citySlug parameter
export const validateCitySlugParam = (req, res, next) => {
  const { citySlug } = req.params;
  const slugRegex = /^[a-z0-9\-]+$/;

  if (!slugRegex.test(citySlug)) {
    return res.status(400).json({
      error: "Invalid City Slug format",
      message: "City slug can only contain lowercase letters, numbers, and hyphens",
    });
  }

  next();
};

// Rate limiting for hotel operations
export const hotelRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
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
        message: `Too many hotel requests. Try again in ${timeLeft} seconds`,
        retryAfter: timeLeft,
      });
    }

    userRequests.count++;
    next();
  };
};

export default {
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
  validateCitySlugParam, // เพิ่มใหม่
  sanitizeHotelData,
  validateHotelContent,
  validateHotelNames,
  validateHotelNameLength,
  validateCheckTimes,
  hotelRateLimit,
  handleValidationErrors,
};
