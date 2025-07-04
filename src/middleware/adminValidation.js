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

// Admin validation rules
export const validateAdminCreate = [
  body("fname")
    .notEmpty()
    .trim()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name must not exceed 50 characters"),

  body("lname")
    .notEmpty()
    .trim()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name must not exceed 50 characters"),

  body("username")
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage("Username must be between 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6-128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one lowercase letter, one uppercase letter, and one number"),

  body("admin_role").isIn(["super_admin", "admin", "manager"]).withMessage("Invalid admin role. Must be: super_admin, admin, or manager"),

  body("admin_status")
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid admin status. Must be: active, inactive, or suspended"),

  handleValidationErrors,
];

export const validateAdminUpdate = [
  body("fname").optional().trim().isLength({ max: 50 }).withMessage("First name must not exceed 50 characters"),

  body("lname").optional().trim().isLength({ max: 50 }).withMessage("Last name must not exceed 50 characters"),

  body("username")
    .optional()
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage("Username must be between 3-30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required")
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("password")
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6-128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one lowercase letter, one uppercase letter, and one number"),

  body("admin_role")
    .optional()
    .isIn(["super_admin", "admin", "manager"])
    .withMessage("Invalid admin role. Must be: super_admin, admin, or manager"),

  body("admin_status")
    .optional()
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid admin status. Must be: active, inactive, or suspended"),

  handleValidationErrors,
];

export const validateAdminStatus = [
  body("admin_status")
    .isIn(["active", "inactive", "suspended"])
    .withMessage("Invalid admin status. Must be: active, inactive, or suspended"),

  handleValidationErrors,
];

export const validateAdminLogin = [
  body("username").notEmpty().trim().withMessage("Username is required"),

  body("password").notEmpty().withMessage("Password is required"),

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
