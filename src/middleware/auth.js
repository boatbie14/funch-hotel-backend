import { verifyToken, extractTokenFromHeader } from "../utils/jwt.js";
import AdminService from "../services/adminService.js";

/**
 * Authentication middleware - Verify JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const tokenResult = extractTokenFromHeader(authHeader);

    if (!tokenResult.success) {
      return res.status(401).json({
        error: "Authentication Required",
        message: tokenResult.error,
      });
    }

    // Verify token
    const verifyResult = verifyToken(tokenResult.token);

    if (!verifyResult.success) {
      return res.status(401).json({
        error: "Authentication Failed",
        message: verifyResult.error,
        ...(verifyResult.errorType === "TokenExpiredError" && { expired: true }),
      });
    }

    // Check if admin still exists and is active
    const adminResult = await AdminService.getAdminById(verifyResult.decoded.id);

    if (!adminResult.success) {
      return res.status(401).json({
        error: "Authentication Failed",
        message: "Admin user not found",
      });
    }

    // Check if admin is still active
    if (adminResult.data.admin_status !== "active") {
      return res.status(401).json({
        error: "Authentication Failed",
        message: `Admin account is ${adminResult.data.admin_status}`,
      });
    }

    // Add user info to request object
    req.user = {
      id: verifyResult.decoded.id,
      username: verifyResult.decoded.username,
      email: verifyResult.decoded.email,
      fname: verifyResult.decoded.fname,
      lname: verifyResult.decoded.lname,
      admin_role: verifyResult.decoded.admin_role,
      admin_status: adminResult.data.admin_status, // Get latest status
      tokenData: verifyResult.decoded,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication check failed",
    });
  }
};

/**
 * Authorization middleware - Check admin roles
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication Required",
          message: "User must be authenticated to access this resource",
        });
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(req.user.admin_role)) {
        return res.status(403).json({
          error: "Access Denied",
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
          userRole: req.user.admin_role,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Authorization check failed",
      });
    }
  };
};

/**
 * Super Admin only middleware
 */
export const requireSuperAdmin = requireRole(["super_admin"]);

/**
 * Admin and above middleware (super_admin, admin)
 */
export const requireAdmin = requireRole(["super_admin", "admin"]);

/**
 * Manager and above middleware (super_admin, admin, manager)
 */
export const requireManager = requireRole(["super_admin", "admin", "manager"]);

/**
 * Self or higher role middleware - Allow user to access their own data or higher role to access others
 * @param {string} paramName - Parameter name containing user ID (default: 'id')
 * @returns {Function} Middleware function
 */
export const requireSelfOrHigherRole = (paramName = "id") => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication Required",
          message: "User must be authenticated",
        });
      }

      const targetUserId = req.params[paramName];
      const currentUserId = req.user.id;
      const userRole = req.user.admin_role;

      // Allow if accessing own data
      if (targetUserId === currentUserId) {
        return next();
      }

      // Allow if user has admin privileges
      if (["super_admin", "admin"].includes(userRole)) {
        return next();
      }

      // Deny access
      return res.status(403).json({
        error: "Access Denied",
        message: "You can only access your own data or need admin privileges",
      });
    } catch (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Authorization check failed",
      });
    }
  };
};

/**
 * Optional authentication middleware - Add user info if token is present, but don't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, continue without user info
    if (!authHeader) {
      return next();
    }

    const tokenResult = extractTokenFromHeader(authHeader);

    if (!tokenResult.success) {
      return next(); // Continue without user info
    }

    const verifyResult = verifyToken(tokenResult.token);

    if (!verifyResult.success) {
      return next(); // Continue without user info
    }

    // Try to get admin info
    const adminResult = await AdminService.getAdminById(verifyResult.decoded.id);

    if (adminResult.success && adminResult.data.admin_status === "active") {
      req.user = {
        id: verifyResult.decoded.id,
        username: verifyResult.decoded.username,
        email: verifyResult.decoded.email,
        fname: verifyResult.decoded.fname,
        lname: verifyResult.decoded.lname,
        admin_role: verifyResult.decoded.admin_role,
        admin_status: adminResult.data.admin_status,
        tokenData: verifyResult.decoded,
      };
    }

    next();
  } catch (error) {
    // Continue without user info if there's an error
    next();
  }
};

/**
 * Rate limiting for login attempts (basic implementation)
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
export const loginRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Clean old entries
    for (const [key, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }

    const userAttempts = attempts.get(identifier);

    if (!userAttempts) {
      attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
      });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000);
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Too many login attempts. Try again in ${timeLeft} seconds`,
        retryAfter: timeLeft,
      });
    }

    userAttempts.count++;
    next();
  };
};

export default {
  authenticateToken,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireSelfOrHigherRole,
  optionalAuth,
  loginRateLimit,
};
