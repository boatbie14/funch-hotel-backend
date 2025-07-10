import { body, query, param, validationResult } from "express-validator";
import { validateSEOCreate, validateSEOUpdateChain, sanitizeSEOData, validateSEOContent, validateSlugRules } from "./seoValidation.js";

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

// Validate UUID parameters
export const validateUUID = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      error: "Invalid ID format",
      message: "Room ID must be a valid UUID",
    });
  }

  next();
};

// Validate Hotel UUID parameter
export const validateHotelUUID = (req, res, next) => {
  const { hotelId } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(hotelId)) {
    return res.status(400).json({
      error: "Invalid Hotel ID format",
      message: "Hotel ID must be a valid UUID",
    });
  }

  next();
};

// Validate bed size enum
const validateBedSize = (value) => {
  const validBedSizes = ["Single", "Twin", "Double", "Queen", "King", "Super King"];
  return validBedSizes.includes(value);
};

// Validate room creation
export const validateRoomCreate = [
  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isUUID().withMessage("Hotel ID must be a valid UUID"),

  body("name_th")
    .notEmpty()
    .withMessage("Thai name is required")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Thai name must be between 2 and 255 characters"),

  body("name_en")
    .notEmpty()
    .withMessage("English name is required")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("English name must be between 2 and 255 characters"),

  body("description_th").optional().trim().isLength({ max: 2000 }).withMessage("Thai description must not exceed 2000 characters"),

  body("description_en").optional().trim().isLength({ max: 2000 }).withMessage("English description must not exceed 2000 characters"),

  body("max_adult").optional().isInt({ min: 1, max: 20 }).withMessage("Max adult must be between 1 and 20").toInt(),

  body("max_children").optional().isInt({ min: 0, max: 15 }).withMessage("Max children must be between 0 and 15").toInt(),

  body("total_rooms").optional().isInt({ min: 1, max: 1000 }).withMessage("Total rooms must be between 1 and 1000").toInt(),

  body("status").optional().isBoolean().withMessage("Status must be a boolean value").toBoolean(),

  // Room options validation
  body("room_options.bed")
    .notEmpty()
    .withMessage("Bed type is required")
    .custom((value) => {
      if (!validateBedSize(value)) {
        throw new Error("Invalid bed size. Must be one of: Single, Twin, Double, Queen, King, Super King");
      }
      return true;
    }),

  body("room_options.kitchen")
    .notEmpty()
    .withMessage("Kitchen option is required")
    .isBoolean()
    .withMessage("Kitchen must be a boolean value")
    .toBoolean(),

  body("room_options.air_conditioner")
    .notEmpty()
    .withMessage("Air conditioner option is required")
    .isBoolean()
    .withMessage("Air conditioner must be a boolean value")
    .toBoolean(),

  body("room_options.fan")
    .notEmpty()
    .withMessage("Fan option is required")
    .isBoolean()
    .withMessage("Fan must be a boolean value")
    .toBoolean(),

  body("room_options.free_wifi")
    .notEmpty()
    .withMessage("Free wifi option is required")
    .isBoolean()
    .withMessage("Free wifi must be a boolean value")
    .toBoolean(),

  body("room_options.city_view")
    .notEmpty()
    .withMessage("City view option is required")
    .isBoolean()
    .withMessage("City view must be a boolean value")
    .toBoolean(),

  body("room_options.sea_view")
    .notEmpty()
    .withMessage("Sea view option is required")
    .isBoolean()
    .withMessage("Sea view must be a boolean value")
    .toBoolean(),

  body("room_options.free_breakfast")
    .notEmpty()
    .withMessage("Free breakfast option is required")
    .isBoolean()
    .withMessage("Free breakfast must be a boolean value")
    .toBoolean(),

  body("room_options.restaurant")
    .notEmpty()
    .withMessage("Restaurant option is required")
    .isBoolean()
    .withMessage("Restaurant must be a boolean value")
    .toBoolean(),

  body("room_options.smoking")
    .notEmpty()
    .withMessage("Smoking option is required")
    .isBoolean()
    .withMessage("Smoking must be a boolean value")
    .toBoolean(),

  // Base prices validation
  body("base_prices.price_sun")
    .notEmpty()
    .withMessage("Sunday price is required")
    .isFloat({ min: 0 })
    .withMessage("Sunday price must be a positive number")
    .toFloat(),

  body("base_prices.price_mon")
    .notEmpty()
    .withMessage("Monday price is required")
    .isFloat({ min: 0 })
    .withMessage("Monday price must be a positive number")
    .toFloat(),

  body("base_prices.price_tue")
    .notEmpty()
    .withMessage("Tuesday price is required")
    .isFloat({ min: 0 })
    .withMessage("Tuesday price must be a positive number")
    .toFloat(),

  body("base_prices.price_wed")
    .notEmpty()
    .withMessage("Wednesday price is required")
    .isFloat({ min: 0 })
    .withMessage("Wednesday price must be a positive number")
    .toFloat(),

  body("base_prices.price_thu")
    .notEmpty()
    .withMessage("Thursday price is required")
    .isFloat({ min: 0 })
    .withMessage("Thursday price must be a positive number")
    .toFloat(),

  body("base_prices.price_fri")
    .notEmpty()
    .withMessage("Friday price is required")
    .isFloat({ min: 0 })
    .withMessage("Friday price must be a positive number")
    .toFloat(),

  body("base_prices.price_sat")
    .notEmpty()
    .withMessage("Saturday price is required")
    .isFloat({ min: 0 })
    .withMessage("Saturday price must be a positive number")
    .toFloat(),

  // Override prices validation (optional)
  body("override_prices").optional().isArray().withMessage("Override prices must be an array"),

  body("override_prices.*.start_date")
    .if(body("override_prices").exists())
    .notEmpty()
    .withMessage("Start date is required for override prices")
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("override_prices.*.end_date")
    .if(body("override_prices").exists())
    .notEmpty()
    .withMessage("End date is required for override prices")
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate(),

  body("override_prices.*.price")
    .if(body("override_prices").exists())
    .notEmpty()
    .withMessage("Price is required for override prices")
    .isFloat({ min: 0 })
    .withMessage("Override price must be a positive number")
    .toFloat(),

  body("override_prices.*.note")
    .if(body("override_prices").exists())
    .optional({ values: "falsy" }) // ← อนุญาตให้เป็น empty string หรือ null
    .trim()
    .isLength({ min: 0, max: 500 })
    .withMessage("Note must not exceed 500 characters"),

  body("override_prices.*.is_promotion")
    .if(body("override_prices").exists())
    .notEmpty()
    .withMessage("Promotion flag is required for override prices")
    .isBoolean()
    .withMessage("Is promotion must be a boolean value")
    .toBoolean(),

  body("override_prices.*.is_active")
    .if(body("override_prices").exists())
    .notEmpty()
    .withMessage("Active flag is required for override prices")
    .isBoolean()
    .withMessage("Is active must be a boolean value")
    .toBoolean(),

  body("last_update_by").notEmpty().withMessage("Last update by is required").isUUID().withMessage("Last update by must be a valid UUID"),

  // Custom validations
  body("override_prices").custom((overridePrices) => {
    if (overridePrices && Array.isArray(overridePrices)) {
      for (const price of overridePrices) {
        if (price.start_date && price.end_date) {
          const startDate = new Date(price.start_date);
          const endDate = new Date(price.end_date);

          if (startDate >= endDate) {
            throw new Error("Start date must be before end date for override prices");
          }
        }
      }
    }
    return true;
  }),

  handleValidationErrors,
];

// Validate room update (similar to create but most fields optional)
export const validateRoomUpdate = [
  // Hotel ID should not be updated
  body("hotel_id").optional().isUUID().withMessage("Hotel ID must be a valid UUID"),

  body("name_th").optional().trim().isLength({ min: 2, max: 255 }).withMessage("Thai name must be between 2 and 255 characters"),

  body("name_en").optional().trim().isLength({ min: 2, max: 255 }).withMessage("English name must be between 2 and 255 characters"),

  body("description_th").optional().trim().isLength({ max: 2000 }).withMessage("Thai description must not exceed 2000 characters"),

  body("description_en").optional().trim().isLength({ max: 2000 }).withMessage("English description must not exceed 2000 characters"),

  body("max_adult").optional().isInt({ min: 1, max: 20 }).withMessage("Max adult must be between 1 and 20").toInt(),

  body("max_children").optional().isInt({ min: 0, max: 15 }).withMessage("Max children must be between 0 and 15").toInt(),

  body("total_rooms").optional().isInt({ min: 1, max: 1000 }).withMessage("Total rooms must be between 1 and 1000").toInt(),

  body("status").optional().isBoolean().withMessage("Status must be a boolean value").toBoolean(),

  body("seo_title_th").optional().trim().isLength({ max: 255 }).withMessage("SEO title (Thai) must not exceed 255 characters"),

  body("seo_title_en").optional().trim().isLength({ max: 255 }).withMessage("SEO title (English) must not exceed 255 characters"),

  body("seo_description_th").optional().trim().isLength({ max: 500 }).withMessage("SEO description (Thai) must not exceed 500 characters"),

  body("seo_description_en")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("SEO description (English) must not exceed 500 characters"),

  body("slug").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Slug must be between 2 and 100 characters"),

  // Room options validation (optional for update)
  body("room_options.bed")
    .optional()
    .custom((value) => {
      if (value && !validateBedSize(value)) {
        throw new Error("Invalid bed size. Must be one of: Single, Twin, Double, Queen, King, Super King");
      }
      return true;
    }),

  body("room_options.kitchen").optional().isBoolean().withMessage("Kitchen must be a boolean value").toBoolean(),

  body("room_options.air_conditioner").optional().isBoolean().withMessage("Air conditioner must be a boolean value").toBoolean(),

  body("room_options.fan").optional().isBoolean().withMessage("Fan must be a boolean value").toBoolean(),

  body("room_options.free_wifi").optional().isBoolean().withMessage("Free wifi must be a boolean value").toBoolean(),

  body("room_options.city_view").optional().isBoolean().withMessage("City view must be a boolean value").toBoolean(),

  body("room_options.sea_view").optional().isBoolean().withMessage("Sea view must be a boolean value").toBoolean(),

  body("room_options.free_breakfast").optional().isBoolean().withMessage("Free breakfast must be a boolean value").toBoolean(),

  body("room_options.restaurant").optional().isBoolean().withMessage("Restaurant must be a boolean value").toBoolean(),

  body("room_options.smoking").optional().isBoolean().withMessage("Smoking must be a boolean value").toBoolean(),

  // Base prices validation (optional for update)
  body("base_prices.price_sun").optional().isFloat({ min: 0 }).withMessage("Sunday price must be a positive number").toFloat(),

  body("base_prices.price_mon").optional().isFloat({ min: 0 }).withMessage("Monday price must be a positive number").toFloat(),

  body("base_prices.price_tue").optional().isFloat({ min: 0 }).withMessage("Tuesday price must be a positive number").toFloat(),

  body("base_prices.price_wed").optional().isFloat({ min: 0 }).withMessage("Wednesday price must be a positive number").toFloat(),

  body("base_prices.price_thu").optional().isFloat({ min: 0 }).withMessage("Thursday price must be a positive number").toFloat(),

  body("base_prices.price_fri").optional().isFloat({ min: 0 }).withMessage("Friday price must be a positive number").toFloat(),

  body("base_prices.price_sat").optional().isFloat({ min: 0 }).withMessage("Saturday price must be a positive number").toFloat(),

  // Override prices validation (optional for update)
  body("override_prices").optional().isArray().withMessage("Override prices must be an array"),

  body("override_prices.*.start_date")
    .if(body("override_prices").exists())
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("override_prices.*.end_date")
    .if(body("override_prices").exists())
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate(),

  body("override_prices.*.price")
    .if(body("override_prices").exists())
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Override price must be a positive number")
    .toFloat(),

  body("override_prices.*.note")
    .if(body("override_prices").exists())
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Note must be between 5 and 500 characters"),

  body("override_prices.*.is_promotion")
    .if(body("override_prices").exists())
    .optional()
    .isBoolean()
    .withMessage("Is promotion must be a boolean value")
    .toBoolean(),

  body("override_prices.*.is_active")
    .if(body("override_prices").exists())
    .optional()
    .isBoolean()
    .withMessage("Is active must be a boolean value")
    .toBoolean(),

  body("last_update_by").optional().isUUID().withMessage("Last update by must be a valid UUID"),

  // Custom validations
  body("override_prices").custom((overridePrices) => {
    if (overridePrices && Array.isArray(overridePrices)) {
      for (const price of overridePrices) {
        if (price.start_date && price.end_date) {
          const startDate = new Date(price.start_date);
          const endDate = new Date(price.end_date);

          if (startDate >= endDate) {
            throw new Error("Start date must be before end date for override prices");
          }
        }
      }
    }
    return true;
  }),

  // For update, we don't require any specific field - it's all optional
  // This allows partial updates
  handleValidationErrors,
];

// Validate pagination parameters
export const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("hotel_id").optional().isUUID().withMessage("Hotel ID must be a valid UUID"),

  handleValidationErrors,
];

// Validate search parameters
export const validateSearch = [
  query("q")
    .notEmpty()
    .withMessage("Search term is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Search term must be between 2 and 100 characters"),

  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  query("hotel_id").optional().isUUID().withMessage("Hotel ID must be a valid UUID"),

  handleValidationErrors,
];

// Validate select parameters (for dropdowns)
export const validateSelect = [query("hotel_id").optional().isUUID().withMessage("Hotel ID must be a valid UUID"), handleValidationErrors];

// Validate rooms by hotel parameters
export const validateRoomsByHotel = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),

  handleValidationErrors,
];

// Sanitize room data
export const sanitizeRoomData = (req, res, next) => {
  try {
    // Sanitize main room fields
    const fieldsToTrim = ["name_th", "name_en", "description_th", "description_en"];

    fieldsToTrim.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = req.body[field].trim();
      }
    });

    // Sanitize override prices
    if (req.body.override_prices && Array.isArray(req.body.override_prices)) {
      req.body.override_prices = req.body.override_prices.map((price) => ({
        ...price,
        note: price.note ? price.note.trim() : price.note,
      }));
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process room data",
    });
  }
};

// Validate room content for security
export const validateRoomContent = (req, res, next) => {
  try {
    const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;

    // Check main room fields
    const fieldsToCheck = ["name_th", "name_en", "description_th", "description_en"];

    for (const field of fieldsToCheck) {
      if (req.body[field] && xssPattern.test(req.body[field])) {
        return res.status(400).json({
          error: "Invalid Content",
          message: `${field} contains potentially harmful content`,
        });
      }
    }

    // Check override prices notes
    if (req.body.override_prices && Array.isArray(req.body.override_prices)) {
      for (const price of req.body.override_prices) {
        if (price.note && xssPattern.test(price.note)) {
          return res.status(400).json({
            error: "Invalid Content",
            message: "Override price note contains potentially harmful content",
          });
        }
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

// Complete room validation chains (updated for PUT support)
export const validateRoomCreateChain = [
  sanitizeRoomData,
  sanitizeSEOData,
  validateRoomContent,
  validateSEOContent,
  validateSlugRules,
  validateRoomCreate,
  // SEO validation will be handled separately in route
];

export const validateRoomUpdateChain = [
  sanitizeRoomData,
  sanitizeSEOData,
  validateRoomContent,
  validateSEOContent,
  validateSlugRules,
  validateRoomUpdate,
  // SEO validation will be handled separately in route
];

export default {
  handleValidationErrors,
  validateUUID,
  validateHotelUUID,
  validateRoomCreate,
  validateRoomUpdate,
  validatePagination,
  validateSearch,
  validateSelect,
  validateRoomsByHotel,
  sanitizeRoomData,
  validateRoomContent,
  validateRoomCreateChain,
  validateRoomUpdateChain,
};
