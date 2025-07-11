import { verifyToken, extractTokenFromHeader } from "../utils/jwt.js";
import UserLoginService from "../services/userLoginService.js";

/**
 * User Authentication middleware - Verify JWT token for users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateUserToken = async (req, res, next) => {
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

    // Check if user still exists and is active
    const userResult = await UserLoginService.getUserById(verifyResult.decoded.id);

    if (!userResult.success) {
      return res.status(401).json({
        error: "Authentication Failed",
        message: "User not found",
      });
    }

    // Check if user is still active
    if (userResult.data.status !== "active") {
      return res.status(401).json({
        error: "Authentication Failed",
        message: `User account is ${userResult.data.status}`,
      });
    }

    // Add user info to request object
    req.user = {
      id: verifyResult.decoded.id,
      username: verifyResult.decoded.username,
      email: verifyResult.decoded.email,
      fname: verifyResult.decoded.fname,
      lname: verifyResult.decoded.lname,
      status: userResult.data.status, // Get latest status
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
 * Optional user authentication middleware - Add user info if token is present, but don't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalUserAuth = async (req, res, next) => {
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

    // Try to get user info
    const userResult = await UserLoginService.getUserById(verifyResult.decoded.id);

    if (userResult.success && userResult.data.status === "active") {
      req.user = {
        id: verifyResult.decoded.id,
        username: verifyResult.decoded.username,
        email: verifyResult.decoded.email,
        fname: verifyResult.decoded.fname,
        lname: verifyResult.decoded.lname,
        status: userResult.data.status,
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
 * Self access middleware - Allow user to access only their own data
 * @param {string} paramName - Parameter name containing user ID (default: 'id')
 * @returns {Function} Middleware function
 */
export const requireSelf = (paramName = "id") => {
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

      // Allow only if accessing own data
      if (targetUserId !== currentUserId) {
        return res.status(403).json({
          error: "Access Denied",
          message: "You can only access your own data",
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
 * Rate limiting for user login attempts (basic implementation)
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
export const userLoginRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
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
  authenticateUserToken,
  optionalUserAuth,
  requireSelf,
  userLoginRateLimit,
};
