import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Validate JWT configuration
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

/**
 * Generate JWT token for admin user
 * @param {Object} adminData - Admin user data
 * @returns {Object} - Token and expiration info
 */
export const generateToken = (adminData) => {
  try {
    // Create payload (don't include sensitive data)
    const payload = {
      id: adminData.id,
      username: adminData.username,
      email: adminData.email,
      fname: adminData.fname,
      lname: adminData.lname,
      admin_role: adminData.admin_role,
      admin_status: adminData.admin_status,
      type: "admin",
    };

    // Generate token
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "funch-hotel-api",
      audience: "funch-hotel-admin",
    });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days

    return {
      success: true,
      token: token,
      tokenType: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Token generation failed: ${error.message}`,
    };
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Verification result with decoded data
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "funch-hotel-api",
      audience: "funch-hotel-admin",
    });

    return {
      success: true,
      decoded: decoded,
      isValid: true,
    };
  } catch (error) {
    let errorMessage = "Token verification failed";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Token has expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid token format";
    } else if (error.name === "NotBeforeError") {
      errorMessage = "Token not active yet";
    }

    return {
      success: false,
      isValid: false,
      error: errorMessage,
      errorType: error.name,
    };
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {Object} - Extraction result
 */
export const extractTokenFromHeader = (authHeader) => {
  try {
    if (!authHeader) {
      return {
        success: false,
        error: "Authorization header is missing",
      };
    }

    if (!authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: 'Authorization header must start with "Bearer "',
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return {
        success: false,
        error: "Token is missing from Authorization header",
      };
    }

    return {
      success: true,
      token: token,
    };
  } catch (error) {
    return {
      success: false,
      error: `Token extraction failed: ${error.message}`,
    };
  }
};

/**
 * Generate refresh token (longer expiration)
 * @param {Object} adminData - Admin user data
 * @returns {Object} - Refresh token info
 */
export const generateRefreshToken = (adminData) => {
  try {
    // Minimal payload for refresh token
    const payload = {
      id: adminData.id,
      username: adminData.username,
      type: "admin_refresh",
    };

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "30d", // Refresh tokens last longer
      issuer: "funch-hotel-api",
      audience: "funch-hotel-refresh",
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return {
      success: true,
      refreshToken: refreshToken,
      expiresIn: "30d",
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: `Refresh token generation failed: ${error.message}`,
    };
  }
};

/**
 * Verify refresh token
 * @param {string} refreshToken - Refresh token to verify
 * @returns {Object} - Verification result
 */
export const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      issuer: "funch-hotel-api",
      audience: "funch-hotel-refresh",
    });

    if (decoded.type !== "admin_refresh") {
      return {
        success: false,
        error: "Invalid refresh token type",
      };
    }

    return {
      success: true,
      decoded: decoded,
      isValid: true,
    };
  } catch (error) {
    let errorMessage = "Refresh token verification failed";

    if (error.name === "TokenExpiredError") {
      errorMessage = "Refresh token has expired";
    } else if (error.name === "JsonWebTokenError") {
      errorMessage = "Invalid refresh token format";
    }

    return {
      success: false,
      isValid: false,
      error: errorMessage,
      errorType: error.name,
    };
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded token data
 */
export const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });

    return {
      success: true,
      header: decoded.header,
      payload: decoded.payload,
      signature: decoded.signature,
    };
  } catch (error) {
    return {
      success: false,
      error: `Token decode failed: ${error.message}`,
    };
  }
};

export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generateRefreshToken,
  verifyRefreshToken,
  decodeToken,
};
