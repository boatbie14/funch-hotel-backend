import { body, validationResult } from "express-validator";

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

// SEO fields validation for CREATE operations
export const validateSEOFields = [
  body("seo_title_th").optional().trim(),

  body("seo_description_th").optional().trim(),

  body("seo_title_en").optional().trim(),

  body("seo_description_en").optional().trim(),

  body("slug")
    .notEmpty()
    .trim()
    .withMessage("Slug is required")
    .matches(/^[a-z0-9\-]+$/)
    .withMessage("Slug can only contain lowercase letters, numbers, and hyphens"),

  handleValidationErrors,
];

// SEO fields validation for UPDATE operations
export const validateSEOUpdate = [
  body("seo_title_th").optional().trim(),

  body("seo_description_th").optional().trim(),

  body("seo_title_en").optional().trim(),

  body("seo_description_en").optional().trim(),

  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9\-]+$/)
    .withMessage("Slug can only contain lowercase letters, numbers, and hyphens"),

  handleValidationErrors,
];

// Sanitize SEO data (trim only)
export const sanitizeSEOData = (req, res, next) => {
  try {
    const seoFields = ["seo_title_th", "seo_description_th", "seo_title_en", "seo_description_en", "slug"];

    seoFields.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = req.body[field].trim();
      }
    });

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Data Processing Error",
      message: "Failed to process SEO data",
    });
  }
};

// Check for malicious content in SEO fields
export const validateSEOContent = (req, res, next) => {
  try {
    const fieldsToCheck = ["seo_title_th", "seo_description_th", "seo_title_en", "seo_description_en"];

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
      message: "Failed to validate SEO content security",
    });
  }
};

// Validate slug format and business rules
export const validateSlugRules = (req, res, next) => {
  try {
    const { slug } = req.body;

    if (slug) {
      // Check minimum length
      if (slug.trim().length < 3) {
        return res.status(400).json({
          error: "Invalid Slug",
          message: "Slug must be at least 3 characters long",
        });
      }

      // Check maximum length
      if (slug.trim().length > 100) {
        return res.status(400).json({
          error: "Invalid Slug",
          message: "Slug must not exceed 100 characters",
        });
      }

      // Check for consecutive hyphens
      if (slug.includes("--")) {
        return res.status(400).json({
          error: "Invalid Slug",
          message: "Slug cannot contain consecutive hyphens",
        });
      }

      // Check if starts or ends with hyphen
      if (slug.startsWith("-") || slug.endsWith("-")) {
        return res.status(400).json({
          error: "Invalid Slug",
          message: "Slug cannot start or end with a hyphen",
        });
      }

      // Check for reserved words
      const reservedWords = [
        "admin",
        "api",
        "www",
        "mail",
        "ftp",
        "localhost",
        "test",
        "dev",
        "staging",
        "prod",
        "production",
        "null",
        "undefined",
        "true",
        "false",
        "index",
        "home",
        "about",
        "contact",
      ];

      if (reservedWords.includes(slug.toLowerCase())) {
        return res.status(400).json({
          error: "Invalid Slug",
          message: "Slug cannot be a reserved word",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "Slug Validation Error",
      message: "Failed to validate slug rules",
    });
  }
};

// Validate SEO fields character limits (flexible)
export const validateSEOLimits = (req, res, next) => {
  try {
    const limits = {
      seo_title_th: 1000, // Flexible limit
      seo_description_th: 2000, // Flexible limit
      seo_title_en: 1000, // Flexible limit
      seo_description_en: 2000, // Flexible limit
    };

    for (const [field, maxLength] of Object.entries(limits)) {
      if (req.body[field] && req.body[field].length > maxLength) {
        return res.status(400).json({
          error: "Content Too Long",
          message: `${field} exceeds maximum length of ${maxLength} characters`,
          currentLength: req.body[field].length,
          maxLength: maxLength,
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      error: "SEO Limits Validation Error",
      message: "Failed to validate SEO field limits",
    });
  }
};

// Complete SEO validation chain for CREATE
export const validateSEOCreate = [sanitizeSEOData, validateSEOContent, validateSlugRules, validateSEOLimits, validateSEOFields];

// Complete SEO validation chain for UPDATE
export const validateSEOUpdateChain = [sanitizeSEOData, validateSEOContent, validateSlugRules, validateSEOLimits, validateSEOUpdate];

export default {
  validateSEOFields,
  validateSEOUpdate,
  sanitizeSEOData,
  validateSEOContent,
  validateSlugRules,
  validateSEOLimits,
  validateSEOCreate,
  validateSEOUpdateChain,
  handleValidationErrors,
};
