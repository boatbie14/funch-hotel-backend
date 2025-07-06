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

// Country validation rules
export const validateCountryCreate = [
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

  body("image")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      // Allow null, undefined, or empty string
      if (!value || value === "") {
        return true;
      }
      // If value exists, validate as URL
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error("Image must be a valid URL (http or https)");
      }
    })
    .isLength({ max: 1000 })
    .withMessage("Image URL must not exceed 1000 characters"),

  handleValidationErrors,
];

export const validateCountryUpdate = [
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

  body("image")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      // Allow null, undefined, or empty string
      if (!value || value === "") {
        return true;
      }
      // If value exists, validate as URL
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error("Image must be a valid URL (http or https)");
      }
    })
    .isLength({ max: 1000 })
    .withMessage("Image URL must not exceed 1000 characters"),

  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    const allowedFields = ["name_th", "name_en", "image"];
    const providedFields = Object.keys(req.body).filter((key) => allowedFields.includes(key) && req.body[key] !== undefined);

    if (providedFields.length === 0) {
      throw new Error("At least one field (name_th, name_en, or image) must be provided for update");
    }
    return true;
  }),

  handleValidationErrors,
];

// Pagination validation for GET requests
export const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

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

// Sanitize and normalize input data
export const sanitizeCountryData = (req, res, next) => {
  try {
    if (req.body.name_th) {
      req.body.name_th = req.body.name_th.trim();
    }
    if (req.body.name_en) {
      req.body.name_en = req.body.name_en.trim();
    }
    if (req.body.image) {
      req.body.image = req.body.image.trim();
      // Convert empty string to null
      if (req.body.image === "") {
        req.body.image = null;
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process request data",
    });
  }
};

// Check for malicious content in country names
export const validateCountryContent = (req, res, next) => {
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

// Validate image URL accessibility (optional middleware)
export const validateImageUrl = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image) {
      return next();
    }

    // Basic URL format validation is already done by express-validator
    // Here we could add additional checks like:
    // - Check if URL is accessible
    // - Validate image format
    // - Check file size
    // For now, we'll just validate the URL structure

    const url = new URL(image);
    const allowedHosts = [
      // Add allowed domains if needed
      // 'example.com',
      // 'cdn.example.com'
    ];

    // If you have specific domain restrictions, uncomment this:
    // if (allowedHosts.length > 0 && !allowedHosts.includes(url.hostname)) {
    //   return res.status(400).json({
    //     error: "Invalid Image URL",
    //     message: "Image must be hosted on allowed domains",
    //   });
    // }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Image URL Validation Error",
      message: "Invalid image URL format",
    });
  }
};

// Rate limiting for country operations (if needed)
export const countryRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
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
        message: `Too many country requests. Try again in ${timeLeft} seconds`,
        retryAfter: timeLeft,
      });
    }

    userRequests.count++;
    next();
  };
};

export default {
  validateCountryCreate,
  validateCountryUpdate,
  validatePagination,
  validateSearch,
  validateUUID,
  sanitizeCountryData,
  validateCountryContent,
  validateImageUrl,
  countryRateLimit,
  handleValidationErrors,
};
