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

// Validate parent ID parameter (hotel_id or room_id)
export const validateParentId = (paramName = "hotel_id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: "Invalid ID format",
        message: `${paramName} must be a valid UUID`,
      });
    }

    next();
  };
};

// Validate image ID parameter
export const validateImageId = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      error: "Invalid Image ID format",
      message: "Image ID must be a valid UUID",
    });
  }

  next();
};

// Validate URL format
const validateImageUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // Accept http/https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }
    // Check if it looks like an image URL (optional, could be more flexible)
    const imageExtensions = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i;
    return imageExtensions.test(urlObj.pathname) || urlObj.hostname.includes("supabase") || urlObj.hostname.includes("cloudinary");
  } catch {
    return false;
  }
};

// Validate single image creation
export const validateImageCreate = [
  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isUUID().withMessage("Hotel ID must be a valid UUID"),

  body("img_url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Must be a valid URL")
    .custom((url) => {
      if (!validateImageUrl(url)) {
        throw new Error("Invalid image URL format");
      }
      return true;
    }),

  body("title_th").optional().trim().isLength({ max: 255 }).withMessage("Thai title must not exceed 255 characters"),

  body("title_en").optional().trim().isLength({ max: 255 }).withMessage("English title must not exceed 255 characters"),

  body("alt_th").optional().trim().isLength({ max: 255 }).withMessage("Thai alt text must not exceed 255 characters"),

  body("alt_en").optional().trim().isLength({ max: 255 }).withMessage("English alt text must not exceed 255 characters"),

  body("order").optional().isInt({ min: 0, max: 32767 }).withMessage("Order must be between 0 and 32767").toInt(),

  body("isThumb").optional().isBoolean().withMessage("isThumb must be a boolean value").toBoolean(),

  handleValidationErrors,
];

// Validate bulk image creation
export const validateBulkImageCreate = [
  body("hotel_id").notEmpty().withMessage("Hotel ID is required").isUUID().withMessage("Hotel ID must be a valid UUID"),

  body("images").isArray({ min: 1 }).withMessage("Images array is required and must contain at least one image"),

  body("images.*.img_url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Must be a valid URL")
    .custom((url) => {
      if (!validateImageUrl(url)) {
        throw new Error("Invalid image URL format");
      }
      return true;
    }),

  body("images.*.title_th").optional().trim().isLength({ max: 255 }).withMessage("Thai title must not exceed 255 characters"),

  body("images.*.title_en").optional().trim().isLength({ max: 255 }).withMessage("English title must not exceed 255 characters"),

  body("images.*.alt_th").optional().trim().isLength({ max: 255 }).withMessage("Thai alt text must not exceed 255 characters"),

  body("images.*.alt_en").optional().trim().isLength({ max: 255 }).withMessage("English alt text must not exceed 255 characters"),

  body("images.*.order").optional().isInt({ min: 0, max: 32767 }).withMessage("Order must be between 0 and 32767").toInt(),

  body("images.*.isThumb").optional().isBoolean().withMessage("isThumb must be a boolean value").toBoolean(),

  // Validate that only one image can be thumbnail
  body("images").custom((images) => {
    const thumbnails = images.filter((img) => img.isThumb === true);
    if (thumbnails.length > 1) {
      throw new Error("Only one image can be set as thumbnail");
    }
    return true;
  }),

  handleValidationErrors,
];

// Validate image update data
export const validateImageUpdate = [
  body("title_th").optional().trim().isLength({ max: 300 }).withMessage("Thai title must not exceed 300 characters"),

  body("title_en").optional().trim().isLength({ max: 300 }).withMessage("English title must not exceed 300 characters"),

  body("alt_th").optional().trim().isLength({ max: 300 }).withMessage("Thai alt text must not exceed 300 characters"),

  body("alt_en").optional().trim().isLength({ max: 300 }).withMessage("English alt text must not exceed 300 characters"),

  body("order").optional().isInt({ min: 0, max: 32767 }).withMessage("Order must be between 0 and 32767").toInt(),

  body("isThumb").optional().isBoolean().withMessage("isThumb must be a boolean value").toBoolean(),

  body("img_url")
    .optional()
    .isURL()
    .withMessage("Must be a valid URL")
    .custom((url) => {
      if (url && !validateImageUrl(url)) {
        throw new Error("Invalid image URL format");
      }
      return true;
    }),

  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    const allowedFields = ["title_th", "title_en", "alt_th", "alt_en", "order", "isThumb", "img_url"];
    const providedFields = Object.keys(req.body).filter((key) => allowedFields.includes(key) && req.body[key] !== undefined);

    if (providedFields.length === 0) {
      throw new Error("At least one field must be provided for update");
    }
    return true;
  }),

  handleValidationErrors,
];

// Validate GET images query parameters
export const validateGetImages = [
  query("isThumb").optional().isBoolean().withMessage("isThumb must be a boolean value").toBoolean(),

  query("orderBy").optional().isIn(["order", "created_at"]).withMessage("orderBy must be either 'order' or 'created_at'"),

  query("sortDirection").optional().isIn(["asc", "desc"]).withMessage("sortDirection must be either 'asc' or 'desc'"),

  handleValidationErrors,
];

// Sanitize image data
export const sanitizeImageData = (req, res, next) => {
  try {
    // For bulk creation
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images = req.body.images.map((imageData) => {
        const sanitized = { ...imageData };

        if (sanitized.title_th) sanitized.title_th = sanitized.title_th.trim();
        if (sanitized.title_en) sanitized.title_en = sanitized.title_en.trim();
        if (sanitized.alt_th) sanitized.alt_th = sanitized.alt_th.trim();
        if (sanitized.alt_en) sanitized.alt_en = sanitized.alt_en.trim();
        if (sanitized.img_url) sanitized.img_url = sanitized.img_url.trim();

        return sanitized;
      });
    }

    // For single image operations
    if (req.body.title_th) req.body.title_th = req.body.title_th.trim();
    if (req.body.title_en) req.body.title_en = req.body.title_en.trim();
    if (req.body.alt_th) req.body.alt_th = req.body.alt_th.trim();
    if (req.body.alt_en) req.body.alt_en = req.body.alt_en.trim();
    if (req.body.img_url) req.body.img_url = req.body.img_url.trim();

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process image data",
    });
  }
};

// Check for malicious content in image metadata
export const validateImageContent = (req, res, next) => {
  try {
    const xssPattern = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i;

    // Check bulk images
    if (req.body.images && Array.isArray(req.body.images)) {
      for (const imageData of req.body.images) {
        const fields = ["title_th", "title_en", "alt_th", "alt_en"];

        for (const field of fields) {
          if (imageData[field] && xssPattern.test(imageData[field])) {
            return res.status(400).json({
              error: "Invalid Content",
              message: `${field} contains potentially harmful content`,
            });
          }
        }
      }
    }

    // Check single image fields
    const fields = ["title_th", "title_en", "alt_th", "alt_en"];
    for (const field of fields) {
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

export default {
  handleValidationErrors,
  validateParentId,
  validateImageId,
  validateImageCreate,
  validateBulkImageCreate,
  validateImageUpdate,
  validateGetImages,
  sanitizeImageData,
  validateImageContent,
};
