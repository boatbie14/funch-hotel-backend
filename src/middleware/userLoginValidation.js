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

// User login validation rules
export const validateUserLogin = [
  // Custom validation for flexible login field
  body().custom((value, { req }) => {
    const emailOrUsername = req.body.emailOrUsername || req.body.email || req.body.username;

    if (!emailOrUsername || emailOrUsername.trim().length === 0) {
      throw new Error("Email or username is required");
    }

    if (emailOrUsername.trim().length < 3 || emailOrUsername.trim().length > 100) {
      throw new Error("Email or username must be between 3-100 characters");
    }

    // Normalize the field - convert to lowercase and trim
    const normalizedValue = emailOrUsername.trim().toLowerCase();

    // Set normalized field for controller
    req.body.emailOrUsername = normalizedValue;

    return true;
  }),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 1, max: 128 })
    .withMessage("Password must not exceed 128 characters"),

  handleValidationErrors,
];

// Refresh token validation
export const validateRefreshToken = [body("refreshToken").notEmpty().withMessage("Refresh token is required"), handleValidationErrors];

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
