import UserService from "../services/userService.js";

class UserController {
  // @route   POST /api/users/register
  // @desc    Register new user
  // @access  Public
  async registerUser(req, res) {
    try {
      const userData = req.body;

      // Get client IP
      const clientIp =
        req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        "unknown";

      const result = await UserService.createUser(userData, clientIp);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate email")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Duplicate username")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Password hashing failed")) {
          return res.status(500).json({
            error: "Internal Server Error",
            message: "Failed to process user registration",
          });
        }

        return res.status(400).json({
          error: "Registration Error",
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/users/login
  // @desc    Login user
  // @access  Public
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Email and password are required",
        });
      }

      const result = await UserService.verifyUserCredentials(email, password);

      if (!result.success) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: result.error,
        });
      }

      // Get client IP for tracking
      const clientIp =
        req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        "unknown";

      // Update user's last login IP
      await UserService.updateUserIP(result.data.id, clientIp);

      res.json({
        success: true,
        message: "Login successful",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/users/check-email
  // @desc    Check if email exists (for registration validation)
  // @access  Public
  async checkEmailExists(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Email is required",
        });
      }

      const result = await UserService.checkDuplicateEmail(email);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Email check completed",
        data: {
          email: email,
          exists: result.hasDuplicate,
          available: !result.hasDuplicate,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/users/check-username
  // @desc    Check if username exists (for registration validation)
  // @access  Public
  async checkUsernameExists(req, res) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Username is required",
        });
      }

      const result = await UserService.checkDuplicateUsername(username);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Username check completed",
        data: {
          username: username,
          exists: result.hasDuplicate,
          available: !result.hasDuplicate,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new UserController();
