import validator from "validator";
import xss from "xss";

// Sanitize user input data
export const sanitizeUserData = (req, res, next) => {
  try {
    if (req.body) {
      // Sanitize string fields
      const fieldsToSanitize = ["email", "fname", "lname", "phone1", "phone2", "address", "username"];

      fieldsToSanitize.forEach((field) => {
        if (req.body[field] && typeof req.body[field] === "string") {
          // Remove XSS and trim whitespace
          req.body[field] = xss(req.body[field].trim(), {
            whiteList: {}, // No HTML tags allowed
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script"],
          });
        }
      });

      // Special handling for user_image (URL)
      if (req.body.user_image && typeof req.body.user_image === "string") {
        req.body.user_image = req.body.user_image.trim();
      }
    }
    next();
  } catch (error) {
    res.status(400).json({
      error: "Input Sanitization Error",
      message: "Invalid input data format",
    });
  }
};

// Validate user content for malicious code
export const validateUserContent = (req, res, next) => {
  try {
    const { fname, lname, address, username } = req.body;

    // Check for suspicious patterns
    const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i, /<object/i, /<embed/i];

    const fieldsToCheck = [fname, lname, address, username].filter((field) => field);

    for (const field of fieldsToCheck) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(field)) {
          return res.status(400).json({
            error: "Invalid Content",
            message: "Content contains potentially harmful code",
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Content Validation Error",
      message: "Failed to validate content",
    });
  }
};

// Validate email format
export const validateEmail = (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Email is required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid email format",
      });
    }

    // Check email length
    if (email.length > 255) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Email must be less than 255 characters",
      });
    }

    // Normalize email (lowercase)
    req.body.email = email.toLowerCase();

    next();
  } catch (error) {
    res.status(400).json({
      error: "Email Validation Error",
      message: "Failed to validate email",
    });
  }
};

// Validate password strength
export const validatePassword = (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password is required",
      });
    }

    // Check password length
    if (password.length < 8) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password must be at least 8 characters long",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password must be less than 128 characters",
      });
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Password Validation Error",
      message: "Failed to validate password",
    });
  }
};

// Validate phone numbers
export const validatePhone = (req, res, next) => {
  try {
    const { phone1, phone2 } = req.body;

    // Validate phone1 if provided
    if (phone1) {
      if (!validator.isMobilePhone(phone1, "th-TH")) {
        // Try without country code validation for flexibility
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phoneRegex.test(phone1)) {
          return res.status(400).json({
            error: "Validation Error",
            message: "Invalid phone1 format",
          });
        }
      }
    }

    // Validate phone2 if provided
    if (phone2) {
      if (!validator.isMobilePhone(phone2, "th-TH")) {
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phoneRegex.test(phone2)) {
          return res.status(400).json({
            error: "Validation Error",
            message: "Invalid phone2 format",
          });
        }
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Phone Validation Error",
      message: "Failed to validate phone numbers",
    });
  }
};

// Validate user names (fname, lname)
export const validateUserNames = (req, res, next) => {
  try {
    const { fname, lname } = req.body;

    if (!fname || !lname) {
      return res.status(400).json({
        error: "Validation Error",
        message: "First name and last name are required",
      });
    }

    // Check if names contain only valid characters
    const nameRegex = /^[a-zA-Zก-๙\s\-'.]+$/;

    if (!nameRegex.test(fname)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "First name contains invalid characters",
      });
    }

    if (!nameRegex.test(lname)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Last name contains invalid characters",
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Name Validation Error",
      message: "Failed to validate names",
    });
  }
};

// Validate name lengths
export const validateUserNameLength = (req, res, next) => {
  try {
    const { fname, lname } = req.body;

    if (fname && (fname.length < 2 || fname.length > 50)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "First name must be between 2 and 50 characters",
      });
    }

    if (lname && (lname.length < 2 || lname.length > 50)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Last name must be between 2 and 50 characters",
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Name Length Validation Error",
      message: "Failed to validate name lengths",
    });
  }
};

// Validate username format
export const validateUsername = (req, res, next) => {
  try {
    const { username } = req.body;

    // Username is optional
    if (!username) {
      return next();
    }

    // Check username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Username must be between 3 and 30 characters",
      });
    }

    // Check username format (alphanumeric, underscore, dash only)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Username can only contain letters, numbers, underscores, and dashes",
      });
    }

    // Convert to lowercase for consistency
    req.body.username = username.toLowerCase();

    next();
  } catch (error) {
    res.status(400).json({
      error: "Username Validation Error",
      message: "Failed to validate username",
    });
  }
};

// Validate user image URL
export const validateUserImage = (req, res, next) => {
  try {
    const { user_image } = req.body;

    // User image is optional
    if (!user_image) {
      return next();
    }

    // Check if it's a valid URL
    if (
      !validator.isURL(user_image, {
        protocols: ["http", "https"],
        require_protocol: true,
      })
    ) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid user image URL format",
      });
    }

    // Check URL length
    if (user_image.length > 500) {
      return res.status(400).json({
        error: "Validation Error",
        message: "User image URL must be less than 500 characters",
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Image Validation Error",
      message: "Failed to validate user image",
    });
  }
};

// Validate user status
export const validateUserStatus = (req, res, next) => {
  try {
    const { status } = req.body;

    // If status is provided, validate it
    if (status) {
      const validStatuses = ["active", "inactive", "pending", "suspended"];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Validation Error",
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "Status Validation Error",
      message: "Failed to validate user status",
    });
  }
};

// Main validation for user creation
export const validateUserCreate = (req, res, next) => {
  try {
    const { email, password, fname, lname } = req.body;

    // Check required fields
    const requiredFields = { email, password, fname, lname };
    const missingFields = [];

    Object.keys(requiredFields).forEach((field) => {
      if (!requiredFields[field] || requiredFields[field].trim() === "") {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Validation Error",
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    next();
  } catch (error) {
    res.status(400).json({
      error: "User Creation Validation Error",
      message: "Failed to validate user creation data",
    });
  }
};

// Rate limiting for user registration (simple in-memory implementation)
const registrationAttempts = new Map();

export const rateLimitUserRegistration = (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5; // Max 5 registrations per 15 minutes per IP

    if (!registrationAttempts.has(clientIp)) {
      registrationAttempts.set(clientIp, []);
    }

    const attempts = registrationAttempts.get(clientIp);

    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);
    registrationAttempts.set(clientIp, recentAttempts);

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: "Rate Limit Exceeded",
        message: "Too many registration attempts. Please try again later.",
      });
    }

    // Add current attempt
    recentAttempts.push(now);
    registrationAttempts.set(clientIp, recentAttempts);

    next();
  } catch (error) {
    res.status(500).json({
      error: "Rate Limiting Error",
      message: "Failed to check rate limit",
    });
  }
};
